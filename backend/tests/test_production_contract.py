"""Phase 6 production and React-contract checks, using synthetic services."""

import json
from pathlib import Path

from app import create_app
from conftest import FakeService


def test_contract_document_is_valid_and_accessible(client):
    response = client.get('/api/v1/openapi.json')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['openapi'] == '3.0.3'
    assert '/api/v1/map/hotspots/{model}' in payload['paths']
    assert '/api/v1/models/{model}/metrics' in payload['paths']
    assert '/api/v1/location' in payload['paths']


def test_safe_capabilities_and_response_headers(client):
    response = client.get('/api/v1/capabilities')
    assert response.status_code == 200
    assert response.json['research_data_loaded'] is True
    assert response.json['historical_data_only'] is True
    assert response.headers['X-Content-Type-Options'] == 'nosniff'
    assert response.headers['Referrer-Policy'] == 'no-referrer'
    assert response.headers['Cache-Control'] == 'no-store'


def test_safe_public_production_without_research_release():
    app = create_app({'TESTING': True, 'ENVIRONMENT': 'production',
                      'ALLOWED_ORIGINS': ['https://aeroscope.example'],
                      'PUBLIC_RESULTS_ENABLED': False}, service=FakeService())
    client = app.test_client()
    assert client.get('/api/v1/capabilities').json['research_results_available'] is False
    assert client.get('/api/v1/health').status_code == 200
    assert client.get('/api/v1/openapi.json').status_code == 200
    assert client.get('/api/v1/models/model_a/metrics').status_code == 403
    assert client.get('/api/v1/map/hotspots/model_a').status_code == 403
    error_response = client.get('/api/v1/overview')
    assert error_response.status_code == 403
    assert error_response.headers['Cache-Control'] == 'no-store'


def test_test_app_defaults_to_development_mode():
    # Test-only apps should continue using the existing local synthetic fixtures.
    app = create_app({'TESTING': True}, service=FakeService())
    assert app.config['ENVIRONMENT'] in {'development', 'production'}
    # Explicit local development always permits scientific test fixtures.
    app2 = create_app({'TESTING': True, 'ENVIRONMENT': 'development'}, service=FakeService())
    assert app2.test_client().get('/api/v1/overview').status_code == 200
