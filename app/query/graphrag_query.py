import pandas as pd
import numpy as np
import tiktoken
from io import BytesIO
from azure.storage.blob import BlobServiceClient
from app.integration.graphrag_config import GraphRagConfig
import pyarrow.parquet as pq
from graphrag.query.indexer_adapters import read_indexer_reports
from graphrag.query.structured_search.global_search.search import GlobalSearch
from graphrag.query.llm.oai.chat_openai import ChatOpenAI
from graphrag.query.llm.oai.typing import OpenaiApiType
from graphrag.query.structured_search.global_search.community_context import GlobalCommunityContext
import time

class GraphRagQuery:
    def __init__(self, config: GraphRagConfig):
        self.config = config

    def get_reports(self, entity_table_path: str, community_report_table_path: str, community_level: int) -> tuple[pd.DataFrame, pd.DataFrame]:
        config = self.config.get_config()
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
        COMMUNITY_LEVEL = 2

        entity_table_path = f"abfs://{self.config.prefix}-{self.config.index_name}-grdata/{ENTITY_TABLE}"
        community_report_table_path = f"abfs://{self.config.prefix}-{self.config.index_name}-grdata/{COMMUNITY_REPORT_TABLE}"

        start_time = time.time()
        report_df, entity_df = self.get_reports(entity_table_path, community_report_table_path, COMMUNITY_LEVEL)
        end_time = time.time()

        download_time = end_time - start_time
        print(f"Download time: {download_time} seconds")

        id_col = 'community'
        report_df["title"] = [f"{self.config.index_name}<sep>{i}<sep>{t}" for i, t in zip(report_df[id_col], report_df["title"])]

        config = self.config.get_config()
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
            concurrent_coroutines=1
        )
        
        start_time = time.time()
        result = await global_search.asearch(query=query)
        end = time.time()
        print(f"Time taken for asearch: {end - start_time}")

        processed_reports = []
        if isinstance(result.context_data.get("reports"), pd.DataFrame):
            for _, row in result.context_data["reports"].iterrows():
                processed_reports.append({
                    "index_name": row["title"].split("<sep>")[0] if "<sep>" in row["title"] else self.config.index_name,
                    "index_id": row["title"].split("<sep>")[1] if "<sep>" in row["title"] else "unknown",
                    "title": row["title"].split("<sep>")[2] if "<sep>" in row["title"] else row["title"],
                    "content": row["content"],
                    "rank": float(row["rank"])
                })
        elif isinstance(result.context_data.get("reports"), list):
            for entry in result.context_data["reports"]:
                processed_reports.append({
                    "index_name": entry["title"].split("<sep>")[0] if "<sep>" in entry.get("title", "") else self.config.index_name,
                    "index_id": entry["title"].split("<sep>")[1] if "<sep>" in entry.get("title", "") else "unknown",
                    "title": entry["title"].split("<sep>")[2] if "<sep>" in entry.get("title", "") else entry.get("title", "unknown"),
                    "content": entry.get("content", ""),
                    "rank": float(entry.get("rank", 0))
                })

        result.context_data["reports"] = processed_reports

        serializable_context_data = {}
        for key, value in result.context_data.items():
            if isinstance(value, pd.DataFrame):
                serializable_context_data[key] = value.to_dict(orient='records')
            elif isinstance(value, np.ndarray):
                serializable_context_data[key] = value.tolist()
            else:
                serializable_context_data[key] = value

        return result.response, serializable_context_data
