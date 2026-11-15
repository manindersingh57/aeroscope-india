"""AeroScope India preflight: run from backend/ with python -m scripts.release_preflight.

Tests real code with a deliberately synthetic/unavailable analytical service.
Does not upload, publish, or disclose scientific measurements.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
PROJECT = BACKEND.parent


def _check(condition: bool, description: str, failures: list[str]) -> None:
    print(('PASS' if condition else 'FAIL') + ': ' + description)
    if not condition:
        failures.append(description)


def check_policy(failures: list[str]) -> None:
    # Explicit production configuration: users never have to edit .env or copy data
    # into the probe. A service may be absent; protected routes must remain 403.
    from app import create_app

    app = create_app({
        'TESTING': True,
        'ENVIRONMENT': 'production',
        'ALLOWED_ORIGINS': ['https://aeroscope.example'],
        'PUBLIC_RESULTS_ENABLED': False,
        'ENABLE_GRID_API': False,
    })
    client = app.test_client()

    for path in ('/api/v1/health', '/api/v1/capabilities',
                 '/api/v1/openapi.json', '/api/v1/map/layers'):
        response = client.get(path)
        _check(response.status_code == 200, f'Public-safe {path} returns 200', failures)

    protected = (
        '/api/v1/overview',
        '/api/v1/dashboard',
        '/api/v1/location?lat=30.9&lon=75.8',
        '/api/v1/states',
        '/api/v1/state-summaries',
        '/api/v1/hotspots/model_a',
        '/api/v1/map/hotspots/model_a',
        '/api/v1/map/grid?south=29&north=31&west=74&east=77',
        '/api/v1/models/model_a/metrics',
        '/api/v1/models/model_b/pca',
    )
    for path in protected:
        response = client.get(path)
        _check(
            response.status_code == 403
            and response.json is not None
            and response.json.get('error', {}).get('code') == 'public_results_disabled',
            f'Protected {path.split("?")[0]} returns public_results_disabled (403)',
            failures,
        )

    capabilities = client.get('/api/v1/capabilities').json
    _check(capabilities.get('research_results_available') is False,
           'Production capabilities report release disabled', failures)
    _check(capabilities.get('historical_data_only') is True,
           'Production capabilities identify historical data', failures)
    spec = client.get('/api/v1/openapi.json').get_json()
    _check(isinstance(spec, dict) and spec.get('openapi') == '3.0.3',
           'OpenAPI JSON is readable', failures)

    headers = {'Origin': 'https://aeroscope.example'}
    allowed = client.get('/api/v1/health', headers=headers)
    _check(allowed.headers.get('Access-Control-Allow-Origin') == headers['Origin'],
           'Approved React origin receives CORS header', failures)
    rejected = client.get('/api/v1/health', headers={'Origin': 'https://untrusted.example'})
    _check(rejected.headers.get('Access-Control-Allow-Origin') is None,
           'Unapproved origin receives no CORS permission', failures)
    _check(allowed.headers.get('Cache-Control') == 'no-store',
           'API disables response caching', failures)
    _check(allowed.headers.get('X-Content-Type-Options') == 'nosniff',
           'API supplies basic security headers', failures)


def run_command(cmd: list[str], cwd: Path, label: str, failures: list[str]) -> None:
    print(f'\n=== {label} ===', flush=True)
    try:
        result = subprocess.run(cmd, cwd=cwd, check=False)
    except OSError as error:
        print(f'FAIL: {label}: {error}')
        failures.append(label)
        return
    if result.returncode:
        print(f'FAIL: {label} returned {result.returncode}')
        failures.append(label)
    else:
        print(f'PASS: {label}')


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description='Local production-readiness preflight')
    parser.add_argument('--skip-tests', action='store_true',
                        help='Skip pytest; still check release policy and Git')
    parser.add_argument('--skip-git', action='store_true',
                        help='Skip Git index audit (for non-Git test environments)')
    args = parser.parse_args(argv)
    failures: list[str] = []

    print('AeroScope India release preflight (no data upload or publication)')
    try:
        check_policy(failures)
    except Exception as error:
        print(f'FAIL: Application policy probe: {type(error).__name__}: {error}')
        failures.append('Application policy probe')

    if not args.skip_tests:
        run_command([sys.executable, '-m', 'pytest', '-q'], BACKEND,
                    'Full pytest suite', failures)
    if not args.skip_git:
        run_command([sys.executable, '-m', 'scripts.audit_git_data'], BACKEND,
                    'Tracked-file data and secret audit', failures)

    print('\n' + ('FAILED' if failures else 'PASSED') + ' release preflight')
    if failures:
        print('Resolve before publishing:', '; '.join(dict.fromkeys(failures)))
    else:
        print('Technical checks passed. This does NOT establish MOSDAC redistribution rights.')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
