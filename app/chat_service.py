import base64
from io import BytesIO
from typing import Dict, Any, List, Tuple
from flask import jsonify, Response
from .blob_service import initialize_blob_service
from .azure_openai import create_payload, create_data_source, stream_response, get_openai_config
from .index_manager import create_index_manager, ContainerNameTooLongError
import requests

def chat_with_data(data: Dict[str, Any], user_id: str, config: Dict[str, str] = None) -> Response:
    """
    Process a chat request with the given data and user ID.
    """
    messages = data.get("messages", [])
    context = data.get("context", {})
    session_state = data.get("session_state", {})
    index_name = data.get("index_name")
    is_restricted = data.get("is_restricted", True)

    if not messages or not index_name:
        return jsonify({"error": "Messages and index name are required"}), 400

    try:
        index_manager = create_index_manager(user_id, index_name, is_restricted)
    except ContainerNameTooLongError as e:
        return jsonify({"error": str(e)}), 400

    if not index_manager.user_has_access():
        return jsonify({"error": "Unauthorized access"}), 403

    container_name = index_manager.get_ingestion_container()
    
    if config is None:
        config = get_openai_config()
    url = f"{config['OPENAI_ENDPOINT']}/openai/deployments/{config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": config['AOAI_API_KEY']
    }

    data_source = create_data_source(config['SEARCH_SERVICE_ENDPOINT'], config['SEARCH_SERVICE_API_KEY'], container_name)
    payload = create_payload(messages, context, session_state, [data_source], True)

    return stream_response(url, headers, payload)

def refine_message(data: Dict[str, Any], user_id: str, config: Dict[str, str] = None) -> Response:
    """
    Refine a message based on the given data and user ID.
    """
    message = data.get("message")
    citations = data.get("citations", [])
    index_name = data.get("index_name")
    is_restricted = data.get("is_restricted", True)
    original_question = data.get("original_question")

    if not citations:
        return jsonify({"error": "Citations are required"}), 400

    if not message or not index_name or not original_question:
        return jsonify({"error": "Message, index name, and original question are required"}), 400

    try:
        index_manager = create_index_manager(user_id, index_name, is_restricted)
    except ContainerNameTooLongError as e:
        return jsonify({"error": str(e)}), 400

    if not index_manager.user_has_access():
        return jsonify({"error": "Unauthorized access"}), 403

    reference_container = index_manager.get_reference_container()
    
    if config is None:
        config = get_openai_config()
    url = f"{config['OPENAI_ENDPOINT']}/openai/deployments/{config['AZURE_OPENAI_DEPLOYMENT_ID']}/chat/completions?api-version=2024-02-15-preview"
    headers = {
        "Content-Type": "application/json",
        "api-key": config['AOAI_API_KEY']
    }

    refine_messages = create_refine_messages(message, citations, reference_container, original_question)

    payload = create_payload(refine_messages, {}, {}, [], True)
    return stream_response(url, headers, payload)

def create_refine_messages(message: str, citations: List[Dict[str, Any]], reference_container: str, original_question: str) -> List[Dict[str, Any]]:
    """
    Create a list of messages for the refinement process.
    """
    system_message = (
        "You are an AI assistant tasked with answering specific questions based on "
        "additional visual information from documents. Only answer the question provided "
        "based on the information found in the documents. Do not provide new information. "
        "If the answer can't be found in the documents, answer 'No further information found'. "
        f"You must answer the question: {message}"
    )
    
    refine_messages = [{"role": "system", "content": system_message}]

    blob_service_client = initialize_blob_service()
    container_client = blob_service_client.get_container_client(reference_container)

    for citation in citations:
        image_message = process_citation(citation, container_client)
        if image_message:
            refine_messages.append(image_message)

    refine_messages.append({"role": "assistant", "content": f"OK - I am now going to answer the question: {original_question}"})

    return refine_messages

def process_citation(citation: Dict[str, Any], container_client: Any) -> Dict[str, Any] | None:
    """
    Process a single citation and create a message with the image data.
    """
    filepath = citation.get('filepath', '')
    if not filepath:
        return None

    parts = filepath.split('___')
    base_filename = parts[0]
    page_number = parts[1].split('.')[0].replace('Page', '') if len(parts) > 1 else '1'

    png_filename = f"{base_filename}___Page{page_number}.png"

    try:
        blob_client = container_client.get_blob_client(png_filename)
        image_data = blob_client.download_blob().readall()
        base64_image = base64.b64encode(image_data).decode('utf-8')

        return {
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
        }
    except Exception as e:
        print(f"Error processing image {png_filename}: {str(e)}")
        return None