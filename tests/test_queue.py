import unittest
from unittest.mock import patch, MagicMock

from flask import json
from app.queue_processor import initialize_queue_client, process_queue_messages, queue_file_for_processing 

class TestQueueProcessor(unittest.TestCase):
    @patch('app.queue_processor.initialize_queue_client')
    def test_initialize_queue_client(self, mock_initialize_queue_client):
        mock_queue_client = MagicMock()
        mock_initialize_queue_client.return_value = mock_queue_client

        result = initialize_queue_client()
        self.assertEqual(result, mock_queue_client)

    @patch('app.queue_processor.process_pdf_pages')
    @patch('app.queue_processor.QueueClient')
    def test_process_queue_messages(self, mock_queue_client, mock_process_pdf_pages):
        mock_client_instance = mock_queue_client.return_value
        mock_client_instance.receive_messages.return_value = [
            MagicMock(content=json.dumps({
                "filename": "test.pdf",
                "num_pages": 2,
                "blob_url": "http://example.com/blob",
                "user_id": "user1",
                "index_name": "index1",
                "is_restricted": False,
                "reference_container": "ref_container",
                "ingestion_container": "ingest_container",
                "lz_container": "lz_container"
            }), dequeue_count=1)
        ]

        with patch('app.queue_processor.time.sleep', return_value=None):
            with self.assertRaises(StopIteration):  
                process_queue_messages()
            
            mock_process_pdf_pages.assert_called_once()
            mock_client_instance.delete_message.assert_called_once()

    @patch('app.queue_processor.QueueClient')
    @patch('app.queue_processor.create_index_manager')
    def test_queue_file_for_processing(self, mock_create_index_manager, mock_queue_client):
        mock_index_manager = MagicMock()
        mock_create_index_manager.return_value = mock_index_manager
        mock_queue_client_instance = mock_queue_client.return_value

        queue_file_for_processing("test.pdf", "user1", "index1", False, 2, "http://example.com/blob", False)

        mock_queue_client_instance.send_message.assert_called_once()
        mock_create_index_manager.assert_called_once_with("user1", "index1", False)

if __name__ == '__main__':
    unittest.main()