"""Safely add AeroScope model evaluation gallery to the existing ModelLaboratory.tsx.

Run from the repository root: python tools/apply_model_evaluation.py
Adds no numeric research data to the web app or repository.
"""
from pathlib import Path
from datetime import datetime
import sys

root = Path.cwd()
page = root / 'frontend' / 'src' / 'pages' / 'ModelLaboratory.tsx'
component = root / 'frontend' / 'src' / 'components' / 'ModelEvaluationGallery.tsx'
style = root / 'frontend' / 'src' / 'styles' / 'aeroscope-evaluation.css'

missing = [str(path.relative_to(root)) for path in [page, component, style] if not path.exists()]
if missing:
    sys.exit('Missing expected project files: ' + ', '.join(missing))

source = page.read_text(encoding='utf-8')
if 'ModelEvaluationGallery' in source:
    print('Model Evaluation Gallery is already present in ModelLaboratory.tsx. No edits needed.')
    sys.exit(0)

anchor = "import '../styles/aeroscope-lab.css'"
marker = '    <div className="al-lab-two-cols al-lab-primary-row">'
required = ['const allowed =', 'const unavailableDetail =', 'const [loading, setLoading]', 'const [data, setData]']
if anchor not in source or marker not in source or any(item not in source for item in required):
    sys.exit('Your ModelLaboratory.tsx differs from the expected premium version. No edits made. See README for manual integration.')

# Store a dated backup outside the Git repository.
backup_dir = Path.home() / 'Downloads' / 'aeroscope-model-evaluation-backups'
backup_dir.mkdir(parents=True, exist_ok=True)
backup = backup_dir / f'ModelLaboratory-{datetime.now().strftime("%Y%m%d-%H%M%S-%f")}.tsx'
backup.write_text(source, encoding='utf-8')

source = source.replace(anchor, anchor + "\nimport ModelEvaluationGallery from '../components/ModelEvaluationGallery'", 1)
widget = '''    <ModelEvaluationGallery
      selectedModel={model}
      selectedMetrics={data.metrics}
      canAccessApi={allowed}
      apiLoading={loading}
      unavailableReason={errors.metrics ?? unavailableDetail}
    />

'''
source = source.replace(marker, widget + marker, 1)
page.write_text(source, encoding='utf-8')
print('Enhanced evaluation gallery added to frontend/src/pages/ModelLaboratory.tsx')
print('Original page backup:', backup)
print('Next: cd frontend && npm run build && npm run dev')
