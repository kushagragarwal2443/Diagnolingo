import os
import shutil


# Write a function to delete all "directories" recursively in the audio_uploads directory
def delete_audio_files():
    # Check if directory exists before attempting deletion
    if os.path.exists("audio_uploads"):
        # Use shutil.rmtree to recursively delete directory and all contents
        shutil.rmtree("audio_uploads")
        # Recreate empty audio_uploads directory
        os.makedirs("audio_uploads")


delete_audio_files()
