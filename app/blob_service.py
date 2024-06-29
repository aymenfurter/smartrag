import os
from typing import List, Tuple
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceExistsError
from .index_manager import IndexManager, create_index_manager

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
        print(f"Container '{container_name}' already exists.")

def create_index_containers(user_id: str, index_name: str, is_restricted: bool, blob_service_client: BlobServiceClient = None) -> List[str]:
    """Create containers for the index and return their names."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    
    container_names = IndexManager.create_index_containers(user_id, index_name, is_restricted)
    
    for name in container_names:
        create_container(blob_service_client, name)
    
    return container_names

def upload_files_to_blob(container_name: str, file_paths: List[str], blob_service_client: BlobServiceClient = None) -> None:
    """Upload files to the specified blob container."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    for file_path in file_paths:
        blob_path = os.path.basename(file_path)
        with open(file_path, "rb") as data:
            container_client.upload_blob(name=blob_path, data=data, overwrite=True)

def list_files_in_container(container_name: str, blob_service_client: BlobServiceClient = None) -> List[str]:
    """List all files in the specified container."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    return [blob.name for blob in container_client.list_blobs()]

def delete_file_from_blob(container_name: str, filename: str, blob_service_client: BlobServiceClient = None) -> None:
    """Delete a file from the specified blob container."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    blob_client = container_client.get_blob_client(filename)
    blob_client.delete_blob()

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
    container_names = [index_manager.get_ingestion_container(), index_manager.get_reference_container()]
    for container_name in container_names:
        container_client = blob_service_client.get_container_client(container_name)
        container_client.delete_container()

def get_blob_url(container_name: str, blob_name: str, blob_service_client: BlobServiceClient = None) -> str:
    """Get the URL for a specific blob."""
    if blob_service_client is None:
        blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    blob_client = container_client.get_blob_client(blob_name)
    return blob_client.url