import os
import uuid
from flask import request, jsonify, Response
from werkzeug.utils import secure_filename
from .utils import split_pdf_to_pages
from .pdf_processing import convert_pdf_page_to_png
from .blob_service import upload_files_to_blob, create_user_containers
from .doc_intelligence import convert_pdf_page_to_md
from .ingestion_job import create_ingestion_job
from .chat_service import chat_with_data

def configure_routes(app):
    @app.route('/upload', methods=['POST'])
    def upload_file():
        if 'file' not in request.files:
            return jsonify({"error": "No file part"}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No selected file"}), 400

        if file:
            filename = secure_filename(file.filename)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)

            user_id = request.headers.get('X-MS-CLIENT-PRINCIPAL-NAME', str(uuid.uuid4()))
            ingestion_container, reference_container, new_ingestion_container_created = create_user_containers(user_id)

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

            create_ingestion_job(ingestion_container)

            return jsonify({"message": "File uploaded and processed successfully", "container_name": ingestion_container}), 200

    @app.route('/chat', methods=['POST'])
    def chat():
        user_id = request.headers.get('X-MS-CLIENT-PRINCIPAL-NAME', str(uuid.uuid4()))
        data = request.json
        return chat_with_data(data, user_id)
    
    @app.route('/stream-test', methods=['GET'])
    def stream_test():
        def generate():
            for i in range(10):
                yield f"data: Chunk {i}\n\n"
                time.sleep(1)
        return Response(generate(), content_type='text/event-stream')
