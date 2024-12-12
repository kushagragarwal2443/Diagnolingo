import logging
from typing import List

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from services.transcripts_firebase_dao import get_ehr_details, get_transcripts_list

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/getTranscripts/", response_model=List[dict])
async def get_transcripts(
    patient_uuid: str = Query(..., description="The UUID of the patient"),
    preview_only: bool = Query(True, description="Whether to return only a preview of the transcripts"),
):
    logger.info(f"Fetching transcripts for patient UUID: {patient_uuid} with preview_only={preview_only}")
    try:
        return get_transcripts_list(patient_uuid, preview_only)
    except Exception as e:
        logger.error(f"Failed to fetch transcripts for patient UUID: {patient_uuid}, Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/getEhr/", response_model=dict)
async def get_ehr(
    patient_uuid: str = Query(..., description="The UUID of the patient"),
    conversation_uuid: str = Query(..., description="The UUID of the conversation"),
):
    logger.info(f"Fetching EHR entry for patient UUID: {patient_uuid} and conversation UUID: {conversation_uuid}")
    try:
        return get_ehr_details(patient_uuid, conversation_uuid)
    except Exception as e:
        logger.error(
            f"Failed to fetch EHR for patient UUID: {patient_uuid} and conversation UUID: {conversation_uuid}, Error: {str(e)}"
        )
        raise HTTPException(status_code=500, detail=str(e))
