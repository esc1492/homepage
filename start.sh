#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$1" = "--stop" ]; then
  echo "Stopping HTTP server..."
  kill $(lsof -ti :8080) 2>/dev/null && echo "Stopped" || echo "Not running"
  exit 0
fi

cd "$DIR"
kill $(lsof -ti :8080) 2>/dev/null

echo "Starting HTTP server on :8080 ..."
python3 -m http.server 8080 &

echo "---"
echo "http://127.0.0.1:8080"
echo "Stop with:  $0 --stop"
wait
