import unittest
from unittest.mock import patch, MagicMock
from app.integration.ingestion_job_api import IngestionJobApi

class TestIngestionJobApi(unittest.TestCase):

    def setUp(self):
        # Mock environment variables
        self.env_patcher = patch.dict('os.environ', {
            'OPENAI_ENDPOINT': 'https://example.openai.com',
            'AOAI_API_KEY': 'fake_aoai_key',
            'SEARCH_SERVICE_ENDPOINT': 'https://example.search.windows.net',
            'SEARCH_SERVICE_API_KEY': 'fake_search_key',
            'STORAGE_ACCOUNT_NAME': 'fakestorageaccount',
            'SUBSCRIPTION_ID': 'fake_subscription_id',
            'RESOURCE_GROUP': 'fake_resource_group',
            'ADA_DEPLOYMENT_NAME': 'fake_ada_deployment'
        })
        self.env_patcher.start()
        self.api = IngestionJobApi()

    def tearDown(self):
        self.env_patcher.stop()

    @patch('app.integration.ingestion_job_api.requests.request')
    def test_api_request(self, mock_request):
        mock_response = MagicMock()
        mock_request.return_value = mock_response

        method = 'GET'
        url = 'https://example.com'
        headers = {'Content-Type': 'application/json'}
        json_data = {'key': 'value'}

        response = self.api._api_request(method, url, headers, json_data)

        mock_request.assert_called_once_with(method, url, headers=headers, json=json_data)
        self.assertEqual(response, mock_response)

    @patch('app.integration.ingestion_job_api.IngestionJobApi._api_request')
    def test_create_ingestion_job_success(self, mock_api_request):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_api_request.return_value = mock_response

        result = self.api.create_ingestion_job('test-container')

        self.assertEqual(result, {
            "status": "initiated",
            "job_id": "test-container",
            "message": "Indexing job initiated successfully"
        })

    @patch('app.integration.ingestion_job_api.IngestionJobApi._api_request')
    def test_create_ingestion_job_failure(self, mock_api_request):
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        mock_api_request.return_value = mock_response

        result = self.api.create_ingestion_job('test-container')

        self.assertEqual(result, {
            "status": "error",
            "message": "Failed to create ingestion job: Bad Request"
        })

    @patch('app.integration.ingestion_job_api.IngestionJobApi._api_request')
    def test_get_api_status_completed(self, mock_api_request):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "succeeded"
        mock_api_request.return_value = mock_response

        status = self.api.get_api_status('job-123')

        self.assertEqual(status, "completed")

    @patch('app.integration.ingestion_job_api.IngestionJobApi._api_request')
    def test_get_api_status_failed(self, mock_api_request):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "failed"
        mock_api_request.return_value = mock_response

        status = self.api.get_api_status('job-123')

        self.assertEqual(status, "failed")

    @patch('app.integration.ingestion_job_api.IngestionJobApi._api_request')
    def test_delete_ingestion_index_success(self, mock_api_request):
        mock_response = MagicMock()
        mock_response.status_code = 204
        mock_api_request.return_value = mock_response

        result = self.api.delete_ingestion_index('job-123')

        self.assertEqual(result, {
            "status": "success",
            "message": "Ingestion index job-123 deleted successfully"
        })

    @patch('app.integration.ingestion_job_api.IngestionJobApi._api_request')
    def test_delete_ingestion_index_failure(self, mock_api_request):
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = "Bad Request"
        mock_api_request.return_value = mock_response

        result = self.api.delete_ingestion_index('job-123')

        self.assertEqual(result, {
            "status": "error",
            "message": "Failed to delete ingestion index: Bad Request"
        })

if __name__ == '__main__':
    unittest.main()