import json
import base64

from io import BytesIO
from flask import jsonify
from .blob_service import sanitize_container_name, get_blob_url, initialize_blob_service
from .azure_openai import create_payload, create_data_source, stream_response, get_openai_config
import requests
from flask import Response

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

def refine_message(data, user_id):
    message = data.get("message")
    citations = data.get("citations", [])
    index_name = data.get("index_name")
    is_restricted = data.get("is_restricted", True)
    original_question = data.get("original_question")

    if not citations:
        return jsonify({"error": "Citations are required"}), 400

    if not message or not index_name or not original_question:
        return jsonify({"error": "Message, index name, and original question are required"}), 400

    prefix = f"{user_id}-" if is_restricted else "open-"
    reference_container = sanitize_container_name(f"{prefix}{index_name}-reference")
    
    config = get_openai_config()
    url = f"{config['OPENAI_ENDPOINT']}/openai/deployments/{config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": config['AOAI_API_KEY']
    }

    refine_messages = [
        {"role": "system", "content": "You are an AI assistant tasked with answering specific questions based on additional visual information from documents. Only answer the question provided based on the information found in the documents. Do not provide new information. If the answer can't be found in the documents, answer 'No further information found'. You must answer the question: " + message},
    ]

    blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(reference_container)

    for citation in citations:
        filepath = citation.get('filepath', '')
        if not filepath:
            continue

        parts = filepath.split('___')
        base_filename = parts[0]
        page_number = parts[1].split('.')[0].replace('Page', '') if len(parts) > 1 else '1'

        png_filename = f"{base_filename}___Page{page_number}.png"

        try:
            blob_client = container_client.get_blob_client(png_filename)
            image_data = blob_client.download_blob().readall()
            base64_image = base64.b64encode(image_data).decode('utf-8')

            refine_messages.append({
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": f"Image for {base_filename} (Page {page_number}):"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/png;base64,{base64_image}"
                        }
                    }
                ]
            })
        except Exception as e:
            print(f"Error processing image {png_filename}: {str(e)}")
            continue

    refine_messages.append({"role": "assistant", "content": f"OK - I am now going to answer the question: {original_question}"})

    payload = create_payload(refine_messages, {}, {}, [], True)
    return stream_response(url, headers, payload)
