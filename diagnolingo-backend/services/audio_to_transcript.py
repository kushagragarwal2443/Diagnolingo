import logging
import os

import whisper
from dotenv import load_dotenv
from fastapi import HTTPException
from openai import OpenAI

from conf.configs import USE_ONPREM_WHISPER
from models.constants import AUDIO_BASE_DIR, COMBINED_AUDIO_FILENAME
from services.audio_firebase_dao import (
    download_audio_from_firebase_storage_as_base64_wav,
)
from services.transcripts_firebase_dao import upload_transcript

assert load_dotenv(dotenv_path="secrets/.env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

openai_api_key_audio = os.environ["OPENAI_API_KEY_AUDIO"]
client = OpenAI(api_key=openai_api_key_audio)


# Call OpenAI API to get transcript with diarization
def audio_to_transcript(base64_wav_audio):
    response = client.chat.completions.create(
        model="gpt-4o-audio-preview",
        modalities=["text"],
        temperature=0,
        max_tokens=2048,
        top_p=1,
        frequency_penalty=0,
        presence_penalty=0,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "I am providing a conversation at a Doctor's clinic. Transcribe this audio (with diarization if possible):\n",
                        # "text": "I am providing a conversation at a Doctor's clinic. Transcribe this audio:\n",
                    },
                    {
                        "type": "input_audio",
                        "input_audio": {"data": base64_wav_audio, "format": "wav"},
                    },
                ],
            }
        ],
    )
    return response.choices[0].message.content


def audio_to_transcript_on_prem(combined_audio_path):
    """Transcribe combined audio using Whisper."""
    try:
        model = whisper.load_model("base", device="cpu")  # Adjust device as needed
        result = model.transcribe(
            combined_audio_path,
            fp16=False,  # Disable half-precision to avoid potential issues
            language="en",  # Specify language if known
        )
        logger.info("Transcription successful.")
        return result["text"]
    except Exception as e:
        logger.error(f"Whisper transcription failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


def process_audio_to_transcript(patient_uuid, conversation_uuid):
    transcript = ""
    if USE_ONPREM_WHISPER:
        # On Prem way to do it
        session_dir = os.path.join(AUDIO_BASE_DIR, conversation_uuid)
        combined_audio_path = os.path.join(session_dir, COMBINED_AUDIO_FILENAME)
        transcript = audio_to_transcript_on_prem(combined_audio_path)
    else:
        # OpenAI way to do it - DIARIZED
        base64_wav_audio = download_audio_from_firebase_storage_as_base64_wav(patient_uuid, conversation_uuid)
        transcript = audio_to_transcript(base64_wav_audio)
    logger.info(f"Diarized transcript: {transcript}")
    upload_transcript(patient_uuid, conversation_uuid, transcript)
    return transcript
