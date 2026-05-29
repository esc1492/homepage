#!/usr/bin/env python3
"""Static file server."""
import http.server
import os

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    server = http.server.HTTPServer(("0.0.0.0", port), http.server.SimpleHTTPRequestHandler)
    print(f"Server running on http://0.0.0.0:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()
