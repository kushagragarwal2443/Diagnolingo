import asyncio
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.audio_firebase_dao import (
    store_conversation_in_firestore,
    upload_audio_to_firebase_storage,
)
from services.audio_utils import (
    combine_audio_files,
    get_or_create_session_directory,
    process_audio_to_ehr,
    save_audio_chunk,
    verify_all_chunks_present,
)

router = APIRouter()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add this at the module level, after the router definition
background_tasks = set()


class AudioChunkRequest(BaseModel):
    audio: str  # Base64 encoded audio
    userId: str
    sessionId: str
    chunkId: int
    isLastChunk: bool


@router.post("/process-audio/")
async def process_audio(request: AudioChunkRequest):
    try:
        # Create session directory if it doesn't exist
        session_dir = get_or_create_session_directory(request.sessionId)

        # Save the current chunk
        save_audio_chunk(request.audio, session_dir, request.chunkId)

        logger.info(f"Saved chunk {request.chunkId} for session {request.sessionId}")

        if request.isLastChunk:
            # Verify all chunks are present
            verify_all_chunks_present(session_dir, request.chunkId + 1)

            # Combine all chunks
            combined_audio_path = combine_audio_files(session_dir, request.chunkId)

            # sessionId is used as conversation_uuid
            # patient_uuid is the current user's uuid

            audio_url = upload_audio_to_firebase_storage(combined_audio_path, request.userId, request.sessionId)
            # ToDo - Delete the chunk files for the session - Maybe add to an async task

            conversation_title = "Session " + request.sessionId
            transcript_message = "The Transcript is being processed. Please wait..."
            store_conversation_in_firestore(
                request.userId,
                request.sessionId,
                conversation_title,
                audio_url,
                transcript_message,
            )

            logger.info(f"Completed processing session {request.sessionId}. Initiating Audio to EHR processing.")

            # Asynchronously process audio to transcript to EHR. Add the background task to our set
            task = asyncio.create_task(process_audio_to_ehr(request.userId, request.sessionId))

            # Add done callback to remove the task from the set when completed
            task.add_done_callback(background_tasks.discard)
            background_tasks.add(task)

            return {
                "status": "success",
                "message": "Audio stored successfully",
                "conversation_title": conversation_title,
            }

        return {
            "status": "success",
            "message": f"Chunk {request.chunkId} received successfully",
        }

    except Exception as e:
        logger.error(f"Error processing audio: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing audio: {str(e)}")
