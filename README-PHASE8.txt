AeroScope India Phase 8: release preflight + React handoff

This is a PARTIAL OVERLAY (three files), not an entire backend replacement.
Extract at your repository root, the directory that contains backend/.

From backend/:
  python -m pytest -q
  python -m scripts.release_preflight

Read backend/docs/PHASE8_HANDOFF.md for full instructions.
Keep all satellite datasets and secrets private pending redistribution clarification.
