import os
import requests
import json
from flask import jsonify, Response
from .blob_service import sanitize_container_name

def create_payload(messages, context, session_state, data_sources, is_streaming):
    if not data_sources:
        return {
            "messages": messages,
            "stream": is_streaming,
            "max_tokens": 1000,
        }

    return {
        "data_sources": data_sources,
        "messages": messages,
        "context": context,
        "stream": is_streaming,
        "max_tokens": 1000,
        "session_state": session_state
    }

def create_data_source(endpoint, key, index_name):
    return {
        "type": "AzureCognitiveSearch",
        "parameters": {
            "endpoint": endpoint,
            "key": key,
            "index_name": index_name
        }
    }

def get_response(url, headers, payload):
    response = requests.post(url, headers=headers, json=payload)
    if response.status_code != 200:
        return {"error": f"Failed to retrieve response: {response.status_code}, {response.text}"}
    return response.json()

def stream_response(url, headers, payload):
    def stream():
        response = requests.post(url, headers=headers, json=payload, stream=True)
        if response.status_code != 200:
            yield json.dumps({"error": f"Failed to retrieve response: {response.status_code}, {response.text}"})
        else:
            for line in response.iter_lines():
                if line:
                    yield line.decode('utf-8') + "\n"
    return Response(stream(), content_type='application/x-ndjson')

def get_openai_config():
    return {
        "OPENAI_ENDPOINT": os.getenv('OPENAI_ENDPOINT'),
        "AOAI_API_KEY": os.getenv('AOAI_API_KEY'),
        "AZURE_OPENAI_DEPLOYMENT_ID": "gpt-4o",
        "SEARCH_SERVICE_ENDPOINT": os.getenv('SEARCH_SERVICE_ENDPOINT'),
        "SEARCH_SERVICE_API_KEY": os.getenv('SEARCH_SERVICE_API_KEY')
    }
