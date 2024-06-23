import json
from flask import jsonify
from .blob_service import sanitize_container_name
from .azure_openai import create_payload, create_data_source, stream_response, get_openai_config

def chat_with_data(data, user_id):
    messages = data.get("messages", [])
    context = data.get("context", {})
    session_state = data.get("session_state", {})
    index_name = data.get("index_name")
    is_restricted = data.get("is_restricted", True)

    if not messages or not index_name:
        return jsonify({"error": "Messages and index name are required"}), 400

    prefix = f"{user_id}-" if is_restricted else "open-"
    container_name = sanitize_container_name(f"{prefix}{index_name}-ingestion")
    
    config = get_openai_config()
    url = f"{config['OPENAI_ENDPOINT']}/openai/deployments/{config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": config['AOAI_API_KEY']
    }
    data_source = create_data_source(config['SEARCH_SERVICE_ENDPOINT'], config['SEARCH_SERVICE_API_KEY'], container_name)
    payload = create_payload(messages, context, session_state, [data_source], True)
    return stream_response(url, headers, payload)