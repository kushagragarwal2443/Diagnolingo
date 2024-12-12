import axios from "axios";
import logger from "@/src/configs/logger";

const api = axios.create({
  // Run the following command to get the IP address of the machine -> ifconfig | grep "inet " | grep -v 127.0.0.1
  // baseURL: "http://192.168.1.118:8000",
  // Run the following command to get the name of the machine -> hostname
  // baseURL: "http://Akshats-MacBook-Air.local:8000",
  baseURL: "http://192.168.1.156:8000",
});

interface ProcessAudioParams {
  audio: string;
  userId: string;
  sessionId: string;
  chunkId: number;
  isLastChunk: boolean;
}

export const processAudio = async (params: ProcessAudioParams) => {
  try {
    const response = await api.post("/process-audio/", params);
    return response.data;
  } catch (error) {
    logger.error("src/service/api.ts - processAudio() - Error processing audio:", error);
    throw error;
  }
};

/* 
Returns a list of transcripts.

Returned Fields:
conversation_uuid
conversation_title
transcript_text
timestamp
*/
export const getTranscripts = async (patientUuid: string, previewOnly: boolean = true) => {
  try {
    const response = await api.get("/getTranscripts/", {
      params: { patient_uuid: patientUuid, preview_only: previewOnly }
    });
    return response.data;
  } catch (error) {
    logger.error("src/service/api.ts - getTranscripts() - Error fetching transcripts:", error);
    throw error;
  }
};

export const getEHR = async (patientUuid: string, conversationUuid: string) => {
  try {
    const response = await api.get("/getEhr/", {
      params: { patient_uuid: patientUuid, conversation_uuid: conversationUuid }
    });
    return response.data;
  } catch (error) {
    logger.error("src/service/api.ts - getEHR() - Error fetching EHR:", error);
    throw error;
  }
};
