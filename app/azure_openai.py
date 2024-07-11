import os
from typing import Dict, Any, List, Generator
import requests
from flask import Response
from openai import AzureOpenAI
import agentops
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize AgentOps
AGENTOPS_API_KEY = os.getenv("AGENTOPS_API_KEY")
if not AGENTOPS_API_KEY:
    raise ValueError("AGENTOPS_API_KEY not found in environment variables")

agentops.init(AGENTOPS_API_KEY)

@agentops.record_function('get_azure_openai_client')
def get_azure_openai_client(api_key: str = None, api_version: str = None, azure_endpoint: str = None) -> AzureOpenAI:
    """Create and return an AzureOpenAI client."""
    return AzureOpenAI(
        api_key=api_key or os.environ["AOAI_API_KEY"],
        api_version=api_version or "2024-02-15-preview",
        azure_endpoint=azure_endpoint or os.environ["OPENAI_ENDPOINT"]
    )

@agentops.record_function('analyze_image')
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
        agentops.log_error(f"Error analyzing image: {str(e)}")
        return f"Error analyzing image: {str(e)}"

@agentops.record_function('create_payload')
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

@agentops.record_function('create_data_source')
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

@agentops.record_function('get_response')
def get_response(url: str, headers: Dict[str, str], payload: Dict[str, Any]) -> Dict[str, Any]:
    """Send a POST request and return the JSON response."""
    try:
        with requests.post(url, headers=headers, json=payload) as response:
            response.raise_for_status()
            return response.json()
    except requests.RequestException as e:
        agentops.log_error(f"Failed to retrieve response: {str(e)}")
        return {"error": f"Failed to retrieve response: {str(e)}"}

@agentops.record_function('stream_response')
def stream_response(url: str, headers: Dict[str, str], payload: Dict[str, Any]) -> Response:
    """Stream the response from a POST request."""
    return Response(_stream_generator(url, headers, payload), content_type='application/x-ndjson')

@agentops.record_function('get_openai_config')
def get_openai_config() -> Dict[str, str]:
    """Retrieve OpenAI configuration from environment variables."""
    return {
        "OPENAI_ENDPOINT": os.environ.get('OPENAI_ENDPOINT', ''),
        "AOAI_API_KEY": os.environ.get('AOAI_API_KEY', ''),
        "AZURE_OPENAI_DEPLOYMENT_ID": os.environ.get('AZURE_OPENAI_DEPLOYMENT_NAME', ''),
        "SEARCH_SERVICE_ENDPOINT": os.environ.get('SEARCH_SERVICE_ENDPOINT', ''),
        "SEARCH_SERVICE_API_KEY": os.environ.get('SEARCH_SERVICE_API_KEY', '')
    }

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

@agentops.record_function('_stream_generator')
def _stream_generator(url: str, headers: Dict[str, str], payload: Dict[str, Any]) -> Generator[str, None, None]:
    """Generate streamed response content."""
    try:
        with requests.post(url, headers=headers, json=payload, stream=True) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if line:
                    yield line.decode('utf-8') + "\n"
    except requests.RequestException as e:
        agentops.log_error(f"Failed to retrieve response: {str(e)}")
        yield f"{{\"error\": \"Failed to retrieve response: {str(e)}\"}}\n"

@agentops.record_function('main')
def main():
    # Example usage of the functions
    client = get_azure_openai_client()
    
    # Assume we have a base64 encoded image
    b64_img = "..."  # Replace with actual base64 encoded image
    
    analysis_result = analyze_image(client, b64_img)
    print("Image Analysis Result:", analysis_result)
    
    # Example of creating a payload and getting a response
    messages = [{"role": "user", "content": "Hello, how are you?"}]
    payload = create_payload(messages)
    
    config = get_openai_config()
    url = f"{config['OPENAI_ENDPOINT']}openai/deployments/{config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": config['AOAI_API_KEY']
    }
    
    response = get_response(url, headers, payload)
    print("API Response:", response)

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        agentops.log_error(str(e))
    finally:
        agentops.end_session('Success')