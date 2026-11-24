"""Small idempotent UI-label patch. Run from the AeroScope India project root."""
from pathlib import Path

root = Path.cwd()
lab = root / 'frontend' / 'src' / 'pages' / 'ModelLaboratory.tsx'
gallery = root / 'frontend' / 'src' / 'components' / 'ModelEvaluationGallery.tsx'
if not lab.is_file():
    raise SystemExit(f'ModelLaboratory.tsx not found at {lab}. Run from project root.')
if not gallery.is_file():
    raise SystemExit(f'ModelEvaluationGallery.tsx not found at {gallery}. Extract the ZIP first.')

content = lab.read_text(encoding='utf-8')
old = 'title="PCA · cluster projection" description="PC1 and PC2 positions of cluster centroids (not individual geographic locations)."'
new = 'title="PCA · cluster centroids" description="PC1 and PC2 coordinates of the four or five cluster centers. Individual grid-cell PCA scatter plots are in Cluster Insights."'
content = content.replace(old, new)
content = content.replace(
    '<span>Explained variance</span>',
    '<span>PC1 + PC2 explained variance</span>',
)
lab.write_text(content, encoding='utf-8')
print('Evaluation curves: browser CSV import removed; data loads from Flask API.')
print('PCA card: centroid-only labeling clarified (if matching original text was present).')
print('Other pages and backend unchanged.')
