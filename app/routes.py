import os
import base64
import time
from flask import request, jsonify, Response
from werkzeug.utils import secure_filename
from .utils import split_pdf_to_pages, get_user_id
from .pdf_processing import convert_pdf_page_to_png
from .blob_service import upload_files_to_blob, create_index_containers, list_files_in_container, delete_file_from_blob, list_indexes, delete_index
from .utils import split_pdf_to_pages, get_user_id
from .doc_intelligence import convert_pdf_page_to_md
from .ingestion_job import create_ingestion_job
from .chat_service import chat_with_data

def configure_routes(app):
    @app.route('/indexes', methods=['GET'])
    def get_indexes():
        indexes = list_indexes()
        return jsonify({"indexes": indexes})

    @app.route('/indexes', methods=['POST'])
    def create_index():
        user_id = get_user_id(request)
        data = request.json
        index_name = data.get('name')
        is_restricted = data.get('is_restricted', True)
        
        if not index_name:
            return jsonify({"error": "Index name is required"}), 400
        
        if len(index_name) > 10 or not index_name.islower():
            return jsonify({"error": "Index name must be max 10 characters and lowercase"}), 400
        
        containers = create_index_containers(user_id, index_name, is_restricted)
        return jsonify({"message": "Index created successfully", "containers": containers}), 201

    @app.route('/indexes/<index_name>', methods=['DELETE'])
    def remove_index(index_name):
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        delete_index(user_id, index_name, is_restricted)
        return jsonify({"message": "Index deleted successfully"}), 200

    @app.route('/indexes/<index_name>/upload', methods=['POST'])
    def upload_file(index_name):
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        
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

            prefix = f"{user_id}-" if is_restricted else "open-"
            ingestion_container = f"{prefix}{index_name}-ingestion"
            reference_container = f"{prefix}{index_name}-reference"

            num_pages = split_pdf_to_pages(file_path, app.config['PROCESSED_FOLDER'], filename)
            reference_file_paths = []
            ingestion_file_paths = []

            for i in range(num_pages):
                page_pdf_path = os.path.join(app.config['PROCESSED_FOLDER'], f"{filename}___Page{i+1}.pdf")
                reference_file_paths.append(page_pdf_path)
                png_path = convert_pdf_page_to_png(page_pdf_path, i, app.config['PROCESSED_FOLDER'], filename)
                reference_file_paths.append(png_path)
                md_path = convert_pdf_page_to_md(page_pdf_path, i, app.config['PROCESSED_FOLDER'], filename)
                ingestion_file_paths.append(md_path)

            upload_files_to_blob(ingestion_container, ingestion_file_paths)
            upload_files_to_blob(reference_container, reference_file_paths)

            return jsonify({"message": "File uploaded and processed successfully"}), 200

    @app.route('/indexes/<index_name>/files', methods=['GET'])
    def list_files(index_name):
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        prefix = f"{user_id}-" if is_restricted else "open-"
        container_name = f"{prefix}{index_name}-reference"
        
        try:
            files = list_files_in_container(container_name)
            base_filenames = {filename.split('___')[0] for filename in files}
            return jsonify({"files": list(base_filenames)}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/indexes/<index_name>/files/<filename>', methods=['DELETE'])
    def delete_file(index_name, filename):
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        prefix = f"{user_id}-" if is_restricted else "open-"
        ingestion_container = f"{prefix}{index_name}-ingestion"
        reference_container = f"{prefix}{index_name}-reference"

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
    def index_files(index_name):
        user_id = get_user_id(request)
        is_restricted = request.args.get('is_restricted', 'true').lower() == 'true'
        prefix = f"{user_id}-" if is_restricted else "open-"
        ingestion_container = f"{prefix}{index_name}-ingestion"

        try:
            create_ingestion_job(ingestion_container)
            return jsonify({"message": "Indexing job created successfully"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    @app.route('/chat', methods=['POST'])
    def chat():
        user_id = get_user_id(request)
        data = request.json
        return chat_with_data(data, user_id)


def handle_file_upload(request, app, folder):
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

        user_id = get_user_id(request)
        containers = create_user_containers(user_id)

        if folder == "folder1":
            ingestion_container = containers[2]
            reference_container = containers[3]
        elif folder == "folder2":
            ingestion_container = containers[4]
            reference_container = containers[5]
        else:
            ingestion_container = containers[0]
            reference_container = containers[1]

        num_pages = split_pdf_to_pages(file_path, app.config['PROCESSED_FOLDER'], filename)
        reference_file_paths = []
        ingestion_file_paths = []

        for i in range(num_pages):
            page_pdf_path = os.path.join(app.config['PROCESSED_FOLDER'], f"{filename}___Page{i+1}.pdf")
            reference_file_paths.append(page_pdf_path)
            png_path = convert_pdf_page_to_png(page_pdf_path, i, app.config['PROCESSED_FOLDER'], filename)
            reference_file_paths.append(png_path)
            md_path = convert_pdf_page_to_md(page_pdf_path, i, app.config['PROCESSED_FOLDER'], filename)
            ingestion_file_paths.append(md_path)

        upload_files_to_blob(ingestion_container, ingestion_file_paths)
        upload_files_to_blob(reference_container, reference_file_paths)

        return jsonify({"message": "File uploaded and processed successfully", "container_name": ingestion_container}), 200

def handle_index_files(request, folder):
    user_id = get_user_id(request)
    containers = create_user_containers(user_id)

    if folder == "folder1":
        ingestion_container = containers[2]
    elif folder == "folder2":
        ingestion_container = containers[4]
    else:
        ingestion_container = containers[0]

    try:
        create_ingestion_job(ingestion_container)
        return jsonify({"message": "Indexing job created successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
