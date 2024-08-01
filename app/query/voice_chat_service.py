import base64
import json
from typing import Dict, Any
from flask import jsonify, Response, request
from app.integration.blob_service import initialize_blob_service
from app.integration.azure_openai import (
    get_azure_openai_client,
    get_openai_config,
    speech_to_text,
    text_to_speech,
    generate_completion
)
from app.integration.azure_aisearch import AzureAISearch
from app.integration.index_manager import create_index_manager, ContainerNameTooLongError
from werkzeug.datastructures import FileStorage
import os

def voice_chat_with_data(data: Dict[str, Any], user_id: str, config: Dict[str, str] = None) -> Response:
    """
    Process a voice chat request with the given data and user ID.
    """
    audio_file = request.files.get('audio')
    index_name = data.get('index_name')
    is_restricted = data.get('is_restricted', 'true').lower() == 'true'
    conversation_history = json.loads(data.get('conversation_history', '[]'))

    if not audio_file or not index_name:
        return jsonify({"error": "Audio file and index name are required"}), 400

    try:
        index_manager = create_index_manager(user_id, index_name, is_restricted)
    except ContainerNameTooLongError as e:
        return jsonify({"error": str(e)}), 400

    if not index_manager.user_has_access():
        return jsonify({"error": "Unauthorized access"}), 403

    if config is None:
        config = get_openai_config()

    client = get_azure_openai_client(
        api_key=config['AOAI_API_KEY'],
        azure_endpoint=config['OPENAI_ENDPOINT']
    )

    ai_search = AzureAISearch(config)

    try:
        text = speech_to_text(client, audio_file)
        conversation_history.append({"role": "user", "content": text})
        user_intent = detect_intent(client, conversation_history, config)
        search_context = ai_search.search(user_intent, index_manager.get_search_index_name())
        gpt_response = get_gpt_response(client, conversation_history, search_context, user_intent, config)
        audio_content = text_to_speech(client, gpt_response, config)
        response_audio_base64 = base64.b64encode(audio_content).decode('utf-8')

        return jsonify({
            'user_text': text,
            'response': gpt_response,
            'audio': response_audio_base64
        })

    except Exception as e:
        print(f"Error in voice chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

def detect_intent(client: Any, conversation_history: list, config: Dict[str, str]) -> str:
    """Detect user intent from the conversation history."""
    last_user_message = conversation_history[-1]['content'] if conversation_history else ""
    
    intent_system_message = """You are an intent detection system. Your task is to analyze the user's message and determine their primary intent or purpose. Provide a brief, concise description of the intent in 5-10 words."""
    
    intent_messages = [
        {"role": "system", "content": intent_system_message},
        {"role": "user", "content": f"Detect the intent in this message: {last_user_message}"}
    ]
    
    intent_response = generate_completion(
        client,
        intent_messages,
        config['AZURE_OPENAI_DEPLOYMENT_NAME'],
        temperature=0,
        max_tokens=50
    )
    
    return intent_response.strip()

def get_gpt_response(client: Any, conversation_history: list, search_context: str, user_intent: str, config: Dict[str, str]) -> str:
    """Get a response from GPT based on the conversation history, search context, and user intent."""
    system_message = """You are having a conversation over the phone. Use natural language and respond as someone would in a phone call. IMPORTANT: Answer in 30-40 words or less. Be concise, natural (be empathetic!), friendly and act as a human. You will be given a document as a reference to help you answer the questions. Never share more than 3 steps with the user, guide them through the information step by step. (And ask if they understood each step)"""

    messages = [
        {"role": "system", "content": system_message},
    ]

    messages.extend(conversation_history)
    last_user_message = conversation_history[-1]['content'] if conversation_history else ""
    messages.append({"role": "user", "content": f"Context: {search_context}\n\nUser Intent: {user_intent}\n\nUser Request: {last_user_message}"})

    response = generate_completion(
        client,
        messages,
        config['AZURE_OPENAI_DEPLOYMENT_NAME'],
        temperature=0.7,
        max_tokens=150
    )

    return response

def intro_message() -> Response:
    """Generate an intro message for the voice chat."""
    try:
        config = get_openai_config()
        client = get_azure_openai_client(
            api_key=config['AOAI_API_KEY'],
            azure_endpoint=config['OPENAI_ENDPOINT']
        )
        response_text = "Hello! I'm your virtual assistant. How can I help you today?"
        audio_content = text_to_speech(client, response_text, config)
        audio_base64 = base64.b64encode(audio_content).decode('utf-8')
        return jsonify({
            'response': response_text,
            'audio': audio_base64
        })
    except Exception as e:
        print(f"Error in intro message: {str(e)}")
        return jsonify({'error': str(e)}), 500