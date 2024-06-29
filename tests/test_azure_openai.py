import unittest
from unittest.mock import patch, MagicMock

from app import azure_openai

class TestAzureOpenAI(unittest.TestCase):

    @patch('app.azure_openai.AzureOpenAI')
    def test_get_azure_openai_client(self, mock_azure_openai):
        client = azure_openai.get_azure_openai_client()
        mock_azure_openai.assert_called_once()
        self.assertIsNotNone(client)

    @patch('app.azure_openai.AzureOpenAI')
    @patch.dict('os.environ', {'AZURE_OPENAI_DEPLOYMENT_NAME': 'test-model'})
    def test_analyze_image(self, mock_azure_openai):
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_response.choices[0].message.content = "Test analysis"
        mock_client.chat.completions.create.return_value = mock_response

        result = azure_openai.analyze_image(mock_client, "base64_image_data")
        self.assertEqual(result, "Test analysis")

    def test_create_payload(self):
        messages = [{"role": "user", "content": "Hello"}]
        payload = azure_openai.create_payload(messages)
        self.assertEqual(payload["messages"], messages)
        self.assertEqual(payload["stream"], False)
        self.assertEqual(payload["max_tokens"], 1000)

    def test_create_data_source(self):
        data_source = azure_openai.create_data_source("endpoint", "key", "index")
        self.assertEqual(data_source["type"], "AzureCognitiveSearch")
        self.assertEqual(data_source["parameters"]["endpoint"], "endpoint")
        self.assertEqual(data_source["parameters"]["key"], "key")
        self.assertEqual(data_source["parameters"]["index_name"], "index")

    @patch('app.azure_openai.requests.post')
    def test_get_response(self, mock_post):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": "success"}
        mock_post.return_value.__enter__.return_value = mock_response

        result = azure_openai.get_response("url", {}, {})
        self.assertEqual(result, {"result": "success"})

    @patch('app.azure_openai.requests.post')
    def test_stream_response(self, mock_post):
        mock_response = MagicMock()
        mock_response.iter_lines.return_value = [b'{"chunk": 1}', b'{"chunk": 2}']
        mock_post.return_value.__enter__.return_value = mock_response

        result = azure_openai.stream_response("url", {}, {})
        self.assertIsInstance(result, azure_openai.Response)

    @patch.dict('os.environ', {
        'OPENAI_ENDPOINT': 'test_endpoint',
        'AOAI_API_KEY': 'test_key',
        'AZURE_OPENAI_DEPLOYMENT_NAME': 'test_deployment',
        'SEARCH_SERVICE_ENDPOINT': 'test_search_endpoint',
        'SEARCH_SERVICE_API_KEY': 'test_search_key'
    })
    def test_get_openai_config(self):
        config = azure_openai.get_openai_config()
        self.assertEqual(config['OPENAI_ENDPOINT'], 'test_endpoint')
        self.assertEqual(config['AOAI_API_KEY'], 'test_key')
        self.assertEqual(config['AZURE_OPENAI_DEPLOYMENT_ID'], 'test_deployment')
        self.assertEqual(config['SEARCH_SERVICE_ENDPOINT'], 'test_search_endpoint')
        self.assertEqual(config['SEARCH_SERVICE_API_KEY'], 'test_search_key')

if __name__ == '__main__':
    unittest.main()