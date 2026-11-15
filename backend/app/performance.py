"""Small, dependency-free JSON compression and request timing for the Flask API.

Data permission gates are enforced independently by the existing app factory.
The timing hook never records query parameters or response bodies.
"""
import gzip
import secrets
import time

from flask import g, request

MIN_GZIP_BYTES = 1024
MAX_GZIP_BYTES = 4 * 1024 * 1024


def install_performance(app):
    """Register headers and conditional gzip compression, without modifying routes."""
    app.config.setdefault('AEROSCOPE_JSON_GZIP', True)

    @app.before_request
    def _start_api_timer():
        if request.path.startswith('/api/'):
            g.aeroscope_request_start = time.perf_counter()

    @app.after_request
    def _finish_api_request(response):
        if not request.path.startswith('/api/'):
            return response

        # For tracing failures without echoing untrusted request IDs.
        response.headers['X-Request-ID'] = secrets.token_hex(8)
        started = getattr(g, 'aeroscope_request_start', None)
        if started is not None:
            ms = max(0, (time.perf_counter() - started) * 1000)
            response.headers['Server-Timing'] = f'app;dur={ms:.1f}'

        # Do not compress errors, streamed files, unsupported encodings, or
        # very small/large payloads. Flask/Werkzeug updates Content-Length
        # when response.set_data() replaces the response body.
        if (not app.config['AEROSCOPE_JSON_GZIP']
            or request.method != 'GET'
            or response.status_code != 200
            or response.direct_passthrough
            or response.mimetype != 'application/json'
            or request.accept_encodings.quality('gzip') <= 0
            or response.headers.get('Content-Encoding')):
            return response

        payload = response.get_data()
        if not MIN_GZIP_BYTES <= len(payload) <= MAX_GZIP_BYTES:
            return response
        compressed = gzip.compress(payload, compresslevel=5)
        if len(compressed) >= len(payload):
            return response
        response.set_data(compressed)
        response.headers['Content-Encoding'] = 'gzip'
        response.vary.add('Accept-Encoding')
        response.headers.pop('ETag', None)
        return response
