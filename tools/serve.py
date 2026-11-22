"""Local development server for the site.

    python tools/serve.py            (serves on http://localhost:5173)

Python's built-in `python -m http.server` only queues 5 connections, so browsers
that open many at once can get "connection reset" errors. This version queues more
and disables caching so you always see your latest changes.
"""
import functools
import http.server
import os
import socket
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173


class Handler(http.server.SimpleHTTPRequestHandler):
    # HTTP/1.1 keeps connections open; on Windows, the 1.0 default can reset
    # connections mid-transfer when a browser loads many files at once.
    protocol_version = "HTTP/1.1"

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):  # keep the console quiet except for errors
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)


class Server(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True
    address_family = socket.AF_INET6

    def server_bind(self):
        # Accept both IPv6 (::1) and IPv4 (127.0.0.1) on "localhost"
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except (AttributeError, OSError):
            pass
        super().server_bind()


if __name__ == "__main__":
    handler = functools.partial(Handler, directory=ROOT)
    with Server(("::", PORT), handler) as httpd:
        print(f"Serving the Steel Surge site at http://localhost:{PORT}  (Ctrl+C to stop)")
        httpd.serve_forever()
