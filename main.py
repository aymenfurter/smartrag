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

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app)

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
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def handle_exception(loop, context):
        msg = context.get("exception", context["message"])
        print(f"Error in indexing queue processor: {msg}")

    try:
        loop.set_exception_handler(handle_exception)
        loop.run_until_complete(process_indexing_queue(process_indexing_job))
    except Exception as e:
        print(f"Indexing queue processor encountered an error: {e}")
    finally:
        try:
            loop.run_until_complete(loop.shutdown_asyncgens())
            pending = asyncio.all_tasks(loop=loop)
            loop.run_until_complete(asyncio.gather(*pending, return_exceptions=True))
        finally:
            loop.close()
        print("Indexing queue processor has shut down.")

queue_processor_thread = threading.Thread(target=start_queue_processor, daemon=True)
queue_processor_thread.start()

indexing_queue_processor_thread = threading.Thread(target=start_indexing_queue_processor, daemon=True)
indexing_queue_processor_thread.start()

def shutdown_threads(signal, frame):
    print("Shutting down threads...")
    print("Waiting for threads to finish...")
    queue_processor_thread.join(timeout=5)
    indexing_queue_processor_thread.join(timeout=5)
    print("Threads shut down, exiting.")
    os._exit(0)

if __name__ == '__main__':
    import signal
    signal.signal(signal.SIGINT, shutdown_threads)
    signal.signal(signal.SIGTERM, shutdown_threads)
    socketio.run(app, host='0.0.0.0', debug=False, use_reloader=False)