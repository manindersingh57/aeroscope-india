#!/usr/bin/env python3
"""Synchronize an updated AeroScope Colab ENHANCED export into the PRIVATE Flask backend.

Expected input: the 'enhanced/' folder from Google Drive (or its enclosing project folder),
with data/features/final_model_[ab]_clusters.csv and outputs/results/*.csv.

Dry run by default.  --apply validates *all* required sources, backs up previous files,
then refreshes the local backend model assignments, analytic summaries and optional PCA
and hotspot outputs. Never uploads data or modifies the notebook.

This script updates existing backend rows rather than trying to reconstruct every field
used by the research API from a PDF. The existing 27,937-cell private parquet must exist.
"""
from __future__ import annotations
import argparse
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / 'backend'
DATA = BACKEND / 'data'
FEATURE_FILES = ['final_model_a_clusters.csv', 'final_model_b_clusters.csv', 'india_grid_features_with_states.csv']
ANALYTICS_FILES = ['enhanced_kmeans_evaluation.csv', 'final_model_a_profiles.csv', 'final_model_b_profiles.csv']
OPTIONAL_ANALYTICS = ['alternative_clustering_comparison.csv', 'final_robustness_summary.csv', 'pca_cluster_summary.json']
OPTIONAL_HOTSPOTS = ['model_a_elevated_regions.csv', 'model_b_elevated_regions.csv']
BASE_REQUIRED = {'cell_id','latitude','longitude','mean_aod','state_name','valid_days'}
CLUSTER_REQUIRED = {'cell_id','cluster_id','cluster_rank','cluster_name','cluster_color'}


def locate_enhanced(source: Path) -> Path:
    for path in (source, source/'enhanced', source/'INSAT3D_AOD_Project'/'enhanced'):
        if (path/'data'/'features').is_dir() and (path/'outputs'/'results').is_dir():
            return path
    raise FileNotFoundError('Could not locate enhanced/data/features and enhanced/outputs/results under --source')


def read_csv(path: Path, cols: set[str], label: str) -> pd.DataFrame:
    if not path.is_file():
        raise FileNotFoundError(f'{label} missing: {path}')
    frame = pd.read_csv(path, low_memory=False)
    missing = cols.difference(frame.columns)
    if missing:
        raise ValueError(f'{label} missing columns: {sorted(missing)}')
    if 'cell_id' in frame and (frame['cell_id'].isna().any() or frame['cell_id'].duplicated().any()):
        raise ValueError(f'{label} contains null/duplicate cell_id')
    return frame


def stage_copy(source: Path, destination: Path, staged: dict[Path,Path]):
    if source.exists():
        staged[destination] = source


def validate_base(base: pd.DataFrame, new: pd.DataFrame, model_a: pd.DataFrame, model_b: pd.DataFrame):
    if base['cell_id'].duplicated().any():
        raise ValueError('Existing backend parquet has duplicate cell_id; cannot safely synchronize')
    if len(base) != len(new) or set(base['cell_id'].astype(str)) != set(new['cell_id'].astype(str)):
        raise ValueError('Updated India grid is not a 1:1 match for existing backend cell_id values. '
                         'Re-export the full portable backend dataset from the updated notebook instead.')
    ids = set(new['cell_id'].astype(str))
    for label, frame in [('Model A',model_a), ('Model B',model_b)]:
        if not set(frame['cell_id'].astype(str)).issubset(ids):
            raise ValueError(f'{label} assignments contain unknown grid cell IDs')
        if not frame['cluster_rank'].between(0, 3 if label == 'Model A' else 4).all():
            raise ValueError(f'{label} cluster ranks outside expected K range')
    if len(model_a) != 25465 or len(model_b) != 13506:
        print('CAUTION: The updated exports have different eligibility counts from this notebook PDF.')
        print('Please verify that these are the files from your latest model run before applying.')
        raise ValueError('Notebook expected 25,465 Model A and 13,506 Model B classified cells')


def sync_frame(base: pd.DataFrame, updated: pd.DataFrame, a: pd.DataFrame, b: pd.DataFrame) -> pd.DataFrame:
    base = base.copy()
    # Match on stable cell_id, never positional row order.
    base['_sync_id'] = base['cell_id'].astype(str)
    base = base.set_index('_sync_id', drop=True)
    updated = updated.copy()
    updated['_sync_id'] = updated['cell_id'].astype(str)
    updated = updated.set_index('_sync_id', drop=True)
    # Refresh measured and seasonal features. Preserve backend-specific derived columns.
    for col in updated.columns:
        if col in ('cell_id','model_a_available','model_b_available') or col.startswith(('model_a_cluster_', 'model_b_cluster_')):
            continue
        if col in base.columns:
            base[col] = updated.loc[base.index, col]
    for prefix, frame, k in [('model_a',a,4),('model_b',b,5)]:
        frame = frame.copy()
        frame['_sync_id'] = frame['cell_id'].astype(str)
        frame = frame.set_index('_sync_id',drop=True)
        base[prefix+'_available'] = base.index.isin(frame.index)
        fields = ['cluster_id','cluster_rank','cluster_name','cluster_color',
                  'membership_strength','membership_margin','normalized_margin']
        for field in fields:
            dest = prefix+'_'+field
            # Reset even if absent, so stale scores cannot survive a model change.
            if dest in base.columns or field in frame.columns:
                base[dest] = frame[field].reindex(base.index) if field in frame else float('nan')
    base.index.name = '_sync_id'
    return base.reset_index(drop=True)


def assemble_manifest(a: pd.DataFrame, b: pd.DataFrame, ev: pd.DataFrame, source: Path, meta: dict) -> dict:
    models={}
    for name, frame, k, features in [
        ('model_a', a, 4, ['mean_aod','std_aod','high_aod_frequency']),
        ('model_b', b, 5, ['mean_aod','std_aod','high_aod_frequency','winter_contrast','premonsoon_contrast','monsoon_contrast']),
    ]:
        eval_rows=ev.loc[(ev['model'].astype(str).str.lower() == name) & (pd.to_numeric(ev['k'],errors='coerce') == k)]
        if len(eval_rows)!=1:
            raise ValueError(f'Could not find one selected K={k} evaluation result for {name}')
        row=eval_rows.iloc[0]
        clusters=[]
        for rank,part in frame.groupby('cluster_rank'):
            names=part['cluster_name'].dropna().unique()
            if len(names)!=1: raise ValueError(f'Inconsistent cluster names for {name}, rank {rank}')
            clusters.append({'rank':int(rank),'name':str(names[0]),'cells':int(len(part)),
                             'color':str(part['cluster_color'].iloc[0]),
                             'percentage':round(100*len(part)/len(frame),2)})
        all_rows=ev.loc[ev['model'].astype(str).str.lower() == name].copy()
        all_rows['silhouette']=pd.to_numeric(all_rows['silhouette'], errors='coerce')
        all_rows=all_rows.dropna(subset=['silhouette'])
        best_k=int(all_rows.loc[all_rows['silhouette'].idxmax(),'k'])
        models[name]={
            'selected_k':k,'best_silhouette_k':best_k,
            'eligible_cells':int(len(frame)), 'feature_count':len(features),
            'features':features,'clusters':sorted(clusters,key=lambda c:c['rank']),
            'silhouette':float(row['silhouette']), 'davies_bouldin':float(row['davies_bouldin']),
            'calinski_harabasz':float(row['calinski_harabasz']),
            'wcss':float(row['wcss']),
        }
    return {
       'schema':'aeroscope-model-revision-v1',
       'generated_utc':datetime.now(timezone.utc).isoformat(),
       'provenance':'Updated local Colab model outputs (validated files)',
       'study':{'aod_period':'2022-08-23 to 2024-06-05','satellite_files':4212,
                'observation_days':643,'india_grid_cells':27937,'high_aod_threshold':meta.get('high_aod_threshold'),
                'scientific_note':'Historical satellite column AOD, not live AQI or surface PM2.5'},
       'models':models,
       'warnings':['Model B requires complete four-season coverage; unclassified cells are insufficient data.',
                   'Cluster rankings describe relative historical AOD patterns, not health danger or regulatory thresholds.']
    }


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,required=True,help='Downloaded INSAT3D_AOD_Project/enhanced folder')
    parser.add_argument('--apply',action='store_true',help='Back up and install validated updated model exports')
    args=parser.parse_args()
    source=locate_enhanced(args.source.expanduser().resolve())
    feats=source/'data'/'features'; results=source/'outputs'/'results'; cfg=source/'config'
    basepath=DATA/'india_grid_features.parquet'
    if not basepath.is_file(): raise FileNotFoundError(f'Existing private backend dataset missing: {basepath}')
    base=pd.read_parquet(basepath)
    required=BASE_REQUIRED | {'model_a_available','model_b_available'}
    if not required.issubset(base.columns):
        raise ValueError(f'Existing backend schema is missing {sorted(required-set(base.columns))}')
    raw=read_csv(feats/'india_grid_features_with_states.csv',BASE_REQUIRED,'India grid')
    a=read_csv(feats/'final_model_a_clusters.csv',CLUSTER_REQUIRED,'Model A final clusters')
    b=read_csv(feats/'final_model_b_clusters.csv',CLUSTER_REQUIRED,'Model B final clusters')
    ev=read_csv(results/'enhanced_kmeans_evaluation.csv',{'model','k','wcss','silhouette','davies_bouldin','calinski_harabasz'},'K evaluation')
    pa=read_csv(results/'final_model_a_profiles.csv',{'cluster_rank','cluster_name','cells'},'Model A profiles')
    pb=read_csv(results/'final_model_b_profiles.csv',{'cluster_rank','cluster_name','cells'},'Model B profiles')
    validate_base(base,raw,a,b)
    for label,frame,profiles in [('model_a',a,pa),('model_b',b,pb)]:
        expected=dict(frame.groupby('cluster_rank').size())
        reported={int(x.cluster_rank):int(x.cells) for x in profiles.itertuples()}
        if expected != reported: raise ValueError(f'{label} profiles do not match final assignments')
    configfile=cfg/'final_model_config.json'
    if not configfile.is_file(): raise FileNotFoundError(f'Model config missing: {configfile}')
    modelconfig=json.loads(configfile.read_text(encoding='utf-8'))
    frame=sync_frame(base,raw,a,b)
    manifest=assemble_manifest(a,b,ev,source,modelconfig)
    print('Validated latest model results:')
    print(f' India cells: {len(frame):,}; Model A: {len(a):,} (K=4); Model B: {len(b):,} (K=5)')
    print(' Model A silhouette:',manifest['models']['model_a']['silhouette'])
    print(' Model B silhouette:',manifest['models']['model_b']['silhouette'])
    staged={}
    for filename in ANALYTICS_FILES+OPTIONAL_ANALYTICS:
        stage_copy(results/filename,DATA/'analytics'/filename,staged)
    for filename in OPTIONAL_HOTSPOTS:
        stage_copy(results/filename,DATA/'hotspots'/filename,staged)
    for filename in ['final_model_a_clusters.csv','final_model_b_clusters.csv']:
        stage_copy(feats/filename,DATA/'pca'/filename,staged)
    print('Optional files found:',*[p.name for p in staged.values()],sep='\n - ')
    if not args.apply:
        print('\nDRY RUN ONLY. To perform backups + installation, rerun with --apply.')
        return
    # Only after all checks succeed: backups, then writes.
    backup=Path.home()/'Downloads'/'AeroScopeBackups'/('model-sync-'+datetime.now().strftime('%Y%m%d-%H%M%S'))
    all_targets=[basepath,DATA/'model_revision.json',*staged.keys()]
    for target in all_targets:
        if target.is_file():
            dest=backup/target.relative_to(BACKEND)
            dest.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(target,dest)
    # Write updated Parquet to a temporary file on same disk before replacing.
    temp=basepath.with_name(basepath.name+'.updated.tmp')
    try:
        frame.to_parquet(temp,index=False)
        temp.replace(basepath)
        target=DATA/'model_revision.json'
        target.write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
        for dest,src in staged.items():
            dest.parent.mkdir(parents=True,exist_ok=True)
            shutil.copy2(src,dest)
    finally:
        if temp.exists(): temp.unlink()
    print('\nModel data updated. Backups:',backup)
    missing=[name for name in OPTIONAL_HOTSPOTS if (results/name) not in staged.values()]
    if missing: print('WARNING: latest hotspot exports missing; existing hotspot summaries may need rebuilding:', ', '.join(missing))
    if (results/'pca_cluster_summary.json').exists() is False:
        print('NOTE: Centroid PCA JSON not present in notebook results; existing centroid-only API summary may be stale.')
    print('NEXT: Restart Flask; rebuild your local Geo Explorer JSON with tools/export_geoexplorer_local.py')
    print('PRIVATE RESEARCH DATA: do not commit modified backend/data or publish it before rights review.')

if __name__=='__main__':
    try: main()
    except (OSError,ValueError,KeyError,RuntimeError) as exc:
        sys.exit(f'Model synchronization failed safely: {exc}')
