import logging

from firebase_admin import firestore

from models.conversation import (
    create_conversation_details_object,
    create_conversation_list_object,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_transcripts_list(patient_uuid, preview_only):
    try:
        db = firestore.client()
        # Fetch transcripts and order them by 'timestamp' field in descending order
        transcripts_ref = (
            db.collection("patients")
            .document(patient_uuid)
            .collection("conversations")
            .order_by("timestamp", direction=firestore.Query.DESCENDING)
        )
        transcripts = transcripts_ref.stream()
        result = []
        for transcript in transcripts:
            data = transcript.to_dict()
            if preview_only:
                data["transcript_text"] = data["transcript_text"][:500]  # Return first 500 characters
            conversation_data = create_conversation_list_object(
                data.get("conversation_title"),
                data.get("transcript_text"),
                data.get("timestamp"),
            )
            result.append({"conversation_uuid": transcript.id, **conversation_data})
        return result
    except Exception as e:
        logger.error(f"Error fetching transcripts list: {str(e)}")
        raise e


def upload_transcript(patient_uuid, conversation_uuid, transcript):
    try:
        db = firestore.client()
        conversation_ref = (
            db.collection("patients").document(patient_uuid).collection("conversations").document(conversation_uuid)
        )
        conversation_ref.update({"transcript_text": transcript})
    except Exception as e:
        logger.error(f"Error uploading transcript: {str(e)}")
        raise e


def upload_ehr_details(patient_uuid, conversation_uuid, ehr_details, extra_note):
    try:
        db = firestore.client()
        conversation_ref = (
            db.collection("patients").document(patient_uuid).collection("conversations").document(conversation_uuid)
        )
        # Update the document with new EHR details and extra note
        conversation_ref.update({"ehr_details": ehr_details, "extra_note": extra_note})
    except Exception as e:
        logger.error(f"Error uploading EHR details: {str(e)}")
        raise e


def get_ehr_details(patient_uuid, conversation_uuid):
    try:
        db = firestore.client()
        ehr_ref = (
            db.collection("patients").document(patient_uuid).collection("conversations").document(conversation_uuid)
        )
        ehr_entry = ehr_ref.get()
        data = ehr_entry.to_dict()
        conversation_details = create_conversation_details_object(
            data.get("conversation_title"),
            data.get("audio_url"),
            data.get("transcript_text"),
            data.get("extra_note"),
            data.get("timestamp"),
            data.get("ehr_details"),
        )
        return conversation_details
    except Exception as e:
        logger.error(f"Error fetching EHR details: {str(e)}")
        raise e
