import os

class GraphRagConfig:
    def __init__(self, index_name, user_id, is_restricted):
        self.prefix = "open" if not is_restricted else user_id
        self.index_name = index_name
        self.collection_name = f"{self.prefix}-{index_name}-graphrag"

    def get_config(self):
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
            "entity_extraction": {"prompt": "app/ingestion/prompts/entity-extraction-prompt.txt"},
            "community_reports": {"prompt": "app/ingestion/prompts/community-report-prompt.txt"},
            "summarize_descriptions": {"prompt": "app/ingestion/prompts/summarize-descriptions-prompt.txt"},
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