import os
import requests
import time
from typing import Dict, Any

def create_ingestion_job(container_name: str) -> Dict[str, Any]:
    endpoint = os.getenv('OPENAI_ENDPOINT')
    api_version = '2024-05-01-preview'
    job_id = container_name
    api_key = os.getenv('AOAI_API_KEY')
    search_service_endpoint = os.getenv('SEARCH_SERVICE_ENDPOINT')
    
    storage_account_name = os.getenv('STORAGE_ACCOUNT_NAME')
    subscription_id = os.getenv('SUBSCRIPTION_ID')
    resource_group = os.getenv('RESOURCE_GROUP')
    ada_deployment_name = os.getenv('ADA_DEPLOYMENT_NAME')
    storage_account_endpoint = f"https://{storage_account_name}.blob.core.windows.net/"
    storage_account_resource_id = f"ResourceId=/subscriptions/{subscription_id}/resourceGroups/{resource_group}/providers/Microsoft.Storage/storageAccounts/{storage_account_name}"
    
    url = f"{endpoint}/openai/ingestion/jobs/{job_id}?api-version={api_version}"
    
    headers = {
        'api-key': api_key,
        'Opc-Apim-Subscription-Key': api_key,
        'Content-Type': 'application/json'
    }
    
    payload = {
        "kind": "system",
        "searchServiceConnection": {
            "kind": "EndpointWithManagedIdentity",
            "endpoint": search_service_endpoint
        },
        "datasource": {
            "kind": "Storage",
            "storageAccountConnection": {
                "kind": "EndpointWithManagedIdentity",
                "endpoint": storage_account_endpoint,
                "resourceId": storage_account_resource_id
            },
            "containerName": container_name,
            "chunkingSettings": {
                "maxChunkSizeInTokens": 2048
            },
            "embeddingsSettings": [
                {
                    "embeddingResourceConnection": {
                        "kind": "RelativeConnection"
                    },
                    "modelProvider": "AOAI",
                    "deploymentName": ada_deployment_name
                }
            ]
        },
        "completionAction": 1 
    }
    
    response = requests.put(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        return {
            "status": "initiated",
            "job_id": job_id,
            "message": "Indexing job initiated successfully"
        }
    else:
        raise Exception(f"Failed to create ingestion job: {response.text}")

def check_job_status(job_id: str) -> Dict[str, Any]:
    endpoint = os.getenv('OPENAI_ENDPOINT')
    api_version = '2024-05-01-preview'
    api_key = os.getenv('AOAI_API_KEY')
    
    url = f"{endpoint}/openai/ingestion/jobs/{job_id}/runs?api-version={api_version}"
    
    headers = {
        'api-key': api_key,
        'Opc-Apim-Subscription-Key': api_key,
        'Content-Type': 'application/json'
    }
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        job_status = response.json()
        if "succeeded" in response.text:
            return {"status": "completed", "message": "Indexing job completed successfully"}
        elif "failed" in response.text:
            return {"status": "failed", "message": "Indexing job failed"}
        else:
            return {"status": "in_progress", "message": "Indexing job is still in progress"}
    else:
        return {"status": "error", "message": f"Error checking job status: {response.text}"}

def delete_ingestion_index(job_id: str) -> Dict[str, Any]:
    endpoint = os.getenv('SEARCH_SERVICE_ENDPOINT')
    api_key = os.getenv('SEARCH_SERVICE_API_KEY')
    
    url = f"{endpoint}/indexes/{job_id}?api-version=2020-06-30"
    
    headers = {
        'api-key': api_key,
        'Opc-Apim-Subscription-Key': api_key,
        'Content-Type': 'application/json'
    }
    
    response = requests.delete(url, headers=headers)
    
    if response.status_code == 204:
        return {"status": "success", "message": f"Ingestion index {job_id} deleted successfully"}
    else:
        return {"status": "error", "message": f"Failed to delete ingestion index: {response.text}"}