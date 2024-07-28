import asyncio
import os
import json
import logging
import time
from azure.storage.queue import QueueClient
from azure.data.tables import TableServiceClient
from azure.identity import DefaultAzureCredential
from azure.core.exceptions import ResourceExistsError

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_env_variable(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise ValueError(f"{name} environment variable is not set")
    return value

def initialize_queue_client(queue_name: str) -> QueueClient:
    account_name = get_env_variable('STORAGE_ACCOUNT_NAME')
    storage_key = os.getenv('STORAGE_ACCOUNT_KEY')
    credential = storage_key if storage_key else DefaultAzureCredential()
    queue_client = QueueClient(account_url=f"https://{account_name}.queue.core.windows.net", queue_name=queue_name, credential=credential)
    
    try:
        queue_client.create_queue()
        logger.info(f"Queue '{queue_name}' created successfully.")
    except ResourceExistsError:
        logger.debug(f"Queue '{queue_name}' already exists.")
    
    return queue_client

def initialize_table_client(table_name: str) -> TableServiceClient:
    account_name = get_env_variable('STORAGE_ACCOUNT_NAME')
    storage_key = os.getenv('STORAGE_ACCOUNT_KEY')
    connection_string = f"DefaultEndpointsProtocol=https;AccountName={account_name};AccountKey={storage_key};EndpointSuffix=core.windows.net"
    table_service_client = TableServiceClient.from_connection_string(connection_string)
    
    try:
        table_service_client.create_table(table_name)
        logger.info(f"Table '{table_name}' created successfully.")
    except ResourceExistsError:
        logger.debug(f"Table '{table_name}' already exists.")
    
    return table_service_client.get_table_client(table_name)

def queue_indexing_job(container_name: str, user_id: str, index_name: str, is_restricted: bool) -> str:
    queue_client = initialize_queue_client("indexing")
    table_client = initialize_table_client("indexing")
    
    job_id = container_name
    message_content = json.dumps({
        "job_id": job_id,
        "container_name": container_name,
        "user_id": user_id,
        "index_name": index_name,
        "is_restricted": is_restricted
    })
    queue_client.send_message(message_content)
    
    table_client.upsert_entity({
        "PartitionKey": "indexing",
        "RowKey": job_id,
        "status": "queued"
    })
    
    logger.info(f"Queued indexing job for container: {container_name}, job_id: {job_id}")
    return job_id

async def process_indexing_queue(process_job_func):
    queue_client = initialize_queue_client("indexing")
    logger.info("Indexing queue processor started. Waiting for messages...")
    while True:
        messages = queue_client.receive_messages(max_messages=32, visibility_timeout=600)
        for message in messages:
            try:
                job_info = json.loads(message.content)
                logger.info(f"Processing indexing job for container: {job_info['container_name']}")
                await process_job_func(job_info)
                queue_client.delete_message(message)
                logger.info(f"Completed and deleted message for container: {job_info['container_name']}")
            except Exception as e:
                logger.error(f"Error processing indexing job: {str(e)}")
        await asyncio.sleep(10)