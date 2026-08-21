import http.server
import os

DIRECTORY = os.path.dirname(os.path.abspath(__file__))

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

if __name__ == '__main__':
    with http.server.ThreadingHTTPServer(('127.0.0.1', 8080), Handler) as httpd:
        print("Server running at http://localhost:8080", flush=True)
        httpd.serve_forever()
