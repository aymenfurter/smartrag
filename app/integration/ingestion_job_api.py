import os
import requests
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

class IngestionJobApi:
    def __init__(self):
        self.openai_endpoint = os.environ['OPENAI_ENDPOINT']
        self.aoai_api_key = os.environ['AOAI_API_KEY']
        self.search_service_endpoint = os.environ['SEARCH_SERVICE_ENDPOINT']
        self.search_service_api_key = os.environ['SEARCH_SERVICE_API_KEY']
        self.storage_account_name = os.environ['STORAGE_ACCOUNT_NAME']
        self.subscription_id = os.environ['SUBSCRIPTION_ID']
        self.resource_group = os.environ['RESOURCE_GROUP']
        self.ada_deployment_name = os.environ['ADA_DEPLOYMENT_NAME']

    def _api_request(self, method: str, url: str, headers: Dict[str, str], json: Dict[str, Any] = None) -> requests.Response:
        return requests.request(method, url, headers=headers, json=json)

    def create_ingestion_job(self, container_name: str) -> Dict[str, Any]:
        url = f"{self.openai_endpoint}/openai/ingestion/jobs/{container_name}?api-version=2024-05-01-preview"
        headers = {'api-key': self.aoai_api_key, 'Opc-Apim-Subscription-Key': self.aoai_api_key, 'Content-Type': 'application/json'}
        payload = {
            "kind": "system",
            "searchServiceConnection": {"kind": "EndpointWithManagedIdentity", "endpoint": self.search_service_endpoint},
            "datasource": {
                "kind": "Storage",
                "storageAccountConnection": {
                    "kind": "EndpointWithManagedIdentity",
                    "endpoint": f"https://{self.storage_account_name}.blob.core.windows.net/",
                    "resourceId": f"ResourceId=/subscriptions/{self.subscription_id}/resourceGroups/{self.resource_group}/providers/Microsoft.Storage/storageAccounts/{self.storage_account_name}"
                },
                "containerName": container_name,
                "chunkingSettings": {"maxChunkSizeInTokens": 2048},
                "embeddingsSettings": [{"embeddingResourceConnection": {"kind": "RelativeConnection"}, "modelProvider": "AOAI", "deploymentName": self.ada_deployment_name}]
            },
            "completionAction": 1
        }
        response = self._api_request('PUT', url, headers, payload)
        return {"status": "initiated", "job_id": container_name, "message": "Indexing job initiated successfully"} if response.status_code == 200 else {"status": "error", "message": f"Failed to create ingestion job: {response.text}"}

    def get_api_status(self, job_id: str) -> str:
        url = f"{self.openai_endpoint}/openai/ingestion/jobs/{job_id}/runs?api-version=2024-05-01-preview"
        headers = {'api-key': self.aoai_api_key, 'Opc-Apim-Subscription-Key': self.aoai_api_key, 'Content-Type': 'application/json'}
        response = self._api_request('GET', url, headers)
        return "completed" if "succeeded" in response.text else "failed" if "failed" in response.text else "in_progress" if response.status_code == 200 else "error"

    def delete_ingestion_index(self, job_id: str) -> Dict[str, Any]:
        url = f"{self.search_service_endpoint}/indexes/{job_id}?api-version=2020-06-30"
        headers = {'api-key': self.search_service_api_key, 'Opc-Apim-Subscription-Key': self.search_service_api_key, 'Content-Type': 'application/json'}
        response = self._api_request('DELETE', url, headers)
        return {"status": "success", "message": f"Ingestion index {job_id} deleted successfully"} if response.status_code == 204 else {"status": "error", "message": f"Failed to delete ingestion index: {response.text}"}