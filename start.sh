#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
VENV="/Volumes/SATECHI HD/Users/dwkim/streamlit/streamlit-env"

if [ "$1" = "--stop" ]; then
  echo "Stopping servers..."
  kill $(lsof -ti :8080) 2>/dev/null && echo "HTTP server stopped" || echo "HTTP server not running"
  kill $(lsof -ti :8501) 2>/dev/null && echo "Chatbot stopped" || echo "Chatbot not running"
  exit 0
fi

cd "$DIR"

echo "Starting HTTP server on :8080 ..."
python3 -m http.server 8080 &
HTTP_PID=$!

echo "Starting Streamlit chatbot on :8501 ..."
"$VENV/bin/streamlit" run chatbot_app.py --server.port 8501 &
STREAMLIT_PID=$!

echo "---"
echo "HTTP:  http://127.0.0.1:8080"
echo "Chat:  http://127.0.0.1:8501"
echo ""
echo "Stop with:  $0 --stop"
wait
