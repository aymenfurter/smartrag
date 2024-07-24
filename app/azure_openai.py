import os
from typing import Dict, Any, List, Generator
import requests
from flask import Response
from openai import AzureOpenAI
import numpy as np


def get_azure_openai_client(api_key: str = None, api_version: str = None, azure_endpoint: str = None) -> AzureOpenAI:
    """Create and return an AzureOpenAI client."""
    return AzureOpenAI(
        api_key=api_key or os.environ["AOAI_API_KEY"],
        api_version=api_version or "2024-02-15-preview",
        azure_endpoint=azure_endpoint or os.environ["OPENAI_ENDPOINT"]
    )

def analyze_image(client: AzureOpenAI, b64_img: str, model: str = None) -> str:
    """Analyze an image using Azure OpenAI."""
    prompt = _get_image_analysis_prompt()
    try:
        response = client.chat.completions.create(
            model=model or os.environ["AZURE_OPENAI_DEPLOYMENT_NAME"],
            messages=_create_image_analysis_messages(prompt, b64_img),
            max_tokens=1000
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"Error analyzing image: {str(e)}"

def create_payload(messages: List[Dict[str, Any]], context: Dict[str, Any] = None, 
                   session_state: Dict[str, Any] = None, data_sources: List[Dict[str, Any]] = None, 
                   is_streaming: bool = False, max_tokens: int = 1000) -> Dict[str, Any]:
    """Create a payload for OpenAI API requests."""
    payload = {
        "messages": messages,
        "stream": is_streaming,
        "max_tokens": max_tokens,
    }
    if data_sources:
        payload.update({
            "data_sources": data_sources,
            "context": context,
            "session_state": session_state
        })
    return payload

def create_data_source(endpoint: str, key: str, index_name: str) -> Dict[str, Any]:
    """Create a data source configuration for Azure Cognitive Search."""
    return {
        "type": "AzureCognitiveSearch",
        "parameters": {
            "endpoint": endpoint,
            "key": key,
            "index_name": index_name
        }
    }

def get_response(url: str, headers: Dict[str, str], payload: Dict[str, Any]) -> Dict[str, Any]:
    """Send a POST request and return the JSON response."""
    try:
        with requests.post(url, headers=headers, json=payload) as response:
            response.raise_for_status()
            return response.json()
    except requests.RequestException as e:
        return {"error": f"Failed to retrieve response: {str(e)}"}

def stream_response(url: str, headers: Dict[str, str], payload: Dict[str, Any]) -> Response:
    """Stream the response from a POST request."""
    return Response(_stream_generator(url, headers, payload), content_type='application/x-ndjson')

def get_openai_config() -> Dict[str, str]:
    """Retrieve OpenAI configuration from environment variables."""
    return {
        "OPENAI_ENDPOINT": os.environ.get('OPENAI_ENDPOINT', ''),
        "AOAI_API_KEY": os.environ.get('AOAI_API_KEY', ''),
        "AZURE_OPENAI_DEPLOYMENT_ID": os.environ.get('AZURE_OPENAI_DEPLOYMENT_NAME', ''),
        "SEARCH_SERVICE_ENDPOINT": os.environ.get('SEARCH_SERVICE_ENDPOINT', ''),
        "SEARCH_SERVICE_API_KEY": os.environ.get('SEARCH_SERVICE_API_KEY', '')
    }

def get_openai_embedding(text: str) -> Dict[str, Any]:
    """Calculate OpenAI embedding value for a given text."""
    config = get_openai_config()
    url = f"{config['OPENAI_ENDPOINT']}/openai/deployments/text-embedding-ada-002/embeddings?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": config['AOAI_API_KEY']
    }
    payload = {
        "input": text,
        "model": "text-embedding-ada-002"
    }
    
    response = get_response(url, headers, payload)
    
    if response.get("error"):
        return response
    
    embedding = response["data"][0]["embedding"]
    
    return {"embedding": np.array(embedding)}

def calculate_cosine_similarity(vector1: np.ndarray, vector2: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors."""
    dot_product = np.dot(vector1, vector2)
    norm_vector1 = np.linalg.norm(vector1)
    norm_vector2 = np.linalg.norm(vector2)
    similarity = dot_product / (norm_vector1 * norm_vector2)
    
    return similarity

def _get_image_analysis_prompt() -> str:
    """Return the prompt for image analysis."""
    return """
    Analyze the provided visual content (image or graph) in detail and provide a concise description in 5-6 sentences without any markdown, headings, or new lines:
    1. Summarize the main information or message conveyed.
    2. Describe key elements, objects, or data points present.
    3. For charts/graphs, identify the type, explain axes, labels, and legend if applicable, and provide a brief trend analysis or key takeaways.
    4. For images, describe the setting, background, and notable objects, and identify any text or captions within the image.
    5. Explain how this visual relates to or enhances the surrounding context and suggest the likely purpose for including this visual in the document.
    """

def _create_image_analysis_messages(prompt: str, b64_img: str) -> List[Dict[str, Any]]:
    """Create messages for image analysis."""
    return [
        {"role": "system", "content": prompt},
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Analyze this image:"},
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_img}"}}
            ]
        }
    ]

def _stream_generator(url: str, headers: Dict[str, str], payload: Dict[str, Any]) -> Generator[str, None, None]:
    """Generate streamed response content."""
    try:
        with requests.post(url, headers=headers, json=payload, stream=True) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if line:
                    yield line.decode('utf-8') + "\n"
    except requests.RequestException as e:
        yield f"{{\"error\": \"Failed to retrieve response: {str(e)}\"}}\n"