import logging
import re
import requests
from typing import Dict, Any, Optional, Tuple, List
from .comparison_models import CitationInfo, SimplifiedResponse
from app.integration.azure_openai import create_payload

logger = logging.getLogger(__name__)

class ResponseProcessor:
    def __init__(self, config, client):
        self.config = config
        self.client = client

    async def process_citations(self, response: str, context: Dict[str, Any], index_name: str, data_source: Any) -> Tuple[str, List[Dict[str, Any]]]:
        try:
            url = f"{self.config['OPENAI_ENDPOINT']}/openai/deployments/{self.config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
            headers = {
                "Content-Type": "application/json",
                "api-key": self.config['AOAI_API_KEY']
            }

            prompt = (
                "Please analyze this response and provide citations:\n\n"
                f"{response}\n\n"
                "Verify the information and provide citations from our knowledge base."
            )

            payload = create_payload(
                [{"role": "user", "content": prompt}],
                {},
                {},
                [data_source],
                False
            )

            response_data = requests.post(url, headers=headers, json=payload)
            response_data.raise_for_status()
            
            result = response_data.json()
            verified_response = result["choices"][0]["message"]["content"]
            
            citations = [
                {
                    "file": citation["url"].split("/")[-1],
                    "content": citation.get("content", ""),
                    "text": citation.get("text", "")
                }
                for citation in result["choices"][0]["message"]["context"]["citations"]
            ]

            return verified_response, citations

        except Exception as e:
            logger.error(f"Error processing citations: {str(e)}")
            return response, []

    async def simplify_response(self, metric_type: str, query: str, detailed_response: str) -> Optional[str]:
        print ("Simplifying answer")
        print (metric_type)
        print (detailed_response)
        try:
            if metric_type == "yes_no":
                if "I am sorry" in detailed_response or "The requested information is not available" in detailed_response:
                    return "N/A"
                    
                prompt = f"Consider the following query and response. Is the response a Yes or No?\n\nQuery: {query}\n\nResponse: {detailed_response}"
                response = self.client.chat.completions.create(
                    model=self.config['AZURE_OPENAI_DEPLOYMENT_ID'],
                    response_model=SimplifiedResponse,
                    messages=[{"role": "user", "content": prompt}]
                )
                print ("Response")
                print (response)
                simplified = response.value.strip()
                return "Yes" if "yes" in simplified.lower() else "No" if "no" in simplified.lower() else "N/A"

            elif metric_type == "numeric":
                prompt = f"Extract a single numeric value and its unit from the following response:\n\n{detailed_response}"
                response = self.client.chat.completions.create(
                    model=self.config['AZURE_OPENAI_DEPLOYMENT_ID'],
                    response_model=SimplifiedResponse,
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.value.strip()
            
            return None
        except Exception as e:
            logger.error(f"Error simplifying response: {str(e)}")
            return None