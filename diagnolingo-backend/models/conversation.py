"""
Schema for conversation data:

- conversation_uuid: str    - The UUID of the conversation.
-- conversation_title: str  - The title given to the conversation.
-- audio_url: str           - The URL to the stored audio file.
-- transcript_text: str     - The transcribed text of the audio.
-- extra_note: str          - Any additional notes about the conversation.
-- timestamp: datetime      - The timestamp when the conversation was recorded.
-- ehr_details: dict        - Contains ehr sections and subsections for the transcript.
-- dummy_true_soap: str     - True SOAP notes for the conversation as per Github Data Source.
"""


def create_initial_conversation_data_object(conversation_title, audio_url, transcript_text, extra_note, timestamp):
    """
    Creates a dictionary containing conversation data initialization.
    """
    return {
        "conversation_title": conversation_title,
        "audio_url": audio_url,
        "transcript_text": transcript_text,
        "extra_note": extra_note,
        "timestamp": timestamp,
    }


def create_conversation_list_object(conversation_title, transcript_text, timestamp):
    """
    Contains only the items that need to be previewed in a list.
    """
    return {
        "conversation_title": conversation_title,
        "transcript_text": transcript_text,
        "timestamp": timestamp,
    }


def create_conversation_details_object(
    conversation_title, audio_url, transcript_text, extra_note, timestamp, ehr_details
):
    """
    Creates a dictionary containing all conversation details.
    """
    return {
        "conversation_title": conversation_title,
        "audio_url": audio_url,
        "transcript_text": transcript_text,
        "extra_note": extra_note,
        "timestamp": timestamp,
        "ehr_details": ehr_details,
    }
