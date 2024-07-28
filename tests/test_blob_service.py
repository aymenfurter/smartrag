import unittest
from unittest.mock import Mock, patch
from azure.core.exceptions import ResourceExistsError, ResourceNotFoundError
from app import blob_service
from app.index_manager import IndexManager, create_index_manager

class TestBlobService(unittest.TestCase):

    def setUp(self):
        self.mock_blob_service_client = Mock()
        self.mock_queue_client = Mock()

    def test_create_container(self):
        blob_service.create_container(self.mock_blob_service_client, "test-container")
        self.mock_blob_service_client.create_container.assert_called_once_with("test-container")

    def test_create_container_already_exists(self):
        self.mock_blob_service_client.create_container.side_effect = ResourceExistsError
        with patch('logging.info') as mock_logging_info:
            blob_service.create_container(self.mock_blob_service_client, "test-container")
            mock_logging_info.assert_called_once_with("Container 'test-container' already exists.")

    def test_create_index_containers(self):
        result = blob_service.create_index_containers("user1", "index1", True, self.mock_blob_service_client)
        expected = [
            "user1-index1-ingestion",
            "user1-index1-reference",
            "user1-index1-lz",
            "user1-index1-grdata",
            "user1-index1-grrep",
            "user1-index1-grcache"
        ]
        self.assertEqual(result, expected)
        self.assertEqual(self.mock_blob_service_client.create_container.call_count, 6)

    @patch('app.blob_service.open')
    def test_upload_file_to_blob(self, mock_open):
        mock_container_client = Mock()
        self.mock_blob_service_client.get_container_client.return_value = mock_container_client
        blob_service.upload_file_to_blob("test-container", "file1.txt", "local/path/file1.txt", self.mock_blob_service_client)
        self.mock_blob_service_client.get_blob_client.assert_called_once()

    def test_list_files_in_container(self):
        mock_container_client = Mock()
        self.mock_blob_service_client.get_container_client.return_value = mock_container_client
        mock_blob1 = Mock()
        mock_blob1.name = "file1___page1.pdf"
        mock_blob2 = Mock()
        mock_blob2.name = "file1___page2.pdf"
        mock_blob3 = Mock()
        mock_blob3.name = "file2___page1.pdf"
        mock_container_client.list_blobs.return_value = [mock_blob1, mock_blob2, mock_blob3]
        result = blob_service.list_files_in_container("test-container", self.mock_blob_service_client)
        expected = [{'filename': 'file1', 'total_pages': 2}, {'filename': 'file2', 'total_pages': 1}]
        self.assertEqual(result, expected)

    def test_delete_file_from_blob(self):
        mock_container_client = Mock()
        self.mock_blob_service_client.get_container_client.return_value = mock_container_client
        blob_service.delete_file_from_blob("test-container", "file1.txt", self.mock_blob_service_client)
        mock_container_client.get_blob_client.assert_called_once_with("file1.txt")
        mock_container_client.get_blob_client.return_value.delete_blob.assert_called_once()

    def test_list_indexes(self):
        mock_container1 = Mock()
        mock_container1.name = "open-index1-ingestion"
        mock_container2 = Mock()
        mock_container2.name = "open-index1-reference"
        mock_container3 = Mock()
        mock_container3.name = "user1-index2-ingestion"
        mock_container4 = Mock()
        mock_container4.name = "user1-index2-reference"
        self.mock_blob_service_client.list_containers.return_value = [
            mock_container1, mock_container2, mock_container3, mock_container4
        ]
        result = blob_service.list_indexes("user1", self.mock_blob_service_client)
        expected = [("index1", False), ("index2", True)]
        self.assertEqual(set(result), set(expected))

    def test_delete_index(self):
        blob_service.delete_index("user1", "index1", True, self.mock_blob_service_client)
        self.assertEqual(self.mock_blob_service_client.get_container_client.call_count, 6)
        self.assertEqual(self.mock_blob_service_client.get_container_client.return_value.delete_container.call_count, 6)

    def test_get_blob_url(self):
        mock_container_client = Mock()
        self.mock_blob_service_client.get_container_client.return_value = mock_container_client
        mock_blob_client = Mock()
        mock_container_client.get_blob_client.return_value = mock_blob_client
        mock_blob_client.url = "https://example.com/test-container/blob1"
        result = blob_service.get_blob_url("test-container", "blob1", self.mock_blob_service_client)
        self.assertEqual(result, "https://example.com/test-container/blob1")

if __name__ == '__main__':
    unittest.main()