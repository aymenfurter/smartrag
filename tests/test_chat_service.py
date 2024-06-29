import unittest
from unittest.mock import patch, Mock
from flask import Flask
from app.chat_service import chat_with_data, refine_message, create_refine_messages, process_citation
from app.index_manager import IndexManager, IndexConfig, ContainerNameTooLongError

class TestChatService(unittest.TestCase):

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['TESTING'] = True

    @patch('app.chat_service.create_refine_messages')
    @patch('app.chat_service.create_payload')
    @patch('app.chat_service.stream_response')
    def test_refine_message_success(self, mock_stream_response, mock_create_payload, mock_create_refine_messages):
        mock_create_refine_messages.return_value = ['test_refine_message']
        mock_create_payload.return_value = {'test': 'payload'}
        mock_stream_response.return_value = 'stream_response'

        with self.app.test_request_context():
            data = {
                'message': 'test message',
                'citations': [{'test': 'citation'}],
                'index_name': 'test_index',
                'is_restricted': False,  # Set to False to ensure access
                'original_question': 'test question'
            }
            config = {
                'OPENAI_ENDPOINT': 'http://test.com',
                'AZURE_OPENAI_DEPLOYMENT_ID': 'test_deployment',
                'AOAI_API_KEY': 'test_key'
            }
            response = refine_message(data, 'test_user', config)

        self.assertEqual(response, 'stream_response')
        mock_stream_response.assert_called_once()

    @patch('app.chat_service.create_refine_messages')
    @patch('app.chat_service.create_payload')
    @patch('app.chat_service.stream_response')
    def test_refine_message_unauthorized(self, mock_stream_response, mock_create_payload, mock_create_refine_messages):
        with self.app.test_request_context():
            data = {
                'message': 'test message',
                'citations': [{'test': 'citation'}],
                'index_name': 'test_index',
                'is_restricted': True,
                'original_question': 'test question'
            }
            config = {
                'OPENAI_ENDPOINT': 'http://test.com',
                'AZURE_OPENAI_DEPLOYMENT_ID': 'test_deployment',
                'AOAI_API_KEY': 'test_key'
            }
            response, status_code = refine_message(data, 'unauthorized_user', config)

        self.assertEqual(status_code, 403)
        self.assertIn('error', response.json)
        self.assertEqual(response.json['error'], 'Unauthorized access')
        mock_stream_response.assert_not_called()

    def test_chat_with_data_container_name_too_long(self):
        with self.app.test_request_context():
            data = {
                'messages': ['test message'],
                'index_name': 'a' * 100,  # This should cause ContainerNameTooLongError
                'is_restricted': True
            }
            response, status_code = chat_with_data(data, 'test_user')

        self.assertEqual(status_code, 400)
        self.assertIn('error', response.json)
        self.assertIn('too long', response.json['error'])

    def test_refine_message_container_name_too_long(self):
        with self.app.test_request_context():
            data = {
                'message': 'test message',
                'citations': [{'test': 'citation'}],
                'index_name': 'a' * 100,  # This should cause ContainerNameTooLongError
                'is_restricted': True,
                'original_question': 'test question'
            }
            response, status_code = refine_message(data, 'test_user')

        self.assertEqual(status_code, 400)
        self.assertIn('error', response.json)
        self.assertIn('too long', response.json['error'])

    @patch('app.chat_service.initialize_blob_service')
    @patch('app.chat_service.process_citation')
    def test_create_refine_messages(self, mock_process_citation, mock_initialize_blob_service):
        mock_container_client = Mock()
        mock_initialize_blob_service.return_value.get_container_client.return_value = mock_container_client

        mock_process_citation.return_value = {'role': 'user', 'content': 'test_image_message'}

        message = 'test message'
        citations = [{'test': 'citation1'}, {'test': 'citation2'}]
        reference_container = 'test_container'
        original_question = 'test question'

        result = create_refine_messages(message, citations, reference_container, original_question)

        self.assertEqual(len(result), 4)  # system message + 2 citations + assistant message
        self.assertIn(message, result[0]['content'])
        self.assertEqual(result[1], {'role': 'user', 'content': 'test_image_message'})
        self.assertEqual(result[2], {'role': 'user', 'content': 'test_image_message'})
        self.assertIn(original_question, result[3]['content'])

    def test_process_citation(self):
        mock_container_client = Mock()
        mock_blob_client = Mock()
        mock_container_client.get_blob_client.return_value = mock_blob_client
        mock_blob_client.download_blob.return_value.readall.return_value = b'test_image_data'

        citation = {'filepath': 'test_file___Page1.pdf'}
        result = process_citation(citation, mock_container_client)

        self.assertIsNotNone(result)
        self.assertEqual(result['role'], 'user')
        self.assertEqual(len(result['content']), 2)
        self.assertEqual(result['content'][0]['type'], 'text')
        self.assertEqual(result['content'][1]['type'], 'image_url')
        self.assertIn('data:image/png;base64,', result['content'][1]['image_url']['url'])

if __name__ == '__main__':
    unittest.main()