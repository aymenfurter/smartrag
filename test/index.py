import asyncio
from graphrag.config import create_graphrag_config
from graphrag.index import create_pipeline_config
from graphrag.index.run import run_pipeline_with_config
from graphrag.index.progress import PrintProgressReporter


from azure.storage.blob import BlobServiceClient, BlobClient
import pandas as pd
import os

import asyncio

from dotenv import load_dotenv
load_dotenv()

index_name = "foobar"
collection_name = "open-foobar-graphrag"

storage_account_name = os.getenv("STORAGE_ACCOUNT_NAME")
storage_account_key = os.getenv("STORAGE_ACCOUNT_KEY")
storage_account_blob_url = f"https://{storage_account_name}.blob.core.windows.net"
connection_string = f"DefaultEndpointsProtocol=https;AccountName={storage_account_name};AccountKey={storage_account_key};EndpointSuffix=core.windows.net"

config = {
    "input": {
        "type": "blob",
        "file_type": "text",
        "file_pattern": r".*\.md$",
        "storage_account_blob_url": storage_account_blob_url,
        "connection_string": connection_string,
        "container_name": f"open-{index_name}-ingestion",
        "base_dir": ".",
    },
    "storage": {
        "type": "blob",
        "storage_account_blob_url": storage_account_blob_url,
        "connection_string": connection_string,
        "container_name": f"open-{index_name}-grdata",
        "base_dir": "output",
    },
    "reporting": {
        "type": "blob",
        "storage_account_blob_url":  storage_account_blob_url,
        "connection_string": connection_string,
        "container_name": f"open-{index_name}-grrep",
        "base_dir": "logs",
    },
    "cache": {
        "type": "blob",
        "storage_account_blob_url":  storage_account_blob_url,
        "container_name": f"open-{index_name}-grcache",
        "connection_string": connection_string,
        "base_dir": "cache",
    },
    "llm": {
        "type": "azure_openai_chat",
        "api_base": os.getenv("OPENAI_ENDPOINT"),
        "api_version": "2023-03-15-preview",
        "model": os.getenv("ADA_DEPLOYMENT_NAME"),
        "deployment_name": os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
        "api_key": os.getenv("AOAI_API_KEY"),
        "cognitive_services_endpoint": "https://cognitiveservices.azure.com/.default",
        "model_supports_json": True,
        "tokens_per_minute": 80000,
        "requests_per_minute": 480,
        "thread_count": 50,
        "concurrent_requests": 25,
    },
    "parallelization": {
        "stagger": 0.25,
        "num_threads": 10,
    },
    "async_mode": "threaded",
    "embeddings": {
        "async_mode": "threaded",
        "llm": {
            "type": "azure_openai_embedding",
            "api_base": os.getenv("OPENAI_ENDPOINT"),
            "api_version": "2023-03-15-preview",
            "batch_size": 16,
            "model": os.getenv("ADA_DEPLOYMENT_NAME"),
            "deployment_name": os.getenv("ADA_DEPLOYMENT_NAME"),
            "api_key": os.getenv("AOAI_API_KEY"),
            "cognitive_services_endpoint": "https://cognitiveservices.azure.com/.default",
            "tokens_per_minute": 350000,
            "concurrent_requests": 25,
            "requests_per_minute": 2100,
            "thread_count": 50,
            "max_retries": 50,
        },
        "parallelization": {
            "stagger": 0.25,
            "num_threads": 10,
        },
        "vector_store": {
            "type": "azure_ai_search",
            "collection_name": collection_name,
            "title_column": "name",
            "overwrite": True,
            "api_key": os.getenv("SEARCH_SERVICE_API_KEY"),
            "url": os.getenv("SEARCH_SERVICE_ENDPOINT"),
            "audience": "https://search.azure.com",
        },
    },
    "entity_extraction": {
        "prompt": "entity-extraction-prompt.txt",
    },
    "community_reports": {
        "prompt": "community-report-prompt.txt",
    },
    "summarize_descriptions": {
        "prompt": "summarize-descriptions-prompt.txt",
    },
    "claim_extraction": {
        "enabled": True,
    },
    "snapshots": {
        "graphml": True,
    },
}

parameters = create_graphrag_config(config, ".")
pipeline_config = create_pipeline_config(parameters, True)

async def run_pipeline():
    async for workflow_result in run_pipeline_with_config(
        config_or_path=pipeline_config,
        progress_reporter=PrintProgressReporter("Running pipeline..."),
    ):
        if len(workflow_result.errors or []) > 0:
            print("Errors found in workflow result:")
            print(workflow_result.errors)

if __name__ == "__main__":
    asyncio.run(run_pipeline())
