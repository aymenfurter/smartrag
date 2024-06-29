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

def configure_routes(app: Flask) -> Flask:
    @app.route('/indexes', methods=['GET'])
    def get_indexes() -> Tuple[Response, int]:
        user_id = get_user_id(request)
        indexes = list_indexes(user_id)
        return jsonify({"indexes": indexes}), 200

    @app.route('/indexes', methods=['POST'])
    def create_index() -> Tuple[Response, int]:
        user_id = get_user_id(request)
        data = request.json
        index_config = validate_index_creation_data(data, user_id)
        
        if isinstance(index_config, tuple):  # Error case
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

    @app.route('/indexes/<index_name>', methods=['DELETE'])
    def remove_index(index_name: str) -> Tuple[Response, int]:
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

    @app.route('/indexes/<index_name>/upload', methods=['POST'])
    def upload_file(index_name: str) -> Tuple[Response, int]:
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        is_multimodal = request.form.get('multimodal', 'false').lower() == 'true'

        try:
            index_manager = create_index_manager(user_id, index_name, is_restricted)
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        if not index_manager.user_has_access():
            return jsonify({"error": "Unauthorized access"}), 403
        
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        if "___" in file.filename:
            return jsonify({"error": "File name cannot contain '___'"}), 400

        if file:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            ingestion_container = index_manager.get_ingestion_container()
            reference_container = index_manager.get_reference_container()

            num_pages = split_pdf_to_pages(file_path, app.config['PROCESSED_FOLDER'], filename)
            reference_file_paths = []
            ingestion_file_paths = []

            for i in range(num_pages):
                page_pdf_path = os.path.join(app.config['PROCESSED_FOLDER'], f"{filename}___Page{i+1}.pdf")
                reference_file_paths.append(page_pdf_path)
                png_path = convert_pdf_page_to_png(page_pdf_path, i, app.config['PROCESSED_FOLDER'], filename)
                reference_file_paths.append(png_path)
                md_path = convert_pdf_page_to_md(page_pdf_path, i, app.config['PROCESSED_FOLDER'], filename, is_multimodal)
                ingestion_file_paths.append(md_path)

            upload_files_to_blob(ingestion_container, ingestion_file_paths)
            upload_files_to_blob(reference_container, reference_file_paths)

            return jsonify({"message": "File uploaded and processed successfully"}), 200

    @app.route('/indexes/<index_name>/files', methods=['GET'])
    def list_files(index_name: str) -> Tuple[Response, int]:
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        try:
            index_manager = create_index_manager(user_id, index_name, is_restricted)
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        if not index_manager.user_has_access():
            return jsonify({"error": "Unauthorized access"}), 403

        container_name = index_manager.get_reference_container()
        
        try:
            files = list_files_in_container(container_name)
            base_filenames = {filename.split('___')[0] for filename in files}
            return jsonify({"files": list(base_filenames)}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    @app.route('/research', methods=['POST'])
    def research() -> Response:
        data = request.json
        user_id = get_user_id(request)
        return research_with_data(data, user_id)

    @app.route('/indexes/<index_name>/files/<filename>', methods=['DELETE'])
    def delete_file(index_name: str, filename: str) -> Tuple[Response, int]:
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        try:
            index_manager = create_index_manager(user_id, index_name, is_restricted)
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        if not index_manager.user_has_access():
            return jsonify({"error": "Unauthorized access"}), 403

        ingestion_container = index_manager.get_ingestion_container()
        reference_container = index_manager.get_reference_container()

        try:
            for container_name in [ingestion_container, reference_container]:
                file_list = list_files_in_container(container_name)
                files_to_delete = [f for f in file_list if f.startswith(f"{filename}___")]
                for file in files_to_delete:
                    delete_file_from_blob(container_name, file)
            
            return jsonify({"message": f"All pages of {filename} deleted successfully from both containers"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/indexes/<index_name>/index', methods=['POST'])
    def index_files(index_name: str) -> Tuple[Response, int]:
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        try:
            index_manager = create_index_manager(user_id, index_name, is_restricted)
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        if not index_manager.user_has_access():
            return jsonify({"error": "Unauthorized access"}), 403

        ingestion_container = index_manager.get_ingestion_container()

        try:
            status = create_ingestion_job(ingestion_container)
            return jsonify({"message": f"Indexing job {status}"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/chat', methods=['POST'])
    def chat() -> Response:
        user_id = get_user_id(request)
        data = request.json
        return chat_with_data(data, user_id)

    @app.route('/refine', methods=['POST'])
    def refine() -> Response:
        user_id = get_user_id(request)
        data = request.json
        return refine_message(data, user_id)

    @app.route('/pdf/<index_name>/<path:filename>', methods=['GET'])
    def get_pdf(index_name: str, filename: str) -> Tuple[Response, int]:
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
        try:
            index_manager = create_index_manager(user_id, index_name, is_restricted)
        except ContainerNameTooLongError as e:
            return jsonify({"error": str(e)}), 400

        if not index_manager.user_has_access():
            return jsonify({"error": "Unauthorized access"}), 403

        container_name = index_manager.get_reference_container()

        try:
            base_filename, page_info = filename.rsplit('___', 1)
            page_number = page_info.split('.')[0].replace('Page', '')
            pdf_filename = f"{base_filename}___Page{page_number}.pdf"

            blob_service_client = initialize_blob_service()
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
            app.logger.error(f"Error retrieving PDF: {str(e)}")
            return jsonify({"error": f"Error retrieving PDF: {str(e)}"}), 500

    return app

def validate_index_creation_data(data: Dict[str, Any], user_id: str) -> IndexConfig | Tuple[Response, int]:
    index_name = data.get('name')
    is_restricted = data.get('is_restricted', True)
    
    if not index_name:
        return jsonify({"error": "Index name is required"}), 400
    
    if len(index_name) > 10 or not index_name.islower():
        return jsonify({"error": "Index name must be max 10 characters and lowercase"}), 400
    
    return IndexConfig(user_id, index_name, is_restricted)