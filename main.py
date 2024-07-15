import os
from flask import Flask, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS
from pathlib import Path
from dotenv import load_dotenv
from app.routes import configure_routes
import threading
from app.queue_processor import process_queue_messages

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

socketio = SocketIO(app, cors_allowed_origins="*")

UPLOAD_FOLDER = Path('/tmp/uploads')
PROCESSED_FOLDER = Path('/tmp/processed')
app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['PROCESSED_FOLDER'] = str(PROCESSED_FOLDER)
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
PROCESSED_FOLDER.mkdir(parents=True, exist_ok=True)

configure_routes(app, socketio)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

def start_queue_processor():
    process_queue_messages()

queue_processor_thread = threading.Thread(target=start_queue_processor, daemon=True)
queue_processor_thread.start()

if __name__ == '__main__':
    socketio.run(app, debug=False, use_reloader=False)
