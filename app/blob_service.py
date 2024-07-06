import os
from typing import List, Tuple
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient, BlobClient
from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from .index_manager import IndexManager, create_index_manager
from io import BytesIO
import logging

def initialize_blob_service() -> BlobServiceClient:
    """Initialize and return a BlobServiceClient."""
    account_name = os.getenv('STORAGE_ACCOUNT_NAME')
    storage_key = os.getenv('STORAGE_ACCOUNT_KEY')
    credential = storage_key if storage_key else DefaultAzureCredential()
    return BlobServiceClient(account_url=f"https://{account_name}.blob.core.windows.net", credential=credential)

def create_container(blob_service_client: BlobServiceClient, container_name: str) -> None:
    """Create a container if it doesn't exist."""
    try:
        blob_service_client.create_container(container_name)
    except ResourceExistsError:
        logging.info(f"Container '{container_name}' already exists.")

def create_index_containers(user_id: str, index_name: str, is_restricted: bool, blob_service_client: BlobServiceClient = None) -> List[str]:
    """Create containers for the index and return their names."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    
    container_names = IndexManager.create_index_containers(user_id, index_name, is_restricted)
    
    for name in container_names:
        create_container(blob_service_client, name)
    
    return container_names

def upload_file_to_blob(container_name: str, blob_name: str, local_file_path: str, blob_service_client: BlobServiceClient = None) -> str:
    """Upload a local file to a blob and return its URL."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
    with open(local_file_path, "rb") as data:
        blob_client.upload_blob(data, overwrite=True)
    return blob_client.url

def download_blob_to_file(blob_url: str, local_file_path: str, blob_service_client: BlobServiceClient = None) -> None:
    """Download a blob to a local file."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    
    blob_client = BlobClient.from_blob_url(blob_url, credential=blob_service_client.credential)
    with open(local_file_path, "wb") as file:
        blob_data = blob_client.download_blob()
        file.write(blob_data.readall())

def list_files_in_container(container_name: str, blob_service_client: BlobServiceClient = None) -> List[dict]:
    """List all files in the specified container and return their total pages."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    blobs = list(container_client.list_blobs())
    
    file_info = {}
    for blob in blobs:
        base_filename = blob.name.split('___')[0]
        if blob.name.endswith('.pdf'):
            if base_filename not in file_info:
                file_info[base_filename] = {'total_pages': 0}
            file_info[base_filename]['total_pages'] += 1
    
    files = [{'filename': k, 'total_pages': v['total_pages']} for k, v in file_info.items()]
    return files

def delete_file_from_blob(container_name: str, filename: str, blob_service_client: BlobServiceClient = None) -> None:
    """Delete a file from the specified blob container."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    blob_client = container_client.get_blob_client(filename)
    try:
        blob_client.delete_blob()
    except ResourceNotFoundError:
        logging.warning(f"File {filename} not found in container {container_name}")

def list_indexes(user_id: str, blob_service_client: BlobServiceClient = None) -> List[Tuple[str, bool]]:
    """List all indexes for the given user."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    containers = blob_service_client.list_containers()
    indexes = set()
    for container in containers:
        name = container.name
        index_name, is_restricted = IndexManager.parse_container_name(name)
        if index_name:
            indexes.add((index_name, is_restricted))
    return list(indexes)

def delete_index(user_id: str, index_name: str, is_restricted: bool, blob_service_client: BlobServiceClient = None) -> None:
    """Delete the containers associated with the given index."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    index_manager = create_index_manager(user_id, index_name, is_restricted)
    container_names = [index_manager.get_ingestion_container(), index_manager.get_reference_container(), index_manager.get_lz_container()]
    for container_name in container_names:
        container_client = blob_service_client.get_container_client(container_name)
        try:
            container_client.delete_container()
        except ResourceNotFoundError:
            logging.warning(f"Container {container_name} not found")

def get_blob_url(container_name: str, blob_name: str, blob_service_client: BlobServiceClient = None) -> str:
    """Get the URL for a specific blob."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    blob_client = container_client.get_blob_client(blob_name)
    return blob_client.url

def upload_file_to_lz(file_data: BytesIO, filename: str, user_id: str, index_name: str, is_restricted: bool, blob_service_client: BlobServiceClient = None) -> str:
    """Upload a file to the landing zone container and return its blob URL."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    
    index_manager = create_index_manager(user_id, index_name, is_restricted)
    lz_container = index_manager.get_lz_container()
    
    container_client = blob_service_client.get_container_client(lz_container)
    try:
        container_client.create_container()
    except ResourceExistsError:
        pass 

    blob_client = container_client.get_blob_client(blob=filename)
    
    blob_client.upload_blob(file_data, overwrite=True)
    
    return blob_client.url

def download_blob_to_stream(blob_url: str, blob_service_client: BlobServiceClient = None) -> BytesIO:
    """Download a blob's content as a BytesIO stream."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    
    blob_client = BlobClient.from_blob_url(blob_url, credential=blob_service_client.credential)
    stream = BytesIO()
    blob_client.download_blob().readinto(stream)
    stream.seek(0)
    return stream

def upload_stream_to_blob(container_name: str, blob_name: str, data: BytesIO, blob_service_client: BlobServiceClient = None) -> str:
    """Upload a stream to a blob and return its URL."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
    blob_client.upload_blob(data, overwrite=True)
    return blob_client.url