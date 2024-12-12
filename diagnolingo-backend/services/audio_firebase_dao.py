import base64
import io
import logging

import requests
from firebase_admin import firestore, storage

from models.conversation import create_initial_conversation_data_object

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def upload_audio_to_firebase_storage(file_path, patient_uuid, conversation_uuid):
    logger.info(f"Uploading audio file {file_path} to Firebase Storage under {patient_uuid}/{conversation_uuid}")
    bucket = storage.bucket()  # Assumes default bucket is set up
    blob = bucket.blob(f"audio/{patient_uuid}/{conversation_uuid}/combined_audio.wav")
    blob.upload_from_filename(file_path)
    logger.info(f"Audio file uploaded successfully to {blob.public_url}")
    return blob.public_url


def download_audio_from_firebase_storage_as_base64_wav(patient_uuid, conversation_uuid):
    logger.info(f"Fetching audio file for {patient_uuid}/{conversation_uuid}")
    try:
        bucket = storage.bucket()
        blob = bucket.blob(f"audio/{patient_uuid}/{conversation_uuid}/combined_audio.wav")
        audio_data = io.BytesIO()
        blob.download_to_file(audio_data)
        audio_data.seek(0)  # Reset the file pointer to the beginning
        audio_bytes = audio_data.read()
        base64_wav_audio = base64.b64encode(audio_bytes).decode("utf-8")
        logger.info("Successfully converted audio to base64")
        return base64_wav_audio
    except requests.RequestException as e:
        logger.error(f"Failed to fetch audio file: {str(e)}")
        raise


def store_conversation_in_firestore(
    patient_uuid,
    conversation_uuid,
    conversation_title,
    audio_url,
    transcript_text,
    extra_note="Add Extra Note Here",
    timestamp=firestore.SERVER_TIMESTAMP,
):
    logger.info(f"Storing conversation data in Firestore for {patient_uuid}/{conversation_uuid}")
    db = firestore.client()
    patient_ref = db.collection("patients").document(patient_uuid)
    conversation_ref = patient_ref.collection("conversations").document(conversation_uuid)
    conversation_data = create_initial_conversation_data_object(
        conversation_title, audio_url, transcript_text, extra_note, timestamp
    )
    conversation_ref.set(conversation_data)
    logger.info(f"Conversation data stored successfully for {patient_uuid}/{conversation_uuid}")
