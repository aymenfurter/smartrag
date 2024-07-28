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
import logging

# Load environment variables

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GraphRagProcessor:
    def __init__(self, index_name, user_id, is_restricted):
        self.prefix = "open" if not is_restricted else user_id
        self.index_name = index_name
        self.collection_name = f"{self.prefix}-{index_name}-graphrag"

    def _get_config(self):
        storage_account = os.getenv("STORAGE_ACCOUNT_NAME")
        storage_key = os.getenv("STORAGE_ACCOUNT_KEY")
        blob_url = f"https://{storage_account}.blob.core.windows.net"
        connection_string = f"DefaultEndpointsProtocol=https;AccountName={storage_account};AccountKey={storage_key};EndpointSuffix=core.windows.net"

        base_config = {
            "storage_account_blob_url": blob_url,
            "connection_string": connection_string,
        }

        containers = {
            "input": f"{self.prefix}-{self.index_name}-ingestion",
            "storage": f"{self.prefix}-{self.index_name}-grdata",
            "reporting": f"{self.prefix}-{self.index_name}-grrep",
            "cache": f"{self.prefix}-{self.index_name}-grcache",
        }

        config = {
            "input": {**base_config, "container_name": containers["input"], "type": "blob", "file_type": "text", "file_pattern": r".*\.md$", "base_dir": "."},
            "storage": {**base_config, "container_name": containers["storage"], "type": "blob", "base_dir": "output"},
            "reporting": {**base_config, "container_name": containers["reporting"], "type": "blob", "base_dir": "logs"},
            "cache": {**base_config, "container_name": containers["cache"], "type": "blob", "base_dir": "cache"},
            "llm": self._get_llm_config("chat"),
            "embeddings": {
                "async_mode": "threaded",
                "llm": self._get_llm_config("embedding"),
                "parallelization": {"stagger": 0.25, "num_threads": 10},
                "vector_store": self._get_vector_store_config(),
            },
            "parallelization": {"stagger": 0.25, "num_threads": 10},
            "async_mode": "threaded",
            "entity_extraction": {"prompt": "app/prompts/entity-extraction-prompt.txt"},
            "community_reports": {"prompt": "app/prompts/community-report-prompt.txt"},
            "summarize_descriptions": {"prompt": "app/prompts/summarize-descriptions-prompt.txt"},
            "claim_extraction": {"enabled": True},
            "snapshots": {"graphml": True},
        }
        return config

    def _get_llm_config(self, llm_type):
        base_config = {
            "type": f"azure_openai_{llm_type}",
            "api_base": os.getenv("OPENAI_ENDPOINT"),
            "api_version": "2023-03-15-preview",
            "api_key": os.getenv("AOAI_API_KEY"),
            "cognitive_services_endpoint": "https://cognitiveservices.azure.com/.default",
        }
        
        if llm_type == "chat":
            return {
                **base_config,
                "model": os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
                "deployment_name": os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
                "model_supports_json": True,
                "tokens_per_minute": 80000,
                "requests_per_minute": 480,
                "thread_count": 50,
                "concurrent_requests": 25,
            }
        else:
            return {
                **base_config,
                "batch_size": 16,
                "model": os.getenv("ADA_DEPLOYMENT_NAME"),
                "deployment_name": os.getenv("ADA_DEPLOYMENT_NAME"),
                "tokens_per_minute": 350000,
                "concurrent_requests": 25,
                "requests_per_minute": 2100,
                "thread_count": 50,
                "max_retries": 50,
            }

    def _get_vector_store_config(self):
        return {
            "type": "azure_ai_search",
            "collection_name": self.collection_name,
            "title_column": "name",
            "overwrite": True,
            "api_key": os.getenv("SEARCH_SERVICE_API_KEY"),
            "url": os.getenv("SEARCH_SERVICE_ENDPOINT"),
            "audience": "https://search.azure.com",
        }

    async def process(self):
        config = self._get_config()
        parameters = create_graphrag_config(config, ".")
        pipeline_config = create_pipeline_config(parameters, True)

        logger.info(f"Starting GraphRAG processing for index: {self.index_name}")
        async for workflow_result in run_pipeline_with_config(
            config_or_path=pipeline_config,
            progress_reporter=PrintProgressReporter("Running GraphRAG pipeline..."),
        ):
            if workflow_result.errors:
                logger.error(f"Errors found in GraphRAG workflow result for index {self.index_name}: {workflow_result.errors}")
            else:
                logger.info(f"GraphRAG processing completed successfully for index: {self.index_name}")


    def get_reports(self, entity_table_path: str, community_report_table_path: str, community_level: int) -> tuple[pd.DataFrame, pd.DataFrame]:
        config = self._get_config() 
        blob_service_client = BlobServiceClient.from_connection_string(config["storage"]["connection_string"])

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

    async def global_query(self, query: str):
        ENTITY_TABLE = "output/create_final_nodes.parquet"
        COMMUNITY_REPORT_TABLE = "output/create_final_community_reports.parquet"
        COMMUNITY_LEVEL = 1

        entity_table_path = f"abfs://{self.prefix}-{self.index_name}-grdata/{ENTITY_TABLE}"
        community_report_table_path = f"abfs://{self.prefix}-{self.index_name}-grdata/{COMMUNITY_REPORT_TABLE}"
        report_df, entity_df = self.get_reports(entity_table_path, community_report_table_path, COMMUNITY_LEVEL)

        id_col = 'community'
        report_df["title"] = [f"{self.index_name}<sep>{i}<sep>{t}" for i, t in zip(report_df[id_col], report_df["title"])]

        config = self._get_config()
        llm = ChatOpenAI(
            api_base=config["llm"]["api_base"],
            model=config["llm"]["model"],
            api_type=OpenaiApiType.AzureOpenAI,
            deployment_name=config["llm"]["deployment_name"],
            api_version=config["llm"]["api_version"],
            api_key=config["llm"]["api_key"],
            max_retries=10,
        )

        token_encoder = tiktoken.encoding_for_model(config["llm"]["model"])

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