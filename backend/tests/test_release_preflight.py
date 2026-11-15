"""Check that public safeguards remain intact as the React UI is added."""
from app import create_app


def test_public_safe_docs_and_capabilities_without_research_data():
    app = create_app({
        'TESTING': True,
        'ENVIRONMENT': 'production',
        'ALLOWED_ORIGINS': ['https://aeroscope.example'],
        'PUBLIC_RESULTS_ENABLED': False,
        'ENABLE_GRID_API': False,
    })
    client = app.test_client()
    assert client.get('/api/v1/health').status_code == 200
    caps = client.get('/api/v1/capabilities')
    assert caps.status_code == 200
    assert caps.json['research_results_available'] is False
    assert caps.json['historical_data_only'] is True
    assert client.get('/api/v1/openapi.json').status_code == 200
    assert client.get('/api/v1/overview').status_code == 403
    assert client.get('/api/v1/models/model_a/metrics').status_code == 403
    assert client.get('/api/v1/map/hotspots/model_a').status_code == 403


def test_cors_is_allowlisted_not_wildcard():
    app = create_app({
        'TESTING': True,
        'ENVIRONMENT': 'production',
        'ALLOWED_ORIGINS': ['https://aeroscope.example'],
        'PUBLIC_RESULTS_ENABLED': False,
    })
    client = app.test_client()
    accepted = client.get('/api/v1/health', headers={'Origin': 'https://aeroscope.example'})
    declined = client.get('/api/v1/health', headers={'Origin': 'https://untrusted.example'})
    assert accepted.headers.get('Access-Control-Allow-Origin') == 'https://aeroscope.example'
    assert declined.headers.get('Access-Control-Allow-Origin') is None
