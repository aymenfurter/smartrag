import os
import requests
from flask import Response, jsonify
from .blob_service import sanitize_container_name
import json

def chat_with_data(data, user_id):
    messages = data.get("messages", [])
    context = data.get("context", {})
    session_state = data.get("session_state", {})

    if not messages:
        return jsonify({"error": "Messages are required"}), 400

    container_name = sanitize_container_name(f"{user_id}-ingestion")

    OPENAI_ENDPOINT = os.getenv('OPENAI_ENDPOINT')
    AOAI_API_KEY = os.getenv('AOAI_API_KEY')
    AZURE_OPENAI_DEPLOYMENT_ID = "gpt-4o"
    SEARCH_SERVICE_ENDPOINT = os.getenv('SEARCH_SERVICE_ENDPOINT')
    SEARCH_SERVICE_API_KEY = os.getenv('SEARCH_SERVICE_API_KEY')
    AZURE_AI_SEARCH_INDEX = container_name

    url = f"{OPENAI_ENDPOINT}/openai/deployments/{AZURE_OPENAI_DEPLOYMENT_ID}/chat/completions?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": AOAI_API_KEY
    }
    payload = {
        "data_sources": [
            {
                "type": "AzureCognitiveSearch",
                "parameters": {
                    "endpoint": SEARCH_SERVICE_ENDPOINT,
                    "key": SEARCH_SERVICE_API_KEY,
                    "index_name": AZURE_AI_SEARCH_INDEX
                }
            }
        ],
        "messages": messages,
        "context": context,
        "stream": True,
        "max_tokens": 1000,
        "session_state": session_state
    }

    def stream():
        response = requests.post(url, headers=headers, json=payload, stream=True)
        if response.status_code != 200:
            yield json.dumps({"error": f"Failed to retrieve chat response: {response.status_code}, {response.text}"})
        else:
            for line in response.iter_lines():
                if line:
                    yield line.decode('utf-8') + "\n"

    return Response(stream(), content_type='application/x-ndjson')
