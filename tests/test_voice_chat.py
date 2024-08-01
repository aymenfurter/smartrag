import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import unittest
from unittest.mock import patch, Mock, MagicMock
import json
import base64
from io import BytesIO
from flask import Flask
from werkzeug.datastructures import FileStorage
from app.query.voice_chat_service import voice_chat_with_data, detect_intent, get_gpt_response, intro_message

class TestVoiceChat(unittest.TestCase):

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['TESTING'] = True
        self.client = self.app.test_client()

    @patch('app.query.voice_chat_service.generate_completion')
    def test_detect_intent(self, mock_generate_completion):
        mock_client = Mock()
        mock_config = {'AZURE_OPENAI_DEPLOYMENT_NAME': 'test_deployment'}
        mock_generate_completion.return_value = "Test intent"
        
        conversation_history = [{"role": "user", "content": "Test message"}]
        result = detect_intent(mock_client, conversation_history, mock_config)
        
        self.assertEqual(result, "Test intent")
        mock_generate_completion.assert_called_once()

    @patch('app.query.voice_chat_service.generate_completion')
    def test_get_gpt_response(self, mock_generate_completion):
        mock_client = Mock()
        mock_config = {'AZURE_OPENAI_DEPLOYMENT_NAME': 'test_deployment'}
        mock_generate_completion.return_value = "Test GPT response"
        
        conversation_history = [{"role": "user", "content": "Test message"}]
        search_context = "Test context"
        user_intent = "Test intent"
        
        result = get_gpt_response(mock_client, conversation_history, search_context, user_intent, mock_config)
        
        self.assertEqual(result, "Test GPT response")
        mock_generate_completion.assert_called_once()

    @patch('app.query.voice_chat_service.get_openai_config')
    @patch('app.query.voice_chat_service.get_azure_openai_client')
    @patch('app.query.voice_chat_service.text_to_speech')
    def test_intro_message(self, mock_text_to_speech, mock_get_client, mock_get_config):
        mock_config = {'AOAI_API_KEY': 'test_key', 'OPENAI_ENDPOINT': 'test_endpoint'}
        mock_get_config.return_value = mock_config
        mock_text_to_speech.return_value = b'test audio content'

        with self.app.test_request_context():
            response = intro_message()

        self.assertEqual(response.status_code, 200)
        response_data = json.loads(response.data)
        self.assertIn('response', response_data)
        self.assertIn('audio', response_data)

if __name__ == '__main__':
    unittest.main()