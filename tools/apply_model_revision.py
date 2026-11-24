#!/usr/bin/env python3
"""Safely add a dynamic model-revision panel and a private model metadata route.

Run from AeroScope repository root after unzipping the update. Validates every
anchor before changing any file; preserves your current dashboard styling.
"""
from __future__ import annotations
from pathlib import Path
from datetime import datetime
import shutil
import sys

ROOT=Path.cwd()
LAB=ROOT/'frontend/src/pages/ModelLaboratory.tsx'
INSIGHTS=ROOT/'frontend/src/pages/ClusterInsights.tsx'
RESEARCH=ROOT/'frontend/src/pages/Research.tsx'
API=ROOT/'backend/app/routes/analytics.py'
COMP=ROOT/'frontend/src/components/UpdatedModelSnapshot.tsx'
CSS=ROOT/'frontend/src/styles/aeroscope-model-revision.css'
GITIGNORE=ROOT/'.gitignore'

ROUTE='''

@analytics_api.get("/study-revision")
def updated_study_revision():
    """Latest LOCAL verified model metadata, not raw research rows."""
    import json
    from pathlib import Path
    from ..errors import APIError
    if (current_app.config.get("ENVIRONMENT") == "production"
            and not current_app.config.get("PUBLIC_RESULTS_ENABLED", False)):
        raise APIError("Public research results are disabled", 403, "public_results_disabled")
    path = Path(current_app.config["ANALYTICS_DIR"]) / "data" / "model_revision.json"
    if not path.is_file():
        raise APIError("Updated research exports not synchronized", 503, "analytics_unavailable")
    with path.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    if payload.get("schema") != "aeroscope-model-revision-v1":
        raise APIError("Model revision metadata invalid", 503, "analytics_invalid")
    return jsonify(payload)
'''

def insert(content: str, filename: str, anchor: str, addition: str):
    if addition in content: return content
    if anchor not in content: raise ValueError(f'{filename}: expected anchor not found; file not modified')
    return content.replace(anchor,addition+'\n'+anchor,1)


def main():
    required=[LAB,INSIGHTS,RESEARCH,API,COMP,CSS,GITIGNORE]
    missing=[p for p in required if not p.is_file()]
    if missing: sys.exit('Missing expected project files: '+', '.join(map(str,missing)))
    old={p:p.read_text(encoding='utf-8') for p in [LAB,INSIGHTS,RESEARCH,API,GITIGNORE]}
    try:
        new=dict(old)
        importline="import UpdatedModelSnapshot from '../components/UpdatedModelSnapshot'"
        for page in [LAB,INSIGHTS,RESEARCH]:
            if importline not in new[page]: new[page]=importline+'\n'+new[page]
        new[LAB]=insert(new[LAB],LAB.name,'    <footer className="al-lab-footer">','    <UpdatedModelSnapshot />')
        new[INSIGHTS]=insert(new[INSIGHTS],INSIGHTS.name,'    <div className="al-ci-deepdive"','    <UpdatedModelSnapshot />')
        new[RESEARCH]=insert(new[RESEARCH],RESEARCH.name,'    <div className="al-r-intro-grid">','    <UpdatedModelSnapshot />')
        if 'def updated_study_revision(' not in new[API]: new[API]+=ROUTE
        if 'backend/data/model_revision.json' not in new[GITIGNORE]: new[GITIGNORE]+='\n# Private generated model revision data; keep out of Git\nbackend/data/model_revision.json\n'
    except ValueError as e: sys.exit(str(e))
    changed=[p for p in old if new[p]!=old[p]]
    if not changed:
        print('Model revision integration already installed. Nothing changed.');return
    backup=Path.home()/'Downloads'/'AeroScopeBackups'/('model-revision-code-'+datetime.now().strftime('%Y%m%d-%H%M%S'))
    for p in changed:
        target=backup/p.relative_to(ROOT)
        target.parent.mkdir(parents=True,exist_ok=True)
        shutil.copy2(p,target)
    for p in changed:
        p.write_text(new[p],encoding='utf-8')
        print('Patched:',p.relative_to(ROOT))
    print('Backups:',backup)
    print('Next: use backend/scripts/sync_updated_model.py to apply validated Colab exports, then restart Flask.')

if __name__=='__main__': main()
