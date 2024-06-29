import unittest
from unittest.mock import patch, MagicMock
from flask import Flask
from werkzeug.datastructures import FileStorage
from io import BytesIO
from app.routes import RouteConfigurator, IndexConfig
from app.index_manager import ContainerNameTooLongError

class TestRouteConfigurator(unittest.TestCase):

    def setUp(self):
        self.app = Flask(__name__)
        self.app.config['TESTING'] = True
        self.app.config['UPLOAD_FOLDER'] = '/tmp'
        self.app.config['PROCESSED_FOLDER'] = '/tmp'
        self.client = self.app.test_client()

        self.mock_blob_service = MagicMock()
        self.mock_doc_intelligence = MagicMock()
        self.mock_ingestion_job = MagicMock()
        self.mock_research = MagicMock()
        self.mock_chat_service = MagicMock()

        self.route_configurator = RouteConfigurator(
            self.app,
            blob_service=self.mock_blob_service,
            doc_intelligence=self.mock_doc_intelligence,
            ingestion_job=self.mock_ingestion_job,
            research=self.mock_research,
            chat_service=self.mock_chat_service
        )
        self.route_configurator.configure_routes()

    @patch('app.routes.get_user_id')
    @patch('app.routes.list_indexes')
    def test_get_indexes(self, mock_list_indexes, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        mock_list_indexes.return_value = [{'name': 'index1', 'restricted': True}]
        response = self.client.get('/indexes')
        self.assertEqual(response.status_code, 200)
        self.assertIn('indexes', response.json)
        self.assertEqual(len(response.json['indexes']), 1)

    @patch('app.routes.get_user_id')
    @patch('app.routes.create_index_containers')
    def test_create_index(self, mock_create_index_containers, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        mock_create_index_containers.return_value = ['container1', 'container2']
        response = self.client.post('/indexes', json={'name': 'testindex', 'is_restricted': True})
        self.assertEqual(response.status_code, 201)
        self.assertIn('containers', response.json)

    @patch('app.routes.get_user_id')
    def test_create_index_invalid_name(self, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        response = self.client.post('/indexes', json={'name': 'INVALID', 'is_restricted': True})
        self.assertEqual(response.status_code, 400)
        self.assertIn('error', response.json)

    @patch('app.routes.get_user_id')
    @patch('app.routes.create_index_manager')
    @patch('app.routes.delete_index')
    @patch('app.routes.delete_ingestion_index')
    def test_remove_index(self, mock_delete_ingestion_index, mock_delete_index, mock_create_index_manager, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        mock_index_manager = MagicMock()
        mock_index_manager.user_has_access.return_value = True
        mock_index_manager.get_ingestion_container.return_value = 'test_container'
        mock_create_index_manager.return_value = mock_index_manager
        
        response = self.client.delete('/indexes/testindex?is_restricted=true')
        self.assertEqual(response.status_code, 200)
        mock_delete_index.assert_called_once()
        mock_delete_ingestion_index.assert_called_once()

    @patch('app.routes.get_user_id')
    @patch('app.routes.create_index_manager')
    def test_remove_index_unauthorized(self, mock_create_index_manager, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        mock_index_manager = MagicMock()
        mock_index_manager.user_has_access.return_value = False
        mock_create_index_manager.return_value = mock_index_manager
        
        response = self.client.delete('/indexes/testindex?is_restricted=true')
        self.assertEqual(response.status_code, 403)

    @patch('app.routes.get_user_id')
    @patch('app.routes.create_index_manager')
    @patch('app.routes.secure_filename')
    @patch('app.routes.split_pdf_to_pages')
    @patch('app.routes.convert_pdf_page_to_png')
    @patch('app.routes.convert_pdf_page_to_md')
    @patch('app.routes.upload_files_to_blob')
    def test_upload_file(self, mock_upload_files, mock_convert_md, mock_convert_png, mock_split_pdf, mock_secure_filename, mock_create_index_manager, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        mock_secure_filename.return_value = 'test.pdf'
        mock_split_pdf.return_value = 1
        mock_index_manager = MagicMock()
        mock_index_manager.user_has_access.return_value = True
        mock_index_manager.get_ingestion_container.return_value = 'ingestion_container'
        mock_index_manager.get_reference_container.return_value = 'reference_container'
        mock_create_index_manager.return_value = mock_index_manager
        mock_convert_png.return_value = '/tmp/test___Page1.png'
        mock_convert_md.return_value = '/tmp/test___Page1.md'

        with self.app.test_request_context():
            file = FileStorage(
                stream=BytesIO(b"my file contents"),
                filename="test.pdf",
                content_type="application/pdf",
            )
            response = self.client.post('/indexes/testindex/upload', data={'file': file})
            self.assertEqual(response.status_code, 200)

    @patch('app.routes.get_user_id')
    @patch('app.routes.create_index_manager')
    @patch('app.routes.list_files_in_container')
    def test_list_files(self, mock_list_files, mock_create_index_manager, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        mock_index_manager = MagicMock()
        mock_index_manager.user_has_access.return_value = True
        mock_index_manager.get_reference_container.return_value = 'reference_container'
        mock_create_index_manager.return_value = mock_index_manager
        mock_list_files.return_value = ['file1___Page1.pdf', 'file2___Page1.pdf']
        
        with self.app.test_request_context():
            response = self.client.get('/indexes/testindex/files')
        
        self.assertEqual(response.status_code, 200)
        self.assertIn('files', response.json)
        self.assertEqual(len(response.json['files']), 2)
        mock_list_files.assert_called_once_with('reference_container', self.route_configurator.blob_service)

    @patch('app.routes.get_user_id')
    @patch('app.routes.create_index_manager')
    def test_delete_file(self, mock_create_index_manager, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        mock_index_manager = MagicMock()
        mock_index_manager.user_has_access.return_value = True
        mock_index_manager.get_ingestion_container.return_value = 'ingestion_container'
        mock_index_manager.get_reference_container.return_value = 'reference_container'
        mock_create_index_manager.return_value = mock_index_manager
        self.mock_blob_service.return_value.list_files_in_container.return_value = ['file1___Page1.pdf']
        
        response = self.client.delete('/indexes/testindex/files/file1')
        self.assertEqual(response.status_code, 200)

    @patch('app.routes.get_user_id')
    @patch('app.routes.create_index_manager')
    def test_index_files(self, mock_create_index_manager, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        mock_index_manager = MagicMock()
        mock_index_manager.user_has_access.return_value = True
        mock_index_manager.get_ingestion_container.return_value = 'ingestion_container'
        mock_create_index_manager.return_value = mock_index_manager
        self.mock_ingestion_job.return_value = 'completed'
        
        response = self.client.post('/indexes/testindex/index')
        self.assertEqual(response.status_code, 200)

    @patch('app.routes.get_user_id')
    def test_research(self, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        self.mock_research.return_value = MagicMock(status_code=200)
        response = self.client.post('/research', json={'question': 'test question'})
        self.assertEqual(response.status_code, 200)

    @patch('app.routes.get_user_id')
    def test_chat(self, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        self.mock_chat_service.return_value = MagicMock(status_code=200)
        response = self.client.post('/chat', json={'message': 'test message'})
        self.assertEqual(response.status_code, 200)

    @patch('app.routes.get_user_id')
    def test_refine(self, mock_get_user_id):
        mock_get_user_id.return_value = 'test_user'
        self.route_configurator.refine_service = MagicMock(return_value=MagicMock(status_code=200))
        response = self.client.post('/refine', json={'message': 'test message'})
        self.assertEqual(response.status_code, 200)

    def test_validate_index_creation_data_invalid(self):
        with self.app.app_context():
            data = {'name': 'INVALID', 'is_restricted': True}
            result = self.route_configurator._validate_index_creation_data(data, 'test_user')
            self.assertIsInstance(result, tuple)
            self.assertEqual(result[1], 400)

    @patch('app.routes.create_index_manager')
    def test_get_index_manager_valid(self, mock_create_index_manager):
        mock_index_manager = MagicMock()
        mock_index_manager.user_has_access.return_value = True
        mock_create_index_manager.return_value = mock_index_manager
        
        with self.app.app_context():
            result = self.route_configurator._get_index_manager('test_user', 'testindex', True)
            self.assertEqual(result, mock_index_manager)

    @patch('app.routes.create_index_manager')
    def test_get_index_manager_unauthorized(self, mock_create_index_manager):
        mock_index_manager = MagicMock()
        mock_index_manager.user_has_access.return_value = False
        mock_create_index_manager.return_value = mock_index_manager
        
        with self.app.app_context():
            result = self.route_configurator._get_index_manager('test_user', 'testindex', True)
            self.assertIsInstance(result, tuple)
            self.assertEqual(result[1], 403)

    @patch('app.routes.create_index_manager')
    def test_get_index_manager_name_too_long(self, mock_create_index_manager):
        mock_create_index_manager.side_effect = ContainerNameTooLongError("Name too long")
        
        with self.app.app_context():
            result = self.route_configurator._get_index_manager('test_user', 'testindex', True)
            self.assertIsInstance(result, tuple)
            self.assertEqual(result[1], 400)

if __name__ == '__main__':
    unittest.main()