import os
import requests
import json
from flask import jsonify, Response
from openai import AzureOpenAI

def get_azure_openai_client():
    return AzureOpenAI(
        api_key=os.getenv("AOAI_API_KEY"),
        api_version="2024-02-15-preview",
        azure_endpoint=os.getenv("OPENAI_ENDPOINT")
    )

def analyze_image(client, b64_img):
    prompt = """
    Analyze the provided visual content (image or graph) in detail and provide a concise description in 5-6 sentences without any markdown, headings, or new lines:
    1. Summarize the main information or message conveyed.
    2. Describe key elements, objects, or data points present.
    3. For charts/graphs, identify the type, explain axes, labels, and legend if applicable, and provide a brief trend analysis or key takeaways.
    4. For images, describe the setting, background, and notable objects, and identify any text or captions within the image.
    5. Explain how this visual relates to or enhances the surrounding context and suggest the likely purpose for including this visual in the document.
    """
    response = client.chat.completions.create(
        model=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
        messages=[
            {"role": "system", "content": prompt},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Analyze this image:"},
                    {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64_img}"}}
                ]
            }
        ],
        max_tokens=1000
    )
    return response.choices[0].message.content.strip()

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
        "AZURE_OPENAI_DEPLOYMENT_ID": os.getenv('AZURE_OPENAI_DEPLOYMENT_NAME'),
        "SEARCH_SERVICE_ENDPOINT": os.getenv('SEARCH_SERVICE_ENDPOINT'),
        "SEARCH_SERVICE_API_KEY": os.getenv('SEARCH_SERVICE_API_KEY')
    }