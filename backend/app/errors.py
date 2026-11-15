from flask import jsonify
from werkzeug.exceptions import HTTPException


class APIError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "bad_request"):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


def register_error_handlers(app):
    @app.errorhandler(APIError)
    def api_error(err):
        return jsonify({"error": {"code": err.code, "message": str(err)}}), err.status_code

    @app.errorhandler(ValueError)
    def value_error(err):
        return jsonify({"error": {"code": "invalid_input", "message": str(err)}}), 400

    @app.errorhandler(HTTPException)
    def http_error(err):
        return jsonify({"error": {"code": "http_error", "message": err.description}}), err.code

    @app.errorhandler(Exception)
    def server_error(err):
        app.logger.exception("Unexpected backend error")
        return jsonify({"error": {"code": "internal_error", "message": "Internal server error"}}), 500
