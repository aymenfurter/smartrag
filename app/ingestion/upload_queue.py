import os
import json
import time
import logging
import tempfile
from typing import Dict, Any
from azure.storage.queue import QueueClient
from azure.identity import DefaultAzureCredential
import PyPDF2
from contextlib import suppress
from azure.core.exceptions import ResourceExistsError

from .doc_intelligence import convert_pdf_page_to_md
from .pdf_processing import convert_pdf_page_to_png, get_pdf_page_count
from ..integration.blob_service import initialize_blob_service, download_blob_to_file, upload_file_to_blob
from ..integration.index_manager import create_index_manager

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logging.getLogger('azure.core.pipeline.policies.http_logging_policy').setLevel(logging.WARNING)

class UploadQueueSettings:
    STORAGE_ACCOUNT_NAME = os.getenv('STORAGE_ACCOUNT_NAME')
    STORAGE_ACCOUNT_KEY = os.getenv('STORAGE_ACCOUNT_KEY')
    QUEUE_NAME = "ingestion"
    MAX_MESSAGES = 32
    VISIBILITY_TIMEOUT = 300
    MAX_DEQUEUE_COUNT = 2
    SLEEP_TIME = 5

def get_env_variable(name: str) -> str:
    value = getattr(UploadQueueSettings, name, None)
    if not value:
        raise ValueError(f"{name} environment variable is not set")
    return value

class QueueManager:
    def __init__(self):
        self.queue_client = self._initialize_queue_client()

    def _initialize_queue_client(self) -> QueueClient:
        account_name = get_env_variable('STORAGE_ACCOUNT_NAME')
        storage_key = UploadQueueSettings.STORAGE_ACCOUNT_KEY
        credential = storage_key if storage_key else DefaultAzureCredential()
        return QueueClient(
            account_url=f"https://{account_name}.queue.core.windows.net",
            queue_name=UploadQueueSettings.QUEUE_NAME,
            credential=credential
        )

    def process_queue_messages(self):
        logging.info("Queue processor started. Waiting for messages...")
        while True:
            messages = self.queue_client.receive_messages(
                max_messages=UploadQueueSettings.MAX_MESSAGES,
                visibility_timeout=UploadQueueSettings.VISIBILITY_TIMEOUT
            )
            for message in messages:
                self._process_message(message)
            time.sleep(UploadQueueSettings.SLEEP_TIME)

    def _process_message(self, message):
        try:
            if message.dequeue_count > UploadQueueSettings.MAX_DEQUEUE_COUNT:
                logging.error(f"Message exceeded retry limit. Deleting message. Content: {message.content}")
                self.queue_client.delete_message(message)
                return

            file_info = json.loads(message.content)
            logging.info(f"Processing file: {file_info['filename']} (Attempt {message.dequeue_count})")
            BlobManager.process_pdf_pages(file_info)
            self.queue_client.delete_message(message)
            logging.info(f"Processed and deleted message for file: {file_info['filename']}")
        except KeyError as e:
            logging.error(f"Missing key in message content: {str(e)}")
        except Exception as e:
            logging.error(f"Error processing message: {str(e)}")

    def queue_file_for_processing(self, **kwargs):
        with suppress(ResourceExistsError):
            self.queue_client.create_queue()

        index_manager = create_index_manager(kwargs['user_id'], kwargs['index_name'], kwargs['is_restricted'])
        message_content = json.dumps({
            **kwargs,
            "ingestion_container": index_manager.get_ingestion_container(),
            "reference_container": index_manager.get_reference_container(),
            "lz_container": index_manager.get_lz_container()
        })
        self.queue_client.send_message(message_content)

class BlobManager:
    @staticmethod
    def process_pdf_pages(file_info: Dict[str, Any]):
        blob_service = initialize_blob_service()
        filename = file_info['filename']
        num_pages = file_info['num_pages']
        is_multimodal = file_info.get('is_multimodal', False)
        blob_url = file_info['blob_url']
        reference_container = file_info['reference_container']
        ingestion_container = file_info['ingestion_container']
        lz_container = file_info['lz_container']

        with tempfile.TemporaryDirectory() as temp_dir:
            pdf_path = os.path.join(temp_dir, filename)
            download_blob_to_file(blob_url, pdf_path, blob_service)

            for page_number in range(num_pages):
                BlobManager._process_pdf_page(
                    pdf_path, page_number, temp_dir, filename,
                    blob_service, reference_container, ingestion_container, is_multimodal
                )

            blob_service.get_blob_client(container=lz_container, blob=filename).delete_blob()
        logging.info(f"Completed processing all pages for file: {filename}")

    @staticmethod
    def _process_pdf_page(pdf_path, page_number, temp_dir, filename, blob_service, reference_container, ingestion_container, is_multimodal):
        output_pdf = os.path.join(temp_dir, f"{filename}___Page{page_number + 1}.pdf")
        with open(pdf_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            pdf_writer = PyPDF2.PdfWriter()
            pdf_writer.add_page(pdf_reader.pages[page_number])
            with open(output_pdf, 'wb') as output_file:
                pdf_writer.write(output_file)

        png_path = convert_pdf_page_to_png(output_pdf, page_number, temp_dir, filename)
        md_path = convert_pdf_page_to_md(output_pdf, page_number, temp_dir, filename, is_multimodal)
        BlobManager._upload_pdf_page_files(blob_service, reference_container, ingestion_container, output_pdf, png_path, md_path, filename, page_number)

    @staticmethod
    def _upload_pdf_page_files(blob_service, reference_container, ingestion_container, output_pdf, png_path, md_path, filename, page_number):
        page_suffix = f"{filename}___Page{page_number + 1}"
        upload_file_to_blob(reference_container, f"{page_suffix}.pdf", output_pdf, blob_service)
        upload_file_to_blob(reference_container, f"{page_suffix}.png", png_path, blob_service)
        upload_file_to_blob(ingestion_container, f"{page_suffix}.md", md_path, blob_service)

def process_queue_messages():
    queue_manager = QueueManager()
    queue_manager.process_queue_messages()

def queue_file_for_processing(filename: str, user_id: str, index_name: str, is_restricted: bool, num_pages: int, blob_url: str, is_multimodal: bool):
    queue_manager = QueueManager()
    queue_manager.queue_file_for_processing(
        filename=filename,
        user_id=user_id,
        index_name=index_name,
        is_restricted=is_restricted,
        num_pages=num_pages,
        blob_url=blob_url,
        is_multimodal=is_multimodal
    )