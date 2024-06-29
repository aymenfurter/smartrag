import unittest
from unittest.mock import Mock, patch
from azure.core.exceptions import ResourceExistsError
from app import blob_service
from app.index_manager import IndexManager, IndexConfig

class TestBlobService(unittest.TestCase):

    def setUp(self):
        self.mock_blob_service_client = Mock()

    def test_create_container(self):
        blob_service.create_container(self.mock_blob_service_client, "test-container")
        self.mock_blob_service_client.create_container.assert_called_once_with("test-container")

    def test_create_container_already_exists(self):
        self.mock_blob_service_client.create_container.side_effect = ResourceExistsError
        with patch('builtins.print') as mock_print:
            blob_service.create_container(self.mock_blob_service_client, "test-container")
            mock_print.assert_called_once_with("Container 'test-container' already exists.")

    def test_create_index_containers(self):
        result = blob_service.create_index_containers("user1", "index1", True, self.mock_blob_service_client)
        expected = ["user1-index1-ingestion", "user1-index1-reference"]
        self.assertEqual(result, expected)
        self.assertEqual(self.mock_blob_service_client.create_container.call_count, 2)

    @patch('app.blob_service.open')
    def test_upload_files_to_blob(self, mock_open):
        mock_container_client = Mock()
        self.mock_blob_service_client.get_container_client.return_value = mock_container_client
        blob_service.upload_files_to_blob("test-container", ["file1.txt", "file2.txt"], self.mock_blob_service_client)
        self.assertEqual(mock_container_client.upload_blob.call_count, 2)

    def test_list_files_in_container(self):
        mock_container_client = Mock()
        self.mock_blob_service_client.get_container_client.return_value = mock_container_client
        mock_blob1 = Mock()
        mock_blob1.name = "file1.txt"
        mock_blob2 = Mock()
        mock_blob2.name = "file2.txt"
        mock_container_client.list_blobs.return_value = [mock_blob1, mock_blob2]
        result = blob_service.list_files_in_container("test-container", self.mock_blob_service_client)
        self.assertEqual(result, ["file1.txt", "file2.txt"])

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
        self.assertEqual(self.mock_blob_service_client.get_container_client.call_count, 2)
        self.assertEqual(self.mock_blob_service_client.get_container_client.return_value.delete_container.call_count, 2)

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