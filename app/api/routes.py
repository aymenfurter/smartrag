from typing import Tuple
from flask import Flask, request, jsonify, Response, send_file, current_app
from flask_socketio import SocketIO
from werkzeug.utils import secure_filename
import os
import PyPDF2
from io import BytesIO
import base64
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import ResourceNotFoundError
import asyncio

from app.ingestion.indexing_queue import queue_indexing_job
from app.integration.identity import get_user_id
from app.integration.blob_service import (
    upload_file_to_lz, create_index_containers, list_files_in_container, 
    delete_file_from_blob, list_indexes, delete_index, initialize_blob_service,
    get_blob_url
)
from app.ingestion.upload_queue import queue_file_for_processing
from app.ingestion.ingestion_job import create_ingestion_job, check_job_status, delete_ingestion_index
from app.query.research import research_with_data
from app.query.chat_service import chat_with_data, refine_message
from app.integration.index_manager import create_index_manager, ContainerNameTooLongError, IndexConfig
from app.integration.identity import easyauth_enabled
from app.query.ask import AskService 
from app.ingestion.pdf_processing import get_pdf_page_count
from app.query.voice_chat_service import intro_message, voice_chat_with_data
from app.compare.compare import compare_indexes

def are_operations_restricted():
    return os.getenv('RESTRICT_OPERATIONS', 'false').lower() == 'true'

class RouteConfigurator:
    def __init__(self, app: Flask, socketio: SocketIO, blob_service=None, ingestion_job=None, research=None, chat_service=None, voice_chat_service=None):
        self.app = app
        self.socketio = socketio
        self.blob_service = blob_service or initialize_blob_service()
        self.ingestion_job = ingestion_job or create_ingestion_job
        self.research = research or research_with_data
        self.chat_service = chat_service or chat_with_data
        self.voice_chat_service = voice_chat_service or voice_chat_with_data
        self.refine_service = refine_message
        self.operations_restricted = are_operations_restricted()

    def configure_routes(self) -> Flask:
        self._add_index_routes()
        self._add_file_routes()
        self._add_chat_routes()
        self._add_pdf_route()
        self._add_config_route()
        self._add_ask_route()
        self._add_voice_chat_route()
        self._add_intro_route()
        self._add_compare_route()

        return self.app

    def _add_ask_route(self):
        self.app.route('/ask', methods=['POST'])(self._handle_ask)

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
        self.app.route('/indexes/<index_name>/index/status', methods=['GET'])(self._check_index_status)

    def _add_chat_routes(self):
        self.app.route('/research', methods=['POST'])(self._research)
        self.app.route('/chat', methods=['POST'])(self._chat)
        self.app.route('/refine', methods=['POST'])(self._refine)

    def _add_compare_route(self):
        """Add the comparison endpoint."""
        self.app.route('/compare', methods=['POST'])(self._compare)

    def _compare(self):
        """Handle comparison requests with phased execution."""
        try:
            user_id = get_user_id(request)
            data = request.json

            phase = data.get('phase')
            if phase not in ['generate', 'refine', 'execute']:
                return jsonify({"error": "Invalid phase. Must be 'generate', 'refine', or 'execute'"}), 400

            if not isinstance(data.get('indexes', []), list) or len(data.get('indexes', [])) != 2:
                return jsonify({"error": "Exactly 2 indexes must be provided"}), 400

            is_restricted = data.get('is_restricted', True)
            for index_name in data['indexes']:
                index_manager = self._get_index_manager(user_id, index_name, is_restricted)
                if isinstance(index_manager, tuple):
                    return index_manager

            if phase == 'refine':
                if not data.get('requirements') or not data.get('feedback'):
                    return jsonify({
                        "error": "Refinement phase requires 'requirements' and 'feedback'"
                    }), 400

            elif phase == 'execute':
                if not data.get('requirements'):
                    return jsonify({
                        "error": "Execute phase requires 'requirements'"
                    }), 400

            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            try:
                result = loop.run_until_complete(compare_indexes(data, user_id))
                
                if isinstance(result, Response):
                    return result
                
                return jsonify(result)

            except Exception as e:
                current_app.logger.error(f"Comparison error: {str(e)}")
                return jsonify({"error": str(e)}), 500
            finally:
                loop.close()

        except Exception as e:
            current_app.logger.error(f"Comparison request error: {str(e)}")
            return jsonify({"error": str(e)}), 500


    def _add_voice_chat_route(self):
        @self.app.route('/voice_chat', methods=['POST'])
        def voice_chat():
            user_id = get_user_id(request)
            return voice_chat_with_data(request.form, user_id)

    def _add_intro_route(self):
        self.app.route('/intro', methods=['POST'])(self._intro)

    def _voice_chat(self):
        user_id = get_user_id(request)
        return self.voice_chat_service(request.form, user_id)

    def _add_pdf_route(self):
        self.app.route('/pdf/<index_name>/<path:filename>', methods=['GET'])(self._get_pdf)

    def _intro(self):
        return intro_message()

    def _handle_ask(self):
        user_id = get_user_id(request)
        data = request.json
        ask_service = self._get_ask_service()
        
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            response, status_code = loop.run_until_complete(ask_service.ask_question(data, user_id))
        finally:
            loop.close()
        
        return jsonify(response), status_code
        
    def _get_indexes(self):
        user_id = get_user_id(request)
        indexes = list_indexes(user_id)
        return jsonify({"indexes": indexes}), 200

    def _get_config(self):
        return jsonify({"operationsRestricted": self.operations_restricted, "easyAuthEnabled": easyauth_enabled(request)}), 200

    def _create_index(self):
        if self.operations_restricted:
            return jsonify({"error": "Operation not allowed"}), 403

        user_id = get_user_id(request)
        data = request.get_json()
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

    def _remove_index(self, index_name: str):
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
        
        deletion_errors = []
        
        try:
            delete_index(user_id, index_name, is_restricted)
        except Exception as e:
            deletion_errors.append(f"Error deleting main index: {str(e)}")
        
        try:
            delete_ingestion_index(index_manager.get_ingestion_container())
        except Exception as e:
            deletion_errors.append(f"Error deleting ingestion index: {str(e)}")

        try:
            delete_ingestion_index(index_manager.get_graphrag_ingestion_container())
        except Exception as e:
            deletion_errors.append(f"Error deleting graphrag index: {str(e)}")
        
        if deletion_errors:
            return jsonify({
                "message": "Index deletion partially successful",
                "errors": deletion_errors
            }), 207 
        else:
            return jsonify({"message": "Index deleted successfully"}), 200

    def _upload_file(self, index_name: str):
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
        
        file_bytes = file.read()
        file_buffer = BytesIO(file_bytes)

        num_pages = get_pdf_page_count(file_buffer)

        file_buffer.seek(0)

        blob_url = upload_file_to_lz(file_buffer, filename, user_id, index_name, is_restricted, self.blob_service)

        queue_file_for_processing(filename, user_id, index_name, is_restricted, num_pages, blob_url, is_multimodal)

        return jsonify({
            "message": "File queued for processing",
            "filename": filename,
            "num_pages": num_pages
        }), 202

    def _list_files(self, index_name: str):
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        index_manager = self._get_index_manager(user_id, index_name, is_restricted)
        if isinstance(index_manager, tuple):
            return index_manager

        container_name = index_manager.get_reference_container()
        
        try:
            files = list_files_in_container(container_name, self.blob_service)
            return jsonify({"files": files, "indexed_count": 0 }), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def _research(self):
        data = request.json
        user_id = get_user_id(request)
        return Response(self.research(data, user_id), content_type='application/x-ndjson')

    def _delete_file(self, index_name: str, filename: str):
        if self.operations_restricted:
            return jsonify({"error": "Operation not allowed"}), 403

        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        index_manager = self._get_index_manager(user_id, index_name, is_restricted)
        if isinstance(index_manager, tuple):
            return index_manager

        ingestion_container = index_manager.get_ingestion_container()
        reference_container = index_manager.get_reference_container()
        lz_container = index_manager.get_lz_container()

        try:
            for container_name in [ingestion_container, reference_container, lz_container]:
                file_list = list_files_in_container(container_name, self.blob_service)
                files_to_delete = [f['filename'] for f in file_list if f['filename'].startswith(f"{filename}___") or f['filename'] == filename]
                for file in files_to_delete:
                    delete_file_from_blob(container_name, file, self.blob_service)
            
            return jsonify({"message": f"All pages of {filename} deleted successfully from all containers"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def _index_files(self, index_name: str):
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        index_manager = self._get_index_manager(user_id, index_name, is_restricted)
        if isinstance(index_manager, tuple):
            return index_manager
        ingestion_container = index_manager.get_ingestion_container()
        try:
            queue_indexing_job(ingestion_container, user_id, index_name, is_restricted)
            return jsonify({"status": "initiated", "job_id": ingestion_container, "message": "Indexing job initiated successfully"}), 202
        except Exception as e:
            print(f"Error initiating indexing job: {str(e)}")
            return jsonify({"error": str(e)}), 500

    def _check_index_status(self, index_name: str):
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        index_manager = self._get_index_manager(user_id, index_name, is_restricted)
        if isinstance(index_manager, tuple):
            return index_manager

        ingestion_container = index_manager.get_ingestion_container()

        try:
            result = check_job_status(ingestion_container)
            return jsonify(result), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    def _chat(self):
        user_id = get_user_id(request)
        data = request.json
        return self.chat_service(data, user_id)

    def _voice_chat(self):
        user_id = get_user_id(request)
        data = request.json
        return self.voice_chat_service(data, user_id)

    def _refine(self):
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

    def _validate_index_creation_data(self, data, user_id):
        index_name = data.get('name')
        is_restricted = data.get('is_restricted', True)
        
        if not index_name:
            return jsonify({"error": "Index name is required"}), 400
        
        if len(index_name) > 10 or not index_name.islower():
            return jsonify({"error": "Index name must be max 10 characters and lowercase"}), 400
        
        return IndexConfig(user_id, index_name, is_restricted)
    
    def _get_ask_service(self):
        return AskService(self.blob_service)

    def _get_index_manager(self, user_id: str, index_name: str, is_restricted: bool):
        try:
            index_manager = create_index_manager(user_id, index_name, is_restricted)
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        if not index_manager.user_has_access():
            return jsonify({"error": "Unauthorized access"}), 403

        return index_manager

def configure_routes(app: Flask, socketio: SocketIO, **kwargs) -> Flask:
    route_configurator = RouteConfigurator(app, socketio, **kwargs)
    return route_configurator.configure_routes()