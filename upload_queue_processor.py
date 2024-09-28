import os
from dotenv import load_dotenv
from app.ingestion.upload_queue import process_queue_messages

load_dotenv()

def main():
    print("Starting upload queue processor...")
    process_queue_messages()

if __name__ == '__main__':
    main()