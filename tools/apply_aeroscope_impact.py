#!/usr/bin/env python3
"""Safe, idempotent installer for the AeroScope social-impact route.

This avoids replacing existing homepage, Geo Explorer, Methodology or other source files.
Run from the project root AFTER extracting the ZIP.
"""
from pathlib import Path
from datetime import datetime
import os
import shutil
import sys

ROOT = Path.cwd()
APP = ROOT / 'frontend' / 'src' / 'App.tsx'
SHELL = ROOT / 'frontend' / 'src' / 'components' / 'AeroLightShell.tsx'
GEO = ROOT / 'frontend' / 'src' / 'pages' / 'ExploreIndia.tsx'
PAGE = ROOT / 'frontend' / 'src' / 'pages' / 'SocietalImpact.tsx'
STYLE = ROOT / 'frontend' / 'src' / 'styles' / 'aeroscope-impact.css'


def patch_app(source: str) -> str:
    if "import SocietalImpact from './pages/SocietalImpact'" not in source:
        anchor = "import Research from './pages/Research'"
        if anchor not in source:
            raise ValueError('App.tsx: expected Research import not found. No existing file has been changed.')
        source = source.replace(anchor, anchor + "\nimport SocietalImpact from './pages/SocietalImpact'", 1)
    if 'path="/impact"' not in source:
        anchor = '    <Route path="/research"'
        lines = source.splitlines(keepends=True)
        index = next((i for i, line in enumerate(lines) if anchor in line), None)
        if index is None:
            raise ValueError('App.tsx: /research route not found. No existing file has been changed.')
        lines.insert(index + 1, '    <Route path="/impact" element={<SocietalImpact/>}/>\n')
        source = ''.join(lines)
    return source


def patch_shell(source: str) -> str:
    if 'icon: Users' not in source:
        anchor = "  { path: '/research', label: 'Methodology', icon: BookOpen },"
        if anchor not in source:
            raise ValueError('AeroLightShell.tsx: Methodology navigation anchor not found. No existing file has been changed.')
        source = source.replace(anchor, anchor + "\n  { path: '/impact', label: 'Social Impact', icon: Users },", 1)
    if 'Users' not in source.split('from \'lucide-react\'')[0]:
        anchor = 'LayoutDashboard, MapPinned, Menu, Orbit, X,'
        if anchor not in source:
            raise ValueError('AeroLightShell.tsx: icon import anchor not found. No existing file has been changed.')
        source = source.replace(anchor, 'LayoutDashboard, MapPinned, Menu, Orbit, Users, X,', 1)
    return source


def patch_geo(source: str) -> str:
    # Optional deep link, only for the previous reference-inspired Geo Explorer.
    if 'Community insights' in source or 'Social Impact' in source:
        return source
    anchor = '<Link to="/cluster-insights">View cluster insights <ArrowUpRight size={15}/></Link>'
    if anchor not in source:
        print('Note: No Geo Explorer deep-link inserted (different page version). Sidebar link still works.')
        return source
    add = '<Link to={`/impact?state=${encodeURIComponent(focusedState)}`}>Community insights <ArrowUpRight size={15}/></Link>'
    return source.replace(anchor, anchor + '\n          ' + add, 1)


def main() -> None:
    for filepath in (APP, SHELL, PAGE, STYLE):
        if not filepath.is_file():
            sys.exit(f'Missing {filepath}. Extract the ZIP at the AeroScope project ROOT and rerun.')

    current = {APP: APP.read_text(encoding='utf-8'), SHELL: SHELL.read_text(encoding='utf-8')}
    if GEO.is_file():
        current[GEO] = GEO.read_text(encoding='utf-8')
    try:
        new = {APP: patch_app(current[APP]), SHELL: patch_shell(current[SHELL])}
        if GEO in current:
            new[GEO] = patch_geo(current[GEO])
    except ValueError as exc:
        sys.exit(str(exc))
    changed = [p for p, content in new.items() if content != current[p]]
    if not changed:
        print('Social Impact integration is already installed. No files changed.')
        return

    backup = Path.home() / 'Downloads' / 'AeroScopeBackups' / f'impact-{datetime.now().strftime("%Y%m%d-%H%M%S")}'
    backup.mkdir(parents=True, exist_ok=True)
    for file in changed:
        rel = file.relative_to(ROOT)
        destination = backup / rel
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(file, destination)
    for file in changed:
        file.write_text(new[file], encoding='utf-8')
        print('Updated:', file.relative_to(ROOT))
    print('\nOriginal files backed up outside repository:', backup)
    print('Next: cd frontend; npm run build; npm run dev')
    print('Open: http://localhost:5173/impact')


if __name__ == '__main__':
    main()
