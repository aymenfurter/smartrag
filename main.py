import os
from flask import Flask, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS
from pathlib import Path
from dotenv import load_dotenv
from app.api.routes import configure_routes
import threading
from app.ingestion.upload_queue import process_queue_messages
from app.ingestion.indexing_queue import process_indexing_queue
from app.ingestion.ingestion_job import process_indexing_job
import asyncio
import nest_asyncio

# Apply nest_asyncio to allow nested event loops
nest_asyncio.apply()

# Create a new event loop
loop = asyncio.new_event_loop()
asyncio.set_event_loop(loop)

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

# Add the event loop to the app config
app.config['LOOP'] = loop

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='gevent')

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

def start_indexing_queue_processor():
    asyncio.run(process_indexing_queue(process_indexing_job))

queue_processor_thread = threading.Thread(target=start_queue_processor, daemon=True)
queue_processor_thread.start()

indexing_queue_processor_thread = threading.Thread(target=start_indexing_queue_processor, daemon=True)
indexing_queue_processor_thread.start()

if __name__ == '__main__':
    socketio.run(app, debug=False, use_reloader=False)