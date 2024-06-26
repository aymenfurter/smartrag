import os
from typing import Dict, Any, Tuple
from flask import Flask, request, jsonify, Response, send_file
from werkzeug.utils import secure_filename
from io import BytesIO
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError

from .utils import split_pdf_to_pages, get_user_id
from .pdf_processing import convert_pdf_page_to_png
from .blob_service import upload_files_to_blob, create_index_containers, list_files_in_container, delete_file_from_blob, list_indexes, delete_index, initialize_blob_service
from .doc_intelligence import convert_pdf_page_to_md
from .ingestion_job import create_ingestion_job, delete_ingestion_index 
from .research import research_with_data
from .chat_service import chat_with_data, refine_message
from .index_manager import create_index_manager, ContainerNameTooLongError, IndexConfig
from .utils import easyauth_enabled

def are_operations_restricted():
    return os.getenv('RESTRICT_OPERATIONS', 'false').lower() == 'true'

class RouteConfigurator:
    def __init__(self, app: Flask, blob_service=None, doc_intelligence=None, ingestion_job=None, research=None, chat_service=None):
        self.app = app
        self.blob_service = blob_service or initialize_blob_service()
        self.doc_intelligence = doc_intelligence or convert_pdf_page_to_md
        self.ingestion_job = ingestion_job or create_ingestion_job
        self.research = research or research_with_data
        self.chat_service = chat_service or chat_with_data
        self.refine_service = refine_message
        self.operations_restricted = are_operations_restricted()


    def configure_routes(self) -> Flask:
        self._add_index_routes()
        self._add_file_routes()
        self._add_chat_routes()
        self._add_pdf_route()
        self._add_config_route()
        return self.app

    def _add_config_route(self):
        self.app.route('/config', methods=['GET'])(self._get_config)

    def _add_index_routes(self):
        self.app.route('/indexes', methods=['GET'])(self._get_indexes)
        self.app.route('/indexes', methods=['POST'])(self._create_index)
        self.app.route('/indexes/<index_name>', methods=['DELETE'])(self._remove_index)

    def _add_file_routes(self):
        self.app.route('/indexes/<index_name>/upload', methods=['POST'])(self._upload_file)
        self.app.route('/indexes/<index_name>/files', methods=['GET'])(self._list_files)
        self.app.route('/indexes/<index_name>/files/<filename>', methods=['DELETE'])(self._delete_file)
        self.app.route('/indexes/<index_name>/index', methods=['POST'])(self._index_files)

    def _add_chat_routes(self):
        self.app.route('/research', methods=['POST'])(self._research)
        self.app.route('/chat', methods=['POST'])(self._chat)
        self.app.route('/refine', methods=['POST'])(self._refine)

    def _add_pdf_route(self):
        self.app.route('/pdf/<index_name>/<path:filename>', methods=['GET'])(self._get_pdf)

    def _get_indexes(self) -> Tuple[Response, int]:
        user_id = get_user_id(request)
        indexes = list_indexes(user_id)
        return jsonify({"indexes": indexes}), 200

    def _get_config(self):
        return jsonify({"operationsRestricted": self.operations_restricted, "easyAuthEnabled": easyauth_enabled(request)}), 200

    def _create_index(self) -> Tuple[Response, int]:
        if self.operations_restricted:
            return jsonify({"error": "Operation not allowed"}), 403

        user_id = get_user_id(request)
        data = request.json
        index_config = self._validate_index_creation_data(data, user_id)
        
        if isinstance(index_config, tuple): 
            return index_config

        try:
            index_manager = create_index_manager(
                index_config.user_id, 
                index_config.index_name, 
                index_config.is_restricted
            )
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        containers = create_index_containers(
            index_config.user_id, 
            index_config.index_name, 
            index_config.is_restricted
        )
        return jsonify({"message": "Index created successfully", "containers": containers}), 201

    def _remove_index(self, index_name: str) -> Tuple[Response, int]:
        if self.operations_restricted:
            return jsonify({"error": "Operation not allowed"}), 403

        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        try:
            index_manager = create_index_manager(user_id, index_name, is_restricted)
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        if not index_manager.user_has_access():
            return jsonify({"error": "Unauthorized access"}), 403

        delete_index(user_id, index_name, is_restricted)
        delete_ingestion_index(index_manager.get_ingestion_container())
        return jsonify({"message": "Index deleted successfully"}), 200

    def _upload_file(self, index_name: str) -> Tuple[Response, int]:
        if self.operations_restricted:
            return jsonify({"error": "Operation not allowed"}), 403

        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        is_multimodal = request.form.get('multimodal', 'false').lower() == 'true'

        index_manager = self._get_index_manager(user_id, index_name, is_restricted)
        if isinstance(index_manager, tuple):
            return index_manager

        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files['file']
        if file.filename == '' or "___" in file.filename:
            return jsonify({"error": "Invalid file name"}), 400

        filename = secure_filename(file.filename)
        file_path = os.path.join(self.app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)

        ingestion_container = index_manager.get_ingestion_container()
        reference_container = index_manager.get_reference_container()

        num_pages = split_pdf_to_pages(file_path, self.app.config['PROCESSED_FOLDER'], filename)
        reference_file_paths, ingestion_file_paths = self._process_pdf_pages(filename, num_pages, is_multimodal)

        upload_files_to_blob(ingestion_container, ingestion_file_paths, self.blob_service)
        upload_files_to_blob(reference_container, reference_file_paths, self.blob_service)

        return jsonify({"message": "File uploaded and processed successfully"}), 200

    def _list_files(self, index_name: str) -> Tuple[Response, int]:
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        index_manager = self._get_index_manager(user_id, index_name, is_restricted)
        if isinstance(index_manager, tuple):
            return index_manager

        container_name = index_manager.get_reference_container()
        
        try:
            files = list_files_in_container(container_name, self.blob_service)
            base_filenames = {filename.split('___')[0] for filename in files}
            return jsonify({"files": list(base_filenames)}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def _research(self) -> Response:
        data = request.json
        user_id = get_user_id(request)
        return self.research(data, user_id)

    def _delete_file(self, index_name: str, filename: str) -> Tuple[Response, int]:
        if self.operations_restricted:
            return jsonify({"error": "Operation not allowed"}), 403

        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        index_manager = self._get_index_manager(user_id, index_name, is_restricted)
        if isinstance(index_manager, tuple):
            return index_manager

        ingestion_container = index_manager.get_ingestion_container()
        reference_container = index_manager.get_reference_container()

        try:
            for container_name in [ingestion_container, reference_container]:
                file_list = list_files_in_container(container_name, self.blob_service)
                files_to_delete = [f for f in file_list if f.startswith(f"{filename}___")]
                for file in files_to_delete:
                    delete_file_from_blob(container_name, file, self.blob_service)
            
            return jsonify({"message": f"All pages of {filename} deleted successfully from both containers"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def _index_files(self, index_name: str) -> Tuple[Response, int]:
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        index_manager = self._get_index_manager(user_id, index_name, is_restricted)
        if isinstance(index_manager, tuple):
            return index_manager

        ingestion_container = index_manager.get_ingestion_container()

        try:
            status = self.ingestion_job(ingestion_container)
            return jsonify({"message": f"Indexing job {status}"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def _chat(self) -> Response:
        user_id = get_user_id(request)
        data = request.json
        return self.chat_service(data, user_id)

    def _refine(self) -> Response:
        user_id = get_user_id(request)
        data = request.json
        return self.refine_service(data, user_id)

    def _get_pdf(self, index_name: str, filename: str) -> Tuple[Response, int]:
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        index_manager = self._get_index_manager(user_id, index_name, is_restricted)
        if isinstance(index_manager, tuple):
            return index_manager

        container_name = index_manager.get_reference_container()

        try:
            base_filename, page_info = filename.rsplit('___', 1)
            page_number = page_info.split('.')[0].replace('Page', '')
            pdf_filename = f"{base_filename}___Page{page_number}.pdf"

            blob_service_client = self.blob_service
            container_client = blob_service_client.get_container_client(container_name)
            blob_client = container_client.get_blob_client(pdf_filename)

            blob_data = blob_client.download_blob().readall()
            return send_file(
                BytesIO(blob_data),
                mimetype='application/pdf',
                as_attachment=False,
                download_name=pdf_filename
            )
        except ResourceNotFoundError:
            return jsonify({"error": f"PDF file not found: {pdf_filename}"}), 404
        except Exception as e:
            self.app.logger.error(f"Error retrieving PDF: {str(e)}")
            return jsonify({"error": f"Error retrieving PDF: {str(e)}"}), 500

    def _validate_index_creation_data(self, data: Dict[str, Any], user_id: str) -> IndexConfig | Tuple[Response, int]:
        index_name = data.get('name')
        is_restricted = data.get('is_restricted', True)
        
        if not index_name:
            return jsonify({"error": "Index name is required"}), 400
        
        if len(index_name) > 10 or not index_name.islower():
            return jsonify({"error": "Index name must be max 10 characters and lowercase"}), 400
        
        return IndexConfig(user_id, index_name, is_restricted)

    def _get_index_manager(self, user_id: str, index_name: str, is_restricted: bool):
        try:
            index_manager = create_index_manager(user_id, index_name, is_restricted)
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        if not index_manager.user_has_access():
            return jsonify({"error": "Unauthorized access"}), 403

        return index_manager

    def _process_pdf_pages(self, filename: str, num_pages: int, is_multimodal: bool):
        reference_file_paths = []
        ingestion_file_paths = []

        for i in range(num_pages):
            page_pdf_path = os.path.join(self.app.config['PROCESSED_FOLDER'], f"{filename}___Page{i+1}.pdf")
            reference_file_paths.append(page_pdf_path)
            png_path = convert_pdf_page_to_png(page_pdf_path, i, self.app.config['PROCESSED_FOLDER'], filename)
            reference_file_paths.append(png_path)
            md_path = self.doc_intelligence(page_pdf_path, i, self.app.config['PROCESSED_FOLDER'], filename, is_multimodal)
            ingestion_file_paths.append(md_path)

        return reference_file_paths, ingestion_file_paths

def configure_routes(app: Flask, **kwargs) -> Flask:
    route_configurator = RouteConfigurator(app, **kwargs)
    return route_configurator.configure_routes()