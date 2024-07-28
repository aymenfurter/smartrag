import asyncio
import os
import requests
import time
import logging
from typing import Dict, Any
from .graphrag import GraphRagProcessor
from .indexing_queue import initialize_table_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_env_variable(name: str) -> str:
    return os.environ[name]

def api_request(method: str, url: str, headers: Dict[str, str], json: Dict[str, Any] = None) -> requests.Response:
    return requests.request(method, url, headers=headers, json=json)

def create_ingestion_job(container_name: str) -> Dict[str, Any]:
    endpoint, api_key = get_env_variable('OPENAI_ENDPOINT'), get_env_variable('AOAI_API_KEY')
    url = f"{endpoint}/openai/ingestion/jobs/{container_name}?api-version=2024-05-01-preview"
    headers = {'api-key': api_key, 'Opc-Apim-Subscription-Key': api_key, 'Content-Type': 'application/json'}
    payload = {
        "kind": "system",
        "searchServiceConnection": {"kind": "EndpointWithManagedIdentity", "endpoint": get_env_variable('SEARCH_SERVICE_ENDPOINT')},
        "datasource": {
            "kind": "Storage",
            "storageAccountConnection": {
                "kind": "EndpointWithManagedIdentity",
                "endpoint": f"https://{get_env_variable('STORAGE_ACCOUNT_NAME')}.blob.core.windows.net/",
                "resourceId": f"ResourceId=/subscriptions/{get_env_variable('SUBSCRIPTION_ID')}/resourceGroups/{get_env_variable('RESOURCE_GROUP')}/providers/Microsoft.Storage/storageAccounts/{get_env_variable('STORAGE_ACCOUNT_NAME')}"
            },
            "containerName": container_name,
            "chunkingSettings": {"maxChunkSizeInTokens": 2048},
            "embeddingsSettings": [{"embeddingResourceConnection": {"kind": "RelativeConnection"}, "modelProvider": "AOAI", "deploymentName": get_env_variable('ADA_DEPLOYMENT_NAME')}]
        },
        "completionAction": 1
    }
    response = api_request('PUT', url, headers, payload)
    return {"status": "initiated", "job_id": container_name, "message": "Indexing job initiated successfully"} if response.status_code == 200 else {"status": "error", "message": f"Failed to create ingestion job: {response.text}"}

def get_api_status(job_id: str) -> str:
    endpoint, api_key = get_env_variable('OPENAI_ENDPOINT'), get_env_variable('AOAI_API_KEY')
    url = f"{endpoint}/openai/ingestion/jobs/{job_id}/runs?api-version=2024-05-01-preview"
    headers = {'api-key': api_key, 'Opc-Apim-Subscription-Key': api_key, 'Content-Type': 'application/json'}
    response = api_request('GET', url, headers)
    return "completed" if "succeeded" in response.text else "failed" if "failed" in response.text else "in_progress" if response.status_code == 200 else "error"

def check_ingestion_job_status(job_id: str) -> Dict[str, Any]:
    status = get_api_status(job_id)
    return {"status": status, "message": f"Indexing job {status}"} if status != "error" else {"status": "error", "message": "Error checking job status"}

def check_job_status(job_id: str) -> Dict[str, Any]:
    table_status = initialize_table_client("indexing").get_entity("indexing", job_id)['status']
    api_status = get_api_status(job_id)
    if table_status == 'completed' and api_status == 'completed':
        return {"status": "completed", "message": "Job completed successfully"}
    elif table_status == 'failed' or api_status == 'failed':
        return {"status": "failed", "message": "Job failed"}
    elif api_status == 'error':
        return {"status": "error", "message": "Error checking job status"}
    else:
        return {"status": "in_progress", "message": "Job is still in progress"}

def delete_ingestion_index(job_id: str) -> Dict[str, Any]:
    endpoint, api_key = get_env_variable('SEARCH_SERVICE_ENDPOINT'), get_env_variable('SEARCH_SERVICE_API_KEY')
    url = f"{endpoint}/indexes/{job_id}?api-version=2020-06-30"
    headers = {'api-key': api_key, 'Opc-Apim-Subscription-Key': api_key, 'Content-Type': 'application/json'}
    response = api_request('DELETE', url, headers)
    return {"status": "success", "message": f"Ingestion index {job_id} deleted successfully"} if response.status_code == 204 else {"status": "error", "message": f"Failed to delete ingestion index: {response.text}"}

def update_job_status(job_id: str, status: str):
    initialize_table_client("indexing").update_entity({"PartitionKey": "indexing", "RowKey": job_id, "status": status})

async def process_indexing_job(job_info: Dict[str, Any]):
    job_id, container_name, user_id, index_name, is_restricted = job_info['job_id'], job_info['container_name'], job_info['user_id'], job_info['index_name'], job_info['is_restricted']
    try:
        update_job_status(job_id, "ingestion_started")
        create_ingestion_job(container_name)
        update_job_status(job_id, "graphrag_started")
        await GraphRagProcessor(index_name, user_id, is_restricted).process()
        update_job_status(job_id, "graphrag_completed")
        while (status := check_ingestion_job_status(job_id))['status'] not in ['completed', 'failed']:
            await asyncio.sleep(60)
        update_job_status(job_id, status['status'])
        logger.info(f"{'Completed' if status['status'] == 'completed' else 'Failed'} indexing job for container: {container_name}")
        await asyncio.sleep(60)
        initialize_table_client("indexing").delete_entity("indexing", job_id)
    except Exception as e:
        logger.error(f"Error processing indexing job: {str(e)}")
        update_job_status(job_id, "failed")