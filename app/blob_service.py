import os
import re
from azure.identity import DefaultAzureCredential
from azure.storage.blob import BlobServiceClient

def initialize_blob_service():
    account_name = os.getenv('STORAGE_ACCOUNT_NAME')
    credential = DefaultAzureCredential()
    blob_service_client = BlobServiceClient(account_url=f"https://{account_name}.blob.core.windows.net", credential=credential)
    return blob_service_client

def sanitize_container_name(name):
    sanitized = re.sub(r'[^a-z0-9-]', '-', name.lower())
    return sanitized[:63]

def create_container(blob_service_client, container_name):
    try:
        blob_service_client.create_container(container_name)
    except Exception as e:
        print(f"Container '{container_name}' already exists: {e}")

def create_index_containers(user_id, index_name, is_restricted):
    blob_service_client = initialize_blob_service()
    prefix = f"{user_id}-" if is_restricted else "open-"
    container_names = [
        f"{prefix}{index_name}-ingestion",
        f"{prefix}{index_name}-reference"
    ]
    sanitized_container_names = [sanitize_container_name(name) for name in container_names]
    
    for name in sanitized_container_names:
        create_container(blob_service_client, name)
    
    return sanitized_container_names

def upload_files_to_blob(container_name, file_paths):
    blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    for file_path in file_paths:
        blob_path = os.path.basename(file_path)
        with open(file_path, "rb") as data:
            container_client.upload_blob(name=blob_path, data=data, overwrite=True)

def list_files_in_container(container_name):
    blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    blobs = container_client.list_blobs()
    return [blob.name for blob in blobs]

def delete_file_from_blob(container_name, filename):
    blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    blob_client = container_client.get_blob_client(filename)
    blob_client.delete_blob()

def list_indexes():
    blob_service_client = initialize_blob_service()
    containers = blob_service_client.list_containers()
    indexes = set()
    for container in containers:
        name = container.name
        if name.endswith('-ingestion'):
            index_name = name[:-10]  
            if index_name.startswith('open-'):
                indexes.add((index_name[5:], False))  
            else:
                user_id, index_name = index_name.rsplit("-", 1)
                indexes.add((index_name, True))
    return list(indexes)

def delete_index(user_id, index_name, is_restricted):
    blob_service_client = initialize_blob_service()
    prefix = f"{user_id}-" if is_restricted else "open-"
    container_names = [
        f"{prefix}{index_name}-ingestion",
        f"{prefix}{index_name}-reference"
    ]
    for container_name in container_names:
        container_client = blob_service_client.get_container_client(container_name)
        container_client.delete_container()

def get_blob_url(container_name, blob_name):
    blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(container_name)
    blob_client = container_client.get_blob_client(blob_name)
    return blob_client.url