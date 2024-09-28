#!/bin/bash

gunicorn --worker-class geventwebsocket.gunicorn.workers.GeventWebSocketWorker --workers 1 --bind 0.0.0.0:5000 main:app &
python upload_queue_processor.py &
python indexing_queue_processor.py &

wait -n
exit $?