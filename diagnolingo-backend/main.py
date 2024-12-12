import logging

import firebase_admin
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from firebase_admin import credentials

# Check if Firebase app is already initialized to avoid re-initialization
if not firebase_admin._apps:
    cred = credentials.Certificate("secrets/diagnolingo-firebase-adminsdk-31t5c-4b5048a2e2.json")
    firebase_admin.initialize_app(cred, {"storageBucket": "diagnolingo.appspot.com"})

# Import routers after Firebase initialization
from routes.audio_controller import router as audio_router
from routes.transcripts_controller import router as transcript_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio_router)
app.include_router(transcript_router)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error for request {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )
