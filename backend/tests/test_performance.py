"""Verify API performance hooks do not change JSON or publication safeguards."""
import gzip
import json

from app import create_app
from conftest import FakeService


def test_request_headers_and_uncached_research(client):
    r = client.get('/api/v1/health')
    assert r.status_code == 200
    assert r.headers['Cache-Control'] == 'no-store'
    assert r.headers['X-Content-Type-Options'] == 'nosniff'
    assert len(r.headers['X-Request-ID']) == 16
    assert r.headers['Server-Timing'].startswith('app;dur=')
    assert r.headers.get('Content-Encoding') is None


def test_large_openapi_is_compressed_only_when_requested(client):
    plain = client.get('/api/v1/openapi.json')
    compressed = client.get('/api/v1/openapi.json', headers={'Accept-Encoding': 'gzip'})
    assert plain.status_code == compressed.status_code == 200
    assert 'Content-Encoding' not in plain.headers
    assert compressed.headers.get('Content-Encoding') == 'gzip'
    assert 'Accept-Encoding' in compressed.headers.get('Vary', '')
    assert gzip.decompress(compressed.data) == plain.data
    assert json.loads(gzip.decompress(compressed.data))['openapi'] == '3.0.3'
    assert compressed.headers['Cache-Control'] == 'no-store'


def test_disabled_gzip_setting(client):
    app = create_app({'TESTING': True, 'ENVIRONMENT': 'development',
                      'AEROSCOPE_JSON_GZIP': False}, service=FakeService())
    r = app.test_client().get('/api/v1/openapi.json',
                              headers={'Accept-Encoding': 'gzip'})
    assert r.status_code == 200
    assert 'Content-Encoding' not in r.headers


def test_public_results_policy_still_blocks_data_under_gzip():
    app = create_app({'TESTING': True, 'ENVIRONMENT': 'production',
                      'ALLOWED_ORIGINS': ['https://aeroscope.example'],
                      'PUBLIC_RESULTS_ENABLED': False}, service=FakeService())
    r = app.test_client().get('/api/v1/overview',
                              headers={'Accept-Encoding': 'gzip'})
    assert r.status_code == 403
    assert r.json['error']['code'] == 'public_results_disabled'
    assert 'Content-Encoding' not in r.headers
    assert r.headers['Cache-Control'] == 'no-store'
