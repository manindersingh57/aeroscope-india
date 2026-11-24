"""Insert actual PCA cluster scatter visualisations into the premium AeroScope ML Laboratory.
Run from repo root: python tools/apply_cluster_scatter.py
Only patches ModelLaboratory.tsx; research CSV files remain private and are not bundled.
"""
from pathlib import Path
from datetime import datetime
import sys

root = Path.cwd()
page = root / 'frontend' / 'src' / 'pages' / 'ModelLaboratory.tsx'
component = root / 'frontend' / 'src' / 'components' / 'ClusterScatterGallery.tsx'
style = root / 'frontend' / 'src' / 'styles' / 'aeroscope-cluster-scatter.css'
missing = [str(path.relative_to(root)) for path in [page, component, style] if not path.is_file()]
if missing:
    sys.exit('Missing required project files: ' + ', '.join(missing))
source = page.read_text(encoding='utf-8')
if '<ClusterScatterGallery' in source:
    print('The cluster scatter section is already installed. No changes needed.')
    sys.exit(0)
anchor = "import '../styles/aeroscope-lab.css'"
marker = '    <div className="al-lab-two-cols al-lab-primary-row">'
if anchor not in source or marker not in source:
    sys.exit('Expected premium ML Laboratory markers not found. Your file was not changed; see README for manual instructions.')
backup_dir = Path.home() / 'Downloads' / 'aeroscope-cluster-scatter-backups'
backup_dir.mkdir(parents=True, exist_ok=True)
backup = backup_dir / f'ModelLaboratory-{datetime.now().strftime("%Y%m%d-%H%M%S-%f")}.tsx'
backup.write_text(source, encoding='utf-8')
source = source.replace(anchor, anchor + "\nimport ClusterScatterGallery from '../components/ClusterScatterGallery'", 1)
source = source.replace(marker, '    <ClusterScatterGallery />\n\n' + marker, 1)
page.write_text(source, encoding='utf-8')
print('Installed the full PCA cluster scatter section in frontend/src/pages/ModelLaboratory.tsx')
print('Original backed up to:', backup)
print('Run: cd frontend && npm run build && npm run dev')
