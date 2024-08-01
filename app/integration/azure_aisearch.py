import os
from typing import Dict, Any, List
import requests
from dotenv import load_dotenv

load_dotenv()

class AzureAISearch:
    def __init__(self, config: Dict[str, str] = None):
        if config is None:
            config = self.get_aisearch_config()
        self.endpoint = config['SEARCH_SERVICE_ENDPOINT']
        self.api_key = config['SEARCH_SERVICE_API_KEY']
        self.api_version = "2021-04-30-Preview"

    @staticmethod
    def get_aisearch_config() -> Dict[str, str]:
        """Retrieve Azure AI Search configuration from environment variables."""
        return {
            "SEARCH_SERVICE_ENDPOINT": os.environ.get('SEARCH_SERVICE_ENDPOINT', ''),
            "SEARCH_SERVICE_API_KEY": os.environ.get('SEARCH_SERVICE_API_KEY', ''),
        }

    def search(self, query: str, index: str, top: int = 5) -> str:
        """Search Azure AI Search for relevant content."""
        headers = {
            'Content-Type': 'application/json',
            'api-key': self.api_key
        }
        
        body = {
            'search': query,
            'select': 'content',
            'top': top 
        }
        
        url = f"{self.endpoint}/indexes/{index}/docs/search?api-version={self.api_version}"
        
        try:
            response = requests.post(url, headers=headers, json=body)
            response.raise_for_status()
            results = response.json()
            
            context = ""
            for result in results.get('value', []):
                context += result.get('content', '') + "\n\n"
            
            return context.strip()
        except requests.RequestException as e:
            print(f"Error in Azure AI Search: {str(e)}")
            return ""

    def create_data_source(self, index_name: str) -> Dict[str, Any]:
        """Create a data source configuration for Azure Cognitive Search."""
        return {
            "type": "AzureCognitiveSearch",
            "parameters": {
                "endpoint": self.endpoint,
                "key": self.api_key,
                "index_name": index_name
            }
        }

def create_data_source(endpoint: str, key: str, index_name: str) -> Dict[str, Any]:
    ai_search = AzureAISearch({"SEARCH_SERVICE_ENDPOINT": endpoint, "SEARCH_SERVICE_API_KEY": key})
    return ai_search.create_data_source(index_name)

def search_azure_ai(query: str, config: Dict[str, str], index: str) -> str:
    """Search Azure AI Search for relevant content (backwards compatibility function)."""
    ai_search = AzureAISearch(config)
    return ai_search.search(query, index)