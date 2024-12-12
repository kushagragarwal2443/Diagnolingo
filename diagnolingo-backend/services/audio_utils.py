import base64
import logging
import os

import ffmpeg
from fastapi import HTTPException
from pydub import AudioSegment

from models.constants import AUDIO_BASE_DIR, COMBINED_AUDIO_FILENAME
from services.audio_to_transcript import process_audio_to_transcript
from services.transcripts_to_ehr import process_transcript_to_ehr

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_or_create_session_directory(session_id):
    session_dir = os.path.join(AUDIO_BASE_DIR, session_id)
    os.makedirs(session_dir, exist_ok=True)
    return session_dir


def save_audio_chunk(chunk_data, session_dir, chunk_id):
    """Save a single audio chunk to the filesystem."""
    chunk_path = os.path.join(session_dir, f"chunk_{chunk_id}.m4a")
    audio_data = base64.b64decode(chunk_data)
    with open(chunk_path, "wb") as f:
        f.write(audio_data)
    logger.info(f"Saved audio chunk to {chunk_path}")


def verify_all_chunks_present(session_dir, total_chunks):
    """Ensure all expected audio chunks are present."""
    expected_chunks = list(range(total_chunks))
    missing_chunks = [
        chunk_num
        for chunk_num in expected_chunks
        if not os.path.exists(os.path.join(session_dir, f"chunk_{chunk_num}.m4a"))
    ]
    if missing_chunks:
        logger.error(f"Missing chunks: {missing_chunks}")
        raise HTTPException(status_code=400, detail=f"Missing chunks: {missing_chunks}")
    logger.info(f"All {total_chunks} chunks are present.")


def combine_audio_files(session_dir, last_chunk_id):
    """
    Combines multiple M4A files into a single WAV file using ffmpeg.
    More efficient than pydub as it uses direct ffmpeg stream processing.
    """
    logger.info(f"Combining {last_chunk_id + 1} audio files into {COMBINED_AUDIO_FILENAME}")
    combined_audio_path = os.path.join(session_dir, COMBINED_AUDIO_FILENAME)

    # Create a concat demuxer file
    concat_file_path = os.path.join(session_dir, "concat_list.txt")
    with open(concat_file_path, "w") as f:
        for chunk_num in range(last_chunk_id + 1):
            # Use just the filename instead of full path
            chunk_name = f"chunk_{chunk_num}.m4a"
            f.write(f"file '{chunk_name}'\n")

    try:
        # Use ffmpeg to concatenate and convert in one step
        (
            ffmpeg.input(concat_file_path, format="concat", safe=0)
            .output(combined_audio_path, acodec="pcm_s16le", ar=16000)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        logger.info(f"Audio combined and exported to {combined_audio_path}")
    except ffmpeg.Error as e:
        logger.error(f"FFmpeg error: {e.stderr.decode()}")
        raise
    finally:
        # Clean up the concat file
        os.remove(concat_file_path)
    return combined_audio_path


async def process_audio_to_ehr(patient_uuid, conversation_uuid):
    transcript = process_audio_to_transcript(patient_uuid, conversation_uuid)
    logger.info(f"Transcript: {transcript}")
    ehr_details = process_transcript_to_ehr(transcript, patient_uuid, conversation_uuid)
    logger.info(f"EHR Details: {ehr_details}")
