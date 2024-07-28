import os
import unittest
from unittest.mock import patch, MagicMock
from app.ingestion_job import create_ingestion_job, check_job_status

class TestIngestionJob(unittest.TestCase):

    @patch('app.ingestion_job.requests.put')
    def test_create_ingestion_job(self, mock_put):



if __name__ == '__main__':
    unittest.main()
