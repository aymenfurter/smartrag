import base64
from io import BytesIO
import io
from typing import Dict, Any
from flask import jsonify, Response, request
from app.integration.blob_service import initialize_blob_service
from app.integration.azure_openai import create_payload, create_data_source, stream_response, get_openai_config
from app.integration.index_manager import IndexManager, create_index_manager, ContainerNameTooLongError
from werkzeug.datastructures import FileStorage
import requests
from openai import AzureOpenAI
import os
import json

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

    client = AzureOpenAI(
        api_key=config['AOAI_API_KEY'],
        api_version="2024-02-15-preview",
        azure_endpoint=config['OPENAI_ENDPOINT']
    )

    try:
        text = speech_to_text(client, audio_file)
        conversation_history.append({"role": "user", "content": text})
        user_intent = detect_intent(client, conversation_history)
        search_context = search_azure_ai(user_intent, config, index_manager.get_search_index_name())
        gpt_response = get_gpt_response(client, conversation_history, search_context, user_intent, config)
        audio_content = text_to_speech(gpt_response, config)
        response_audio_base64 = base64.b64encode(audio_content).decode('utf-8')

        return jsonify({
            'user_text': text,
            'response': gpt_response,
            'audio': response_audio_base64
        })

    except Exception as e:
        print(f"Error in voice chat: {str(e)}")
        return jsonify({'error': str(e)}), 500

def speech_to_text(client: AzureOpenAI, audio_file: FileStorage) -> str:
    """Convert speech to text using Azure OpenAI's Whisper model."""
    audio_content = audio_file.read()
    
    audio_bytes = io.BytesIO(audio_content)
    
    audio_bytes.name = 'audio.wav'

    result = client.audio.transcriptions.create(
        model="whisper",
        file=audio_bytes,
    )
    
    audio_file.seek(0)
    
    return result.text

def detect_intent(client: AzureOpenAI, conversation_history: list) -> str:
    """Detect user intent from the conversation history."""
    last_user_message = conversation_history[-1]['content'] if conversation_history else ""
    
    intent_system_message = """You are an intent detection system. Your task is to analyze the user's message and determine their primary intent or purpose. Provide a brief, concise description of the intent in 5-10 words."""
    
    intent_messages = [
        {"role": "system", "content": intent_system_message},
        {"role": "user", "content": f"Detect the intent in this message: {last_user_message}"}
    ]
    
    intent_response = client.chat.completions.create(
        model="gpt-4o",
        messages=intent_messages,
        temperature=0,
        max_tokens=50
    )
    
    return intent_response.choices[0].message.content.strip()

def search_azure_ai(query: str, config: Dict[str, str], index: str) -> str:
    """Search Azure AI Search for relevant content."""
    headers = {
        'Content-Type': 'application/json',
        'api-key': config['SEARCH_SERVICE_API_KEY']
    }
    
    body = {
        'search': query,
        'select': 'content',
        'top': 5 
    }
    
    url = f"{config['SEARCH_SERVICE_ENDPOINT']}/indexes/{index}/docs/search?api-version=2021-04-30-Preview"
    
    response = requests.post(url, headers=headers, json=body)
    results = response.json()

    print (results)

    
    context = ""
    for result in results.get('value', []):
        context += result.get('content', '') + "\n\n"
    
    return context.strip()

def get_gpt_response(client: AzureOpenAI, conversation_history: list, search_context: str, user_intent: str, config: Dict[str, str]) -> str:
    """Get a response from GPT based on the conversation history, search context, and user intent."""
    system_message = """You are having a conversation over the phone. Start and do some smalltalk (if the user digs it) at the beginning. Use natural language and respond as someone would in a phone call. Always ask for the model, then give advice. Never ask to contact a professional. YOU ARE The professional. IMPORTANT: Answer in 30-40 words or less. Be concise, natural (be empathetic!), friendly and act as a human. You will be given a document as a reference to help you answer the questions. Never share more than 3 steps with the user, guide them through the information step by step. (And ask if they understood each step)"""

    messages = [
        {"role": "system", "content": system_message},
    ]

    messages.extend(conversation_history)
    last_user_message = conversation_history[-1]['content'] if conversation_history else ""
    messages.append({"role": "user", "content": f"Context: {search_context}\n\nUser Intent: {user_intent}\n\nUser Request: {last_user_message}"})

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.7,
        max_tokens=150
    )

    return response.choices[0].message.content

def text_to_speech(input_text: str, config: Dict[str, str]) -> bytes:
    """Convert text to speech using Azure OpenAI's TTS service."""
    headers = {
        'Content-Type': 'application/json',
        'api-key': config['AOAI_API_KEY']
    }
    
    url = f"{config['OPENAI_ENDPOINT']}/openai/deployments/{config['AZURE_TTS_DEPLOYMENT_NAME']}/audio/speech?api-version=2024-02-15-preview"
    
    body = {
        "input": input_text,
        "voice": "nova",
        "model": config['AZURE_TTS_MODEL_NAME'],
        "response_format": "mp3"
    }

    response = requests.post(url, headers=headers, json=body)
    
    if response.status_code == 200:
        return response.content
    else:
        raise Exception(f"Text-to-speech API error: {response.status_code} - {response.text}")

def intro_message() -> Response:
    """Generate an intro message for the voice chat."""
    try:
        config = get_openai_config()
        response_text = "Hello! I'm your virtual assistant. How can I help you today?"
        audio_content = text_to_speech(response_text, config)
        audio_base64 = base64.b64encode(audio_content).decode('utf-8')
        return jsonify({
            'response': response_text,
            'audio': audio_base64
        })
    except Exception as e:
        print(f"Error in intro message: {str(e)}")
        return jsonify({'error': str(e)}), 500