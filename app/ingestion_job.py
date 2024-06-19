import os
import requests
import time

def create_ingestion_job(container_name):
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

    print (f"Creating ingestion job: {url}")
    print (f"Payload: {payload}")
    print (f"Headers: {headers}")
    
    response = requests.put(url, headers=headers, json=payload)
    
    if response.status_code == 200:
        print(f"Ingestion job created successfully: {response.json()}")
        job_status_url = f"{endpoint}/openai/ingestion/jobs/{job_id}/runs?api-version={api_version}"
        check_job_status(job_status_url, headers)
    else:
        print(f"Failed to create ingestion job: {response.status_code}, {response.text}")

def check_job_status(url, headers):
    start_time = time.time()
    while True:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            job_status = response.json()
            print(f"Job status: {job_status}")
            if response.text.find("succeeded") != -1:
                print("Ingestion job completed successfully.")
                break

            if response.text.find("failed") != -1:
                print(f"Ingestion job failed: {response.text}")
                break
            
            else:
                print("Job is still in progress. Checking again in 5 seconds...")
                time.sleep(5)
                
                if time.time() - start_time > 240:
                    print("Ingestion job status check timed out.")
                    break
        else:
            print(f"Failed to get job status: {response.status_code}, {response.text}")
            break
