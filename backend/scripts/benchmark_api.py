"""Gentle sequential HTTP benchmark; defaults to metadata-only public endpoints.

Examples (from backend/):
  python -m scripts.benchmark_api
  python -m scripts.benchmark_api --requests 10
  python -m scripts.benchmark_api --research --requests 5
  python -m scripts.benchmark_api --base-url https://YOUR-SERVICE.onrender.com

--research works only for an explicitly local server and never prints data.
"""
import argparse
import gzip
import ipaddress
import json
import math
import statistics
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlsplit

DEFAULT_ROUTES = (
    '/api/v1/health',
    '/api/v1/capabilities',
    '/api/v1/map/layers',
    '/api/v1/openapi.json',
)
RESEARCH_ROUTES = (
    '/api/v1/overview',
    '/api/v1/location?lat=30.901&lon=75.857',
    '/api/v1/models/model_a/metrics',
    '/api/v1/map/hotspots/model_a?limit=10',
)


def _local_host(hostname):
    if hostname is None:
        return False
    if hostname.casefold() == 'localhost':
        return True
    try:
        return ipaddress.ip_address(hostname).is_loopback
    except ValueError:
        return False


def _request(base_url, route, timeout):
    url = base_url.rstrip('/') + route
    req = urllib.request.Request(
        url,
        headers={'Accept': 'application/json', 'Accept-Encoding': 'gzip',
                 'User-Agent': 'AeroScopeLocalBenchmark/1.0'},
        method='GET',
    )
    start = time.perf_counter()
    with urllib.request.urlopen(req, timeout=timeout) as response:
        status = response.status
        content = response.read()
        if response.headers.get('Content-Encoding') == 'gzip':
            content = gzip.decompress(content)
        payload = json.loads(content)
    elapsed = (time.perf_counter() - start) * 1000
    if not isinstance(payload, dict):
        raise ValueError('Endpoint returned an unexpected JSON shape')
    return status, elapsed, len(content)


def main(argv=None):
    parser = argparse.ArgumentParser(description='AeroScope safe sequential API benchmark')
    parser.add_argument('--base-url', default='http://127.0.0.1:5000')
    parser.add_argument('--requests', type=int, default=5, help='Requests per endpoint (1–30)')
    parser.add_argument('--timeout', type=float, default=15, help='Timeout per request in seconds')
    parser.add_argument('--research', action='store_true', help='Also benchmark local research endpoints')
    parser.add_argument('--max-p95-ms', type=float, default=None, help='Optional p95 threshold to enforce')
    args = parser.parse_args(argv)
    split = urlsplit(args.base_url)
    if split.scheme not in ('http', 'https') or not split.hostname or split.query or split.fragment:
        parser.error('base-url must be a complete HTTP(S) origin without a query or fragment')
    if args.requests < 1 or args.requests > 30:
        parser.error('--requests must be between 1 and 30')
    if args.timeout <= 0:
        parser.error('--timeout must be positive')
    if args.research and not _local_host(split.hostname):
        parser.error('--research may only run against localhost or a loopback IP')

    routes = DEFAULT_ROUTES + (RESEARCH_ROUTES if args.research else ())
    failed = False
    for route in routes:
        durations = []
        sizes = []
        try:
            for _ in range(args.requests):
                status, elapsed, size = _request(args.base_url, route, args.timeout)
                if status != 200:
                    raise ValueError(f'Unexpected HTTP status {status}')
                durations.append(elapsed)
                sizes.append(size)
        except (urllib.error.URLError, ValueError, OSError, json.JSONDecodeError) as exc:
            print(f'FAIL {route}: {exc}', file=sys.stderr)
            failed = True
            continue
        ordered = sorted(durations)
        p95 = ordered[max(0, math.ceil(len(ordered) * 0.95) - 1)]
        print(f'{route}: median={statistics.median(durations):.1f}ms '
              f'p95={p95:.1f}ms JSON={int(statistics.median(sizes)):,} bytes')
        if args.max_p95_ms is not None and p95 > args.max_p95_ms:
            failed = True
            print('  OVER PERFORMANCE THRESHOLD', file=sys.stderr)
    return 1 if failed else 0


if __name__ == '__main__':
    raise SystemExit(main())
