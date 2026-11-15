"""WSGI entrypoint: gunicorn wsgi:app (from backend directory)."""
from app import create_app
app = create_app()
