import json
import logging
import os
import warnings

import openai
from dotenv import load_dotenv
from langchain.embeddings.base import Embeddings
from langchain.prompts import ChatPromptTemplate
from langchain_community.vectorstores import FAISS

from services.transcripts_firebase_dao import upload_ehr_details

assert load_dotenv(dotenv_path="secrets/.env")

warnings.filterwarnings("ignore")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

openai_api_key = os.environ["OPENAI_API_KEY_GPT"]
client = openai.OpenAI(api_key=openai_api_key)
llm_model = "gpt-4o-mini"
llm_temperature = 0
llm_seed = 42


class CustomOpenAIEmbeddings(Embeddings):
    def __init__(self, client):
        self.client = client

    def embed_documents(self, texts):
        embeddings = []
        counter = 0
        for text in texts:
            if counter % 500 == 0:
                print(counter)
            counter += 1
            response = self.client.embeddings.create(input=text, model="text-embedding-3-small")
            embedding = response.data[0].embedding
            embeddings.append(embedding)
        return embeddings

    def embed_query(self, text):
        response = self.client.embeddings.create(input=text, model="text-embedding-3-small")
        return response.data[0].embedding


embedding_model = CustomOpenAIEmbeddings(client)

cpt_vector_store = FAISS.load_local(
    "vectorstores/CPT_index",
    embedding_model,
    allow_dangerous_deserialization=True,
)
icd_vector_store = FAISS.load_local(
    "vectorstores/ICD_index",
    embedding_model,
    allow_dangerous_deserialization=True,
)
ndc_vector_store = FAISS.load_local(
    "vectorstores/NDC_index",
    embedding_model,
    allow_dangerous_deserialization=True,
)


def transcript_to_ehr(conversation):

    prompt_template = ChatPromptTemplate.from_template(
        """Write as a professional medical scribe, ensuring medical accuracy, clarity, and brevity. Go through the following doctor-patient conversation and create a SOAP note for it. A SOAP note consists of Subjective, Objective, Assessment and Plan sections. Just include these 4 sections and nothing else in the note. For each subfield in each of the four sections return a list of items in decreasing order of importance. If you do not have information for a particular field return an empty list. \
    1. ‘Subjective’ section includes items taken during the patient's verbal exam. Include 'Chief complaint', 'History of present illness', and 'Past social history' as subfields. \
    2. ’Objective’ section includes findings from the physical examinations and diagnostics taken prior to the visit, including laboratory or imaging results, broken down by exam type. It should have the following subfields: ’Vital signs’, ’Physical exam findings’, ’Laboratory data’, ’Imaging results’, and ’Other diagnostic data’. If a specific exam type is not mentioned, return an empty list for that subfield. \
    3. ’Assessment’ includes the doctor’s diagnosis as a list in the subfield ’Diagnosis’ in decreasing order of importance. \
    4. ’Plan’ section contains planned ’Tests’, ’Referrals’, ’Medications’ along with ’Instructions’ as separate subfields. ’Medications’ should contain a list of prescribed medications with a dictionary for each containing medication ’Name’, ’Dosage’, ’Route’, and ’Frequency’. If no medication is mentioned, the 'Medications' should return an empty list. \
    If you do not have data for a particular section or a sub-section, return an empty list for that particular subfield. Ensure that the medical terminology used in the conversation is accurately reflected. SOAP note should be concise, and avoid adding details not explicitly mentioned in the conversation. Format the output as JSON with the keys: ’Subjective’, ’Objective’, ’Assessment’ and ’Plan’. For each of these sections create dictionaries within for the different subfields. \
    \
    ### \
    Conversation: {conversation}"""
    )

    logs = ""

    formatted_prompt = prompt_template.format(conversation=conversation)
    response = client.chat.completions.create(
        model=llm_model,
        temperature=llm_temperature,
        seed=llm_seed,
        messages=[{"role": "user", "content": formatted_prompt}],
    )

    logs = (
        logs
        + "Tokens used for SOAP generation: "
        + str(response.usage.prompt_tokens)
        + ", "
        + str(response.usage.completion_tokens)
        + ", "
        + str(response.usage.total_tokens)
        + "\n\n"
    )

    total_prompt_tokens = int(response.usage.prompt_tokens)
    total_completion_tokens = int(response.usage.completion_tokens)
    total_tokens = int(response.usage.total_tokens)

    response_json = response.choices[0].message.content.strip("```json").strip("```")
    soap_note = json.loads(response_json)
    soap_note["Codes"] = {}
    soap_note["Codes"]["Tests"] = {}
    soap_note["Codes"]["Medications"] = {}
    soap_note["Codes"]["Diagnosis"] = {}

    ############################ RAG for Tests ################################

    logs = logs + " ############################ RAG for Tests ################################\n\n"

    for tests in soap_note["Plan"]["Tests"]:

        soap_note["Codes"]["Tests"][tests] = []
        tests_prompt = "Find the CPT codes corresponding to the following test: " + tests
        tests_retriever = cpt_vector_store.as_retriever()
        tests_retrieved_docs = tests_retriever.get_relevant_documents(tests_prompt)
        tests_joined_docs = ""
        for doc in tests_retrieved_docs:
            tests_joined_docs = tests_joined_docs + " ### " + doc.page_content
        tests_prompt_rag = ChatPromptTemplate.from_template(
            """{tests_prompt} Instruction: Only use the following returned documents to get the CPT codes. Ensure matching is case-insensitive. If there are multiple codes possible, return all of them. If no useful codes are found, just return 'N/A'. Output the codes as a comma-separated list in order of confidence without spaces. Here are the relevant documents: {tests_joined_docs}"""
        )
        tests_prompt_rag = tests_prompt_rag.format(tests_prompt=tests_prompt, tests_joined_docs=tests_joined_docs)

        logs = logs + tests_prompt_rag + "\n\n"

        tests_response = client.chat.completions.create(
            model=llm_model,
            temperature=llm_temperature,
            seed=llm_seed,
            messages=[{"role": "user", "content": tests_prompt_rag}],
        )

        total_prompt_tokens += int(tests_response.usage.prompt_tokens)
        total_completion_tokens += int(tests_response.usage.completion_tokens)
        total_tokens += int(tests_response.usage.total_tokens)
        logs = (
            logs
            + "Tokens used for Tests: "
            + str(tests_response.usage.prompt_tokens)
            + ", "
            + str(tests_response.usage.completion_tokens)
            + ", "
            + str(tests_response.usage.total_tokens)
            + "\n\n"
        )

        tests_codes = tests_response.choices[0].message.content

        if "N/A" in tests_codes.strip():
            continue
        else:
            tests_codes_list = tests_codes.strip().split(",")
            for code in tests_codes_list:
                code = code.strip()
                soap_note["Codes"]["Tests"][tests].append(str(code))

    ############################ RAG for Diagnosis ################################

    logs = logs + " ############################ RAG for Diagnosis ################################\n\n"

    for diagnosis in soap_note["Assessment"]["Diagnosis"]:

        soap_note["Codes"]["Diagnosis"][diagnosis] = []
        diagnosis_prompt = "Find the ICD-10 code corresponding to the following diagnosis: " + diagnosis
        diagnosis_retriever = icd_vector_store.as_retriever()
        diagnosis_retrieved_docs = diagnosis_retriever.get_relevant_documents(diagnosis_prompt)
        diagnosis_joined_docs = ""
        for doc in diagnosis_retrieved_docs:
            diagnosis_joined_docs = diagnosis_joined_docs + " ### " + doc.page_content
        diagnosis_prompt_rag = ChatPromptTemplate.from_template(
            """{diagnosis_prompt} Instruction: Only use the following returned documents to get the ICD codes. Ensure matching is case-insensitive. If there are multiple codes possible, return all of them. If no useful codes are found, just return 'N/A'. Output the codes as a comma-separated list in order of confidence without spaces. Here are the relevant documents: {diagnosis_joined_docs}"""
        )
        diagnosis_prompt_rag = diagnosis_prompt_rag.format(
            diagnosis_prompt=diagnosis_prompt,
            diagnosis_joined_docs=diagnosis_joined_docs,
        )

        logs = logs + diagnosis_prompt_rag + "\n\n"

        diagnosis_response = client.chat.completions.create(
            model=llm_model,
            temperature=llm_temperature,
            seed=llm_seed,
            messages=[{"role": "user", "content": diagnosis_prompt_rag}],
        )

        total_prompt_tokens += int(diagnosis_response.usage.prompt_tokens)
        total_completion_tokens += int(diagnosis_response.usage.completion_tokens)
        total_tokens += int(diagnosis_response.usage.total_tokens)
        logs = (
            logs
            + "Tokens used for Diagnosis: "
            + str(diagnosis_response.usage.prompt_tokens)
            + ", "
            + str(diagnosis_response.usage.completion_tokens)
            + ", "
            + str(diagnosis_response.usage.total_tokens)
            + "\n\n"
        )

        diagnosis_codes = diagnosis_response.choices[0].message.content
        diagnosis_codes_list = diagnosis_codes.strip().split(",")
        for code in diagnosis_codes_list:
            code = code.strip()
            soap_note["Codes"]["Diagnosis"][diagnosis].append(str(code))

    ############################ RAG for Medications ################################

    for drug_entry in soap_note["Plan"]["Medications"]:

        logs = logs + " ############################ RAG for Medications ################################\n\n"

        drugs = drug_entry["Name"] + ", " + drug_entry["Dosage"]
        soap_note["Codes"]["Medications"][drugs] = []
        drugs_prompt = "Find the NDC codes corresponding to the following drug: " + drugs
        drugs_retriever = ndc_vector_store.as_retriever()
        drugs_retrieved_docs = drugs_retriever.get_relevant_documents(drugs_prompt)
        drugs_joined_docs = ""
        for doc in drugs_retrieved_docs:
            drugs_joined_docs = drugs_joined_docs + " ### " + doc.page_content
        drugs_prompt_rag = ChatPromptTemplate.from_template(
            """{drugs_prompt} Instruction: Only use the following returned documents to get the NDC codes. Ensure matching is case-insensitive. If there are multiple codes possible, return all of them. If no useful codes are found, just return 'N/A'. Output the codes as a comma-separated list in order of confidence without spaces. Here are the relevant documents: {drugs_joined_docs}"""
        )
        drugs_prompt_rag = drugs_prompt_rag.format(drugs_prompt=drugs_prompt, drugs_joined_docs=drugs_joined_docs)

        logs = logs + drugs_prompt_rag + "\n\n"

        drugs_response = client.chat.completions.create(
            model=llm_model,
            temperature=llm_temperature,
            seed=llm_seed,
            messages=[{"role": "user", "content": drugs_prompt_rag}],
        )

        total_prompt_tokens += int(drugs_response.usage.prompt_tokens)
        total_completion_tokens += int(drugs_response.usage.completion_tokens)
        total_tokens += int(drugs_response.usage.total_tokens)
        logs = (
            logs
            + "Tokens used for Drugs: "
            + str(drugs_response.usage.prompt_tokens)
            + ", "
            + str(drugs_response.usage.completion_tokens)
            + ", "
            + str(drugs_response.usage.total_tokens)
            + "\n\n"
        )

        drugs_codes = drugs_response.choices[0].message.content
        drugs_codes_list = drugs_codes.strip().split(",")
        for code in drugs_codes_list:
            code = code.strip()
            soap_note["Codes"]["Medications"][drugs].append(str(code))

        logs = logs + " ############################ Finished ################################\n\n"
        logs = (
            logs
            + "Total Tokens used: "
            + str(total_prompt_tokens)
            + ", "
            + str(total_completion_tokens)
            + ", "
            + str(total_tokens)
        )

    return soap_note, logs


def process_transcript_to_ehr(transcript, patient_uuid, conversation_uuid):
    soap_note, logs = transcript_to_ehr(transcript)
    upload_ehr_details(patient_uuid, conversation_uuid, soap_note, logs)
    return soap_note
