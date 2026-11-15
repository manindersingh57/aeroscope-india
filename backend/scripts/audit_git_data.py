"""Fail if git tracks files likely to contain restricted data or secrets.

This intentionally conservative preflight examines the git index; it does
not prove that files are redistributable and does not replace policy review.

Run from backend/: python -m scripts.audit_git_data
"""
from pathlib import Path
import subprocess


def unsafe_path(path):
    norm = path.replace('\\', '/').lower().lstrip('./')
    parts = norm.split('/')
    basename = parts[-1]
    # Raw products, archived research packages, or virtualenv credentials.
    if basename.endswith(('.tif', '.tiff', '.h5', '.hdf', '.hdf5', '.parquet', '.zip', '.nc')):
        return True
    if basename == '.env' or basename.startswith('.env.') and basename != '.env.example':
        return True
    if '.venv' in parts or '__pycache__' in parts:
        return True
    # Keep notebook-derived model artifacts and research tables private.
    if 'backend' in parts:
        offset = parts.index('backend')
        subpath = '/'.join(parts[offset+1:])
        if subpath.startswith('data/') and subpath != 'data/readme.md':
            return True
        if subpath.startswith('config/') and subpath != 'config/readme.md':
            return True
    return False


def main():
    root = Path(__file__).resolve().parents[2]
    result = subprocess.run(['git', 'ls-files', '-z'], cwd=root, capture_output=True)
    if result.returncode != 0:
        print('Git repository not detected. Run this after git init.')
        return 2
    paths = [p.decode('utf-8', errors='replace') for p in result.stdout.split(b'\0') if p]
    unsafe = [path for path in paths if unsafe_path(path)]
    if unsafe:
        print('STOP: Git is tracking files requiring review:')
        for path in unsafe:
            print(' -', path)
        print('Review with: git ls-files; unstage with git rm --cached <path>')
        return 1
    print(f'PASS: {len(paths)} tracked files audited; no obvious raw data or secrets detected.')
    print('This is a technical check, not confirmation of MOSDAC redistribution permission.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
