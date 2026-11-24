#!/usr/bin/env python3
"""Install the hero into an existing AeroScope light-dashboard Home.tsx safely.

Runs only on the local project. Does not touch Flask, other pages, or Git.
It is intentionally conservative: unknown Home markup is left unchanged.
"""
from pathlib import Path
from datetime import datetime
import shutil
import sys

root = Path(__file__).resolve().parents[1]
home = root / 'frontend' / 'src' / 'pages' / 'Home.tsx'
component = root / 'frontend' / 'src' / 'components' / 'AtmosphereHero.tsx'
image = root / 'frontend' / 'public' / 'images' / 'aeroscope-whisk-hero.webp'

if not component.is_file() or not image.is_file():
    sys.exit('ERROR: Hero component/image missing. Extract the ZIP at the repository root first.')
if not home.is_file():
    sys.exit('ERROR: frontend/src/pages/Home.tsx was not found. No changes made. See README-HERO.md.')
text = home.read_text(encoding='utf-8')
if 'AtmosphereHero' in text:
    print('Hero is already installed in Home.tsx. Nothing changed.')
    sys.exit(0)
needle = '<div className="al-page-heading">'
if needle not in text or 'className="al-overview"' not in text:
    sys.exit('ERROR: Home.tsx does not match the existing AeroScope light-dashboard structure. No changes made. See README-HERO.md for a manual insertion.')

# Store a copy outside the repository, so it cannot accidentally be added to Git.
backupdir = Path.home() / 'Downloads'
if not backupdir.exists():
    backupdir = Path.home()
backup = backupdir / f'AeroScope-Home-before-hero-{datetime.now().strftime("%Y%m%d-%H%M%S")}.tsx'
shutil.copy2(home,backup)

new_text = "import AtmosphereHero from '../components/AtmosphereHero'\n" + text
new_text = new_text.replace(needle, '<AtmosphereHero />\n      ' + needle,1)
home.write_text(new_text,encoding='utf-8')
print('SUCCESS: Hero added above the existing overview dashboard.')
print(f'Backup saved outside repository: {backup}')
print('Next: cd frontend && npm run build && npm run dev')
