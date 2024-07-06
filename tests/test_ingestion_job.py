import os
import unittest
from unittest.mock import patch, MagicMock
from app.ingestion_job import create_ingestion_job, check_job_status

class TestIngestionJob(unittest.TestCase):

    @patch('app.ingestion_job.requests.put')
    def test_create_ingestion_job(self, mock_put):
        # Mock response for the PUT request
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "status": "initiated",
            "job_id": "test-container",
            "message": "Indexing job initiated successfully"
        }
        mock_put.return_value = mock_response

        result = create_ingestion_job("test-container")
        expected_result = {
            "status": "initiated",
            "job_id": "test-container",
            "message": "Indexing job initiated successfully"
        }
        self.assertEqual(result, expected_result)

    @patch('app.ingestion_job.requests.get')
    def test_check_job_status(self, mock_get):
        # Mock response for the GET request
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = '{"succeeded": true}'
        mock_get.return_value = mock_response

        result = check_job_status("test-container")
        expected_result = {
            "status": "completed",
            "message": "Indexing job completed successfully"
        }
        self.assertEqual(result, expected_result)

    @patch('app.ingestion_job.requests.get')
    def test_check_job_status_error(self, mock_get):
        # Mock response for the GET request
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.text = '{"error":{"code":"BadRequest","message":"Job id test-container does not exist in association with the used resource."}}'
        mock_get.return_value = mock_response

        result = check_job_status("test-container")
        expected_result = {
            "status": "error",
            "message": 'Error checking job status: {"error":{"code":"BadRequest","message":"Job id test-container does not exist in association with the used resource."}}'
        }
        self.assertEqual(result, expected_result)

if __name__ == '__main__':
    unittest.main()
