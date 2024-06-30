import os
from flask import Flask, send_from_directory
from dotenv import load_dotenv
from flask_cors import CORS
from pathlib import Path
from app.routes import configure_routes 

load_dotenv()

app = Flask(__name__, static_folder='static', static_url_path='')
CORS(app) 

UPLOAD_FOLDER = Path('/tmp/uploads')
PROCESSED_FOLDER = Path('/tmp/processed')
app.config['UPLOAD_FOLDER'] = str(UPLOAD_FOLDER)
app.config['PROCESSED_FOLDER'] = str(PROCESSED_FOLDER)
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
PROCESSED_FOLDER.mkdir(parents=True, exist_ok=True)

configure_routes(app)

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    if path != "" and os.path.exists(app.static_folder + '/' + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0')