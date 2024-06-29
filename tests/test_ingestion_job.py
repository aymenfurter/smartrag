import unittest
from unittest.mock import patch, MagicMock
from app.ingestion_job import create_ingestion_job, check_job_status, delete_ingestion_index

class TestIngestionJob(unittest.TestCase):

    @patch('app.ingestion_job.requests.put')
    @patch('app.ingestion_job.check_job_status')
    def test_create_ingestion_job(self, mock_check_status, mock_put):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_put.return_value = mock_response
        mock_check_status.return_value = "completed"

        result = create_ingestion_job("test-container")
        self.assertEqual(result, "completed")

    @patch('app.ingestion_job.requests.get')
    def test_check_job_status(self, mock_get):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "succeeded"
        mock_get.return_value = mock_response

        result = check_job_status("http://test.com", {})
        self.assertEqual(result, "completed")

    @patch('app.ingestion_job.requests.delete')
    def test_delete_ingestion_index(self, mock_delete):
        delete_ingestion_index("test-job-id")
        mock_delete.assert_called_once()

if __name__ == '__main__':
    unittest.main()