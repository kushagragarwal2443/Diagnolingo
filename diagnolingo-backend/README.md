# diagnolingo-backend

- Ensure that "vectorstores" and "secrets" directories exist
- conda activate github_diagnolingo (or env whatever you have named it)
- `uvicorn main:app --host 0.0.0.0 --port 8000 --reload`
 
If this gives package not found error do

- `python3 -m pip install uvicorn`
- `python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload`

# Installed:

- fastapi
- uvicorn
- firebase-admin
- python-multipart
- openai
- openai-whisper
- pydub
- langchain
- tiktoken
- python-dotenv
- langchain-community
- requests
- ffmpeg-python
- ffmpeg
- faiss-cpu

`conda install fastapi uvicorn python-multipart python-dotenv requests`

`pip3 install faiss-cpu firebase-admin openai openai-whisper pydub langchain langchain-community tiktoken ffmpeg-python`

`brew install ffmpeg`


# Shortcuts

- Shift + Option + O -> Import Sorting using iSort

# Info

- Hosting:
  - How to host on GC: https://www.youtube.com/watch?v=5OL7fu2R4M8
- gpt-4o-audio-preview Usage:
  - How to give audio as input:
    https://platform.openai.com/docs/guides/audio/quickstart?lang=python&audio-generation-quickstart-example=audio-in
  - Check the Sample for "Meeting Notes with Multiple Speakers" here:
    https://openai.com/index/hello-gpt-4o/#explorations-of-capabilities
- Diarization:
  - Code - Currently Using: https://github.com/MahmoudAshraf97/whisper-diarization/tree/main
  - Code - Insanely Fast Whisper: https://github.com/Vaibhavs10/insanely-fast-whisper
  - Refer: https://huggingface.co/spaces/Xenova/whisper-speaker-diarization
  - Blog: https://medium.com/@xriteshsharmax/speaker-diarization-using-whisper-asr-and-pyannote-f0141c85d59a
