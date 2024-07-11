import os
from flask import Flask, send_from_directory
from flask_socketio import SocketIO
from flask_cors import CORS
from pathlib import Path
from dotenv import load_dotenv
from app.routes import configure_routes
import threading
from app.queue_processor import process_queue_messages
import agentops

# Load environment variables
load_dotenv()

# Initialize AgentOps
AGENTOPS_API_KEY = os.getenv("AGENTOPS_API_KEY")
if not AGENTOPS_API_KEY:
    raise ValueError("AGENTOPS_API_KEY not found in environment variables")

agentops.init(AGENTOPS_API_KEY)

@agentops.record_function('create_app')
def create_app():
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
    
    return app, socketio

app, socketio = create_app()

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
@agentops.record_function('serve')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

@agentops.record_function('start_queue_processor')
def start_queue_processor():
    process_queue_messages()

@agentops.record_function('main')
def main():
    queue_processor_thread = threading.Thread(target=start_queue_processor, daemon=True)
    queue_processor_thread.start()

    socketio.run(app, host='0.0.0.0', debug=True, use_reloader=False)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        agentops.log_error(str(e))
    finally:
        agentops.end_session('Success')