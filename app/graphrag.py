import asyncio
import pandas as pd
import os
from dotenv import load_dotenv
from fastapi import HTTPException
from graphrag.config import create_graphrag_config
from graphrag.index import create_pipeline_config
from graphrag.index.run import run_pipeline_with_config
from graphrag.index.progress import PrintProgressReporter
from graphrag.query.indexer_adapters import read_indexer_reports
from graphrag.query.structured_search.global_search.search import GlobalSearch
from graphrag.query.llm.oai.chat_openai import ChatOpenAI
from graphrag.query.llm.oai.typing import OpenaiApiType
from graphrag.query.structured_search.global_search.community_context import GlobalCommunityContext
from azure.storage.blob import BlobServiceClient
import pyarrow.parquet as pq
import pyarrow as pa
from io import BytesIO
import tiktoken
import numpy as np

# Load environment variables
load_dotenv()

class GraphRagProcessor:
    def __init__(self, index_name, user_id, is_restricted):
        self.index_name = index_name
        self.user_id = user_id
        self.prefix = "open" if not is_restricted else user_id
        self.collection_name = f"{self.prefix}-{index_name}-graphrag"
        self.config = self._get_config()

    def _get_config(self):
        storage_account_name = os.getenv("STORAGE_ACCOUNT_NAME")
        storage_account_key = os.getenv("STORAGE_ACCOUNT_KEY")
        storage_account_blob_url = f"https://{storage_account_name}.blob.core.windows.net"
        connection_string = f"DefaultEndpointsProtocol=https;AccountName={storage_account_name};AccountKey={storage_account_key};EndpointSuffix=core.windows.net"

        return {
            "input": {
                "type": "blob",
                "file_type": "text",
                "file_pattern": r".*\.md$",
                "storage_account_blob_url": storage_account_blob_url,
                "connection_string": connection_string,
                "container_name": f"{self.prefix}-{self.index_name}-ingestion",
                "base_dir": ".",
            },
            "storage": {
                "type": "blob",
                "storage_account_blob_url": storage_account_blob_url,
                "connection_string": connection_string,
                "container_name": f"{self.prefix}-{self.index_name}-grdata",
                "base_dir": "output",
            },
            "reporting": {
                "type": "blob",
                "storage_account_blob_url": storage_account_blob_url,
                "connection_string": connection_string,
                "container_name": f"{self.prefix}-{self.index_name}-grrep",
                "base_dir": "logs",
            },
            "cache": {
                "type": "blob",
                "storage_account_blob_url": storage_account_blob_url,
                "container_name": f"{self.prefix}-{self.index_name}-grcache",
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
                "max_retries": 50,
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
                    "collection_name": self.collection_name,
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

    def get_reports(self, entity_table_path: str, community_report_table_path: str, community_level: int) -> tuple[pd.DataFrame, pd.DataFrame]:
        blob_service_client = BlobServiceClient.from_connection_string(self.config["storage"]["connection_string"])

        def read_parquet_from_blob(blob_path):
            container_name, blob_name = blob_path.split('/', 3)[2:]
            blob_client = blob_service_client.get_blob_client(container=container_name, blob=blob_name)
            
            stream = BytesIO()
            stream.write(blob_client.download_blob().readall())
            stream.seek(0)
            
            return pq.read_table(stream).to_pandas()

        entity_df = read_parquet_from_blob(entity_table_path)
        report_df = read_parquet_from_blob(community_report_table_path)
        return report_df, entity_df

    def process(self):
        parameters = create_graphrag_config(self.config, ".")
        pipeline_config = create_pipeline_config(parameters, True)

        for workflow_result in run_pipeline_with_config(
            config_or_path=pipeline_config,
            progress_reporter=PrintProgressReporter("Running pipeline..."),
        ):
            if workflow_result.errors:
                print("Errors found in workflow result:")
                print(workflow_result.errors)
    async def global_query(self, query: str):
        ENTITY_TABLE = "output/create_final_nodes.parquet"
        COMMUNITY_REPORT_TABLE = "output/create_final_community_reports.parquet"
        COMMUNITY_LEVEL = 1

        entity_table_path = f"abfs://{self.prefix}-{self.index_name}-grdata/{ENTITY_TABLE}"
        community_report_table_path = f"abfs://{self.prefix}-{self.index_name}-grdata/{COMMUNITY_REPORT_TABLE}"
        report_df, entity_df = self.get_reports(entity_table_path, community_report_table_path, COMMUNITY_LEVEL)

        id_col = 'community'
        report_df["title"] = [f"{self.index_name}<sep>{i}<sep>{t}" for i, t in zip(report_df[id_col], report_df["title"])]


        llm = ChatOpenAI(
            api_base=self.config["llm"]["api_base"],
            model=self.config["llm"]["model"],
            api_type=OpenaiApiType.AzureOpenAI,
            deployment_name=self.config["llm"]["deployment_name"],
            api_version=self.config["llm"]["api_version"],
            api_key=self.config["llm"]["api_key"],
            max_retries=self.config["llm"]["max_retries"],
        )

        token_encoder = tiktoken.encoding_for_model(self.config["llm"]["model"])

        context_builder = GlobalCommunityContext(
            community_reports=read_indexer_reports(report_df, entity_df, COMMUNITY_LEVEL),
            token_encoder=token_encoder,
        )

        global_search = GlobalSearch(
            llm=llm,
            context_builder=context_builder,
            token_encoder=token_encoder,
            max_data_tokens=3000,
            map_llm_params={"max_tokens": 500, "temperature": 0.0},
            reduce_llm_params={"max_tokens": 500, "temperature": 0.0},
            context_builder_params={
                "use_community_summary": False,
                "shuffle_data": True,
                "include_community_rank": True,
                "min_community_rank": 0,
                "max_tokens": 3000,
                "context_name": "Reports",
            },
        )

        result = await global_search.asearch(query=query)

        print ("###############")
        print (result)
        print ("###############")

        processed_reports = []
        if isinstance(result.context_data.get("reports"), pd.DataFrame):
            for _, row in result.context_data["reports"].iterrows():
                processed_reports.append({
                    "index_name": row["title"].split("<sep>")[0] if "<sep>" in row["title"] else self.index_name,
                    "index_id": row["title"].split("<sep>")[1] if "<sep>" in row["title"] else "unknown",
                    "title": row["title"].split("<sep>")[2] if "<sep>" in row["title"] else row["title"],
                    "content": row["content"],
                    "rank": float(row["rank"])  # Convert to float to ensure JSON serialization
                })
        elif isinstance(result.context_data.get("reports"), list):
            for entry in result.context_data["reports"]:
                processed_reports.append({
                    "index_name": entry["title"].split("<sep>")[0] if "<sep>" in entry.get("title", "") else self.index_name,
                    "index_id": entry["title"].split("<sep>")[1] if "<sep>" in entry.get("title", "") else "unknown",
                    "title": entry["title"].split("<sep>")[2] if "<sep>" in entry.get("title", "") else entry.get("title", "unknown"),
                    "content": entry.get("content", ""),
                    "rank": float(entry.get("rank", 0))  # Convert to float to ensure JSON serialization
                })

        # Replace the original DataFrame with the processed list of dictionaries
        result.context_data["reports"] = processed_reports

        # Ensure all data in context_data is JSON serializable
        serializable_context_data = {}
        for key, value in result.context_data.items():
            if isinstance(value, pd.DataFrame):
                serializable_context_data[key] = value.to_dict(orient='records')
            elif isinstance(value, np.ndarray):
                serializable_context_data[key] = value.tolist()
            else:
                serializable_context_data[key] = value

        return result.response, serializable_context_data