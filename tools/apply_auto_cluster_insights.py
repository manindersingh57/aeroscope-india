from datetime import datetime
from pathlib import Path
import sys

root = Path.cwd()
ml_file = root / "frontend/src/pages/ModelLaboratory.tsx"
insights_file = root / "frontend/src/pages/ClusterInsights.tsx"
backend_file = root / "backend/app/routes/analytics.py"
ignore_file = root / ".gitignore"
extras = [
    root / "backend/app/pca_scatter.py",
    root / "frontend/src/components/ClusterScatterGallery.tsx",
    root / "frontend/src/styles/aeroscope-cluster-scatter.css",
]
missing = [str(p.relative_to(root)) for p in [ml_file, insights_file, backend_file, ignore_file] + extras if not p.is_file()]
if missing:
    sys.exit("Required source files missing: " + ", ".join(missing))
backend = backend_file.read_text(encoding="utf-8")
ml = ml_file.read_text(encoding="utf-8")
insights = insights_file.read_text(encoding="utf-8")
ignore = ignore_file.read_text(encoding="utf-8")
if not ('analytics_api' in backend and '@analytics_api.get' in backend):
    sys.exit("Backend analytics blueprint not found; no changes made.")
if '    <div className="al-ci-deepdive"' not in insights and '<ClusterScatterGallery' not in insights:
    sys.exit("Premium Cluster Insights layout anchor not found; no changes made.")

if '<ClusterScatterGallery' in ml:
    ml = ml.replace("import ClusterScatterGallery from '../components/ClusterScatterGallery'\n", "")
    ml = ml.replace('    <ClusterScatterGallery />\n\n', '')
    ml = ml.replace('    <ClusterScatterGallery />\n', '')
if "import ClusterScatterGallery from '../components/ClusterScatterGallery'" not in insights:
    marker = "import '../styles/aeroscope-insights.css'"
    if marker not in insights:
        sys.exit("Insights stylesheet import not found; no changes made.")
    insights = insights.replace(marker, marker + "\nimport ClusterScatterGallery from '../components/ClusterScatterGallery'", 1)
if '<ClusterScatterGallery' not in insights:
    insights = insights.replace('    <div className="al-ci-deepdive"',
                                '    <ClusterScatterGallery />\n\n    <div className="al-ci-deepdive"', 1)

if 'def cluster_pca_points(' not in backend:
    backend += '''

@analytics_api.get("/<model>/pca-points")
def cluster_pca_points(model):
    # Read saved PCA scatterpoints, respecting the existing public research policy.
    from ..errors import APIError
    from ..pca_scatter import load_pca_scatter
    model = validate_model(model)
    if (current_app.config.get("ENVIRONMENT") == "production" and
            not current_app.config.get("PUBLIC_RESULTS_ENABLED", False)):
        raise APIError("Public research results are disabled", 403, "public_results_disabled")
    return jsonify(load_pca_scatter(current_app.config["ANALYTICS_DIR"], model))
'''
if 'backend/data/pca/' not in ignore:
    ignore += "\n# Private derived PCA cells, not approved for redistribution\nbackend/data/pca/\n"

backup_dir = Path.home() / "Downloads" / "aeroscope-backend-pca-backups"
backup_dir.mkdir(parents=True, exist_ok=True)
stamp = datetime.now().strftime("%Y%m%d-%H%M%S-%f")
for path in (ml_file, insights_file, backend_file, ignore_file):
    (backup_dir / (stamp + "-" + path.name)).write_bytes(path.read_bytes())
ml_file.write_text(ml, encoding="utf-8")
insights_file.write_text(insights, encoding="utf-8")
backend_file.write_text(backend, encoding="utf-8")
ignore_file.write_text(ignore, encoding="utf-8")
print("Moved real PCA scatter graphs from ML Laboratory to Cluster Insights.")
print("Enabled automatic local Flask PCA loading without browser CSV imports.")
print("Backups:", backup_dir)
