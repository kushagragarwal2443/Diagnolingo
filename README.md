# Diagnolingo  

Kushagra Agarwal and Prof. Eric Nyberg  
Carnegie Mellon University  

**Contact:** kushagragarwal2443@gmail.com 

---

## Overview  

**Diagnolingo** is an AI-powered Electronic Health Record (EHR) system tailored for outpatient clinics in India. It aims to revolutionize small practice operations by seamlessly:  
- Capturing doctor-patient conversations in vernacular regional languages.  
- Automatically populating EHR entries with SOAP notes.  
- Enhancing diagnostic accuracy using advanced analytics and predictive insights.  

By merging **speech translation** with **automated EHR data entry**, Diagnolingo reduces errors caused by misdiagnoses or missed diagnoses.  

---

## Features  
1. **Speech-to-EHR Pipeline**  
   - Converts audio doctor-patient conversations into structured EHR entries.  
   - Supports transcription and translation using OpenAI’s Whisper model.  

2. **SOAP Note Generation**  
   - Concise, structured SOAP notes generated from transcripts using prompt engineering.  
   - Tailored for the Indian healthcare context.  

3. **Automatic Medical Coding**  
   - Retrieval-Augmented Generation (RAG) approach for accurate medical codes:  
     - **ICD codes** for diagnoses.  
     - **NDC codes** for medications.  
     - **CPT codes** for procedures.  

4. **Application Interface**  
   - Backend: Built using **FastAPI**.  
   - Frontend: Developed as a mobile app using **React Expo**.  

---

## Repository Structure  

The Diagnolingo project is organized into three primary repositories:  

### 1. [`diagnolingo-backend`](./diagnolingo-backend)  
This folder contains the backend implementation using FastAPI.  
- **Purpose:** Handles SOAP note generation, RAG-based coding, and database management.  
- **Instructions:** Follow the `README.md` within the `diagnolingo-backend` folder for setup and usage.  

### 2. [`diagnolingo-frontend`](./diagnolingo-frontend)  
This folder contains the frontend of the Diagnolingo application, built with React Expo.  
- **Purpose:** Provides a mobile-friendly interface for doctors and patients to interact with the system.  
- **Instructions:** Run the frontend using the Expo framework after setting up the backend.  

### 3. [`dev-notebooks`](./dev-notebooks)  
Contains Jupyter notebooks used during the development process.  
- **Purpose:** Prototyping and testing the transcript-to-EHR pipeline.  
- **Note:** This folder is not intended for production use.  

---

## Installation and Usage 

Data files and vector databases were not included in the repository due to size constraints. To request access, please email kushagragarwal2443@gmail.com.

### Step 1: Backend Setup  
1. Navigate to the `diagnolingo-backend` directory:  
   ```bash
   cd diagnolingo-backend
   ```

2. Follow the instructions in the diagnolingo-backend folder's README.md to set up and run the backend.

### Step 2: Frontend Setup
1. Navigate to the `diagnolingo-frontend` directory:
    ```bash
    cd diagnolingo-frontend
    ```

2. Install dependencies and run the React Expo app using the instructions given in the folder's README.md.

## Data Sources

Diagnolingo utilizes the following datasets:

ACI Bench: Doctor-patient conversation transcripts and EHR notes.
MTS Dialog: Dataset for validating SOAP note accuracy.
Mock Hindi Data: Translations of English transcripts from ACI Bench for testing transcription and EHR generation in regional Indian languages.

## Innovations
1. **SOAP Note Generation:**
Prompt engineering techniques were used to generate concise and structured SOAP notes as JSON objects.
The generated notes are directly integrated into the EHR database for seamless data entry.
2. **RAG-Based Medical Coding:**
Created vector databases for ICD, NDC, and CPT codes for efficient retrieval.
Top 3-4 relevant codes are automatically appended to EHR notes to enrich clinical value.

## Deliverables

Refer to the ```Report``` for detailed insights into the project’s methodology, design, and evaluation metrics and to the ```Poster``` for a quick overview. 

## Future Work
Diagnolingo is a prototype with significant potential for real-world application. Next steps include:

- Refining the application pipeline for real-world clinical settings.
- Expanding dataset size and diversity.
- Enhancing transcription and coding accuracy through iterative testing.

## Acknowledgments
Diagnolingo was developed as part of the MS Capstone Project at Carnegie Mellon University. Special thanks Prof. Eric Nyberg at the Language Technologies Institute and Akshat Agarwal for their continous guidance and support.

## License
This project is licensed under the MIT License. 