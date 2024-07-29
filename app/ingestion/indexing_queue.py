import asyncio
import os
import json
import logging
from typing import Dict, Any
from azure.storage.queue import QueueClient
from azure.data.tables import TableServiceClient
from azure.identity import DefaultAzureCredential
from azure.core.exceptions import ResourceExistsError

from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class IndexingQueueSettings:
    STORAGE_ACCOUNT_NAME = os.getenv('STORAGE_ACCOUNT_NAME')
    STORAGE_ACCOUNT_KEY = os.getenv('STORAGE_ACCOUNT_KEY')
    INDEXING_QUEUE_NAME = "indexing"
    INDEXING_TABLE_NAME = "indexing"
    MAX_MESSAGES = 32
    VISIBILITY_TIMEOUT = 600
    SLEEP_TIME = 10

def get_env_variable(name: str) -> str:
    value = getattr(IndexingQueueSettings, name, None)
    if not value:
        raise ValueError(f"{name} environment variable is not set")
    return value

class AzureClientManager:
    @staticmethod
    def initialize_queue_client(queue_name: str) -> QueueClient:
        account_name = get_env_variable('STORAGE_ACCOUNT_NAME')
        storage_key = IndexingQueueSettings.STORAGE_ACCOUNT_KEY
        credential = storage_key if storage_key else DefaultAzureCredential()
        queue_client = QueueClient(
            account_url=f"https://{account_name}.queue.core.windows.net",
            queue_name=queue_name,
            credential=credential
        )
        
        AzureClientManager._create_if_not_exists(queue_client.create_queue, f"Queue '{queue_name}'")
        return queue_client

    @staticmethod
    def initialize_table_client(table_name: str) -> TableServiceClient:
        account_name = get_env_variable('STORAGE_ACCOUNT_NAME')
        storage_key = IndexingQueueSettings.STORAGE_ACCOUNT_KEY
        connection_string = f"DefaultEndpointsProtocol=https;AccountName={account_name};AccountKey={storage_key};EndpointSuffix=core.windows.net"
        table_service_client = TableServiceClient.from_connection_string(connection_string)
        
        AzureClientManager._create_if_not_exists(lambda: table_service_client.create_table(table_name), f"Table '{table_name}'")
        return table_service_client.get_table_client(table_name)

    @staticmethod
    def _create_if_not_exists(create_func, resource_name: str):
        try:
            create_func()
            logger.info(f"{resource_name} created successfully.")
        except ResourceExistsError:
            logger.debug(f"{resource_name} already exists.")

class IndexingJobManager:
    def __init__(self):
        self.queue_client = AzureClientManager.initialize_queue_client(IndexingQueueSettings.INDEXING_QUEUE_NAME)
        self.table_client = AzureClientManager.initialize_table_client(IndexingQueueSettings.INDEXING_TABLE_NAME)

    def queue_indexing_job(self, container_name: str, user_id: str, index_name: str, is_restricted: bool) -> str:
        job_id = container_name
        message_content = json.dumps({
            "job_id": job_id,
            "container_name": container_name,
            "user_id": user_id,
            "index_name": index_name,
            "is_restricted": is_restricted
        })
        self.queue_client.send_message(message_content)
        
        self.table_client.upsert_entity({
            "PartitionKey": "indexing",
            "RowKey": job_id,
            "status": "queued"
        })
        
        logger.info(f"Queued indexing job for container: {container_name}, job_id: {job_id}")
        return job_id

    async def process_indexing_queue(self, process_job_func):
        logger.info("Indexing queue processor started. Waiting for messages...")
        while True:
            messages = self.queue_client.receive_messages(
                max_messages=IndexingQueueSettings.MAX_MESSAGES,
                visibility_timeout=IndexingQueueSettings.VISIBILITY_TIMEOUT
            )
            for message in messages:
                await self._process_message(message, process_job_func)
            await asyncio.sleep(IndexingQueueSettings.SLEEP_TIME)

    async def _process_message(self, message, process_job_func):
        try:
            job_info = json.loads(message.content)
            logger.info(f"Processing indexing job for container: {job_info['container_name']}")
            await process_job_func(job_info)
            self.queue_client.delete_message(message)
            logger.info(f"Completed and deleted message for container: {job_info['container_name']}")
        except Exception as e:
            logger.error(f"Error processing indexing job: {str(e)}")

def queue_indexing_job(container_name: str, user_id: str, index_name: str, is_restricted: bool) -> str:
    job_manager = IndexingJobManager()
    return job_manager.queue_indexing_job(container_name, user_id, index_name, is_restricted)

async def process_indexing_queue(process_job_func):
    job_manager = IndexingJobManager()
    await job_manager.process_indexing_queue(process_job_func)