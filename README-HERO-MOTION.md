# AeroScope India | Clean Hero + Independent Satellite & Cloud Motion

This is an **incremental update** for the previously installed cinematic homepage hero. It does not replace `Home.tsx`, the dashboard below the hero, the sidebar, Geo Explorer, ML Laboratory, Cluster Insights, Methodology, or the Flask backend.

## Changes

- **Cleaned original Whisk illustration**: removed the Gemini-style four-point decorative sparkle at bottom right and the stray objects on the far-right edge. Preserves the same India map artwork, satellite appearance and pale-blue/ivory palette.
- **Satellite truly floats separately**: the satellite is now an independent transparent PNG layer, with a gentle, repeated vertical hovering animation. The map no longer moves or zooms.
- **Clouds drift independently**: four semi-transparent, multi-lobed CSS cloud overlays move slowly at staggered speeds, while the background remains stationary.
- **Removed right-end UI clutter**: moved the essential historical-data disclaimer to a small line beneath the hero statistics on the left instead of a box at the far right.
- **Reduced motion supported**: all decorative animations stop automatically for users who prefer reduced motion.
- No third-party packages or JavaScript animation dependencies.

## Included files

- `frontend/src/components/AtmosphereHero.tsx` **REPLACE**, only if you already installed the previous cinematic homepage hero.
- `frontend/src/styles/aeroscope-hero-motion.css` **NEW** (imported by the component).
- `frontend/public/images/aeroscope-atmosphere-clean.webp` **NEW**.
- `frontend/public/images/aeroscope-satellite-floating.png` **NEW**.
- `CLEAN-ILLUSTRATION-PREVIEW.jpg` optional illustration preview.
- `HERO-MOTION-PREVIEW.html` offline layout preview. Some browser environments may block local file previews.

The existing `frontend/src/styles/aeroscope-hero.css` from the original hero package must remain in place; this update overlays motion-specific rules and retains the other layout styles.

## Apply in VS Code / PowerShell

1. Ensure your first hero ZIP is already applied, so `Home.tsx` already renders `<AtmosphereHero />`.
2. Confirm your Git branch and save or commit unfinished edits:

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
git branch --show-current
git status
```

Use `claude-redesign`, not `main`. **Back up local changes before overwriting.**

3. Extract the ZIP at the project root:

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-hero-hovering-satellite-clouds.zip" -DestinationPath . -Force
```

4. Build and run:

```powershell
cd frontend
npm run build
npm run dev
```

Open `http://localhost:5173/`. If Vite is already running, hard refresh with `Ctrl+Shift+R` to load the updated image files and styles.

## What to expect

- The 3D India map remains **still**.
- The satellite **slowly moves up and down independently**; it is not real orbit tracking.
- The cloud overlays **drift slowly**, but do not block links or interfere with scrolling.
- The far-right decoration, sparkle logo and floating footnote box **are gone**.
- Your actual AOD / clustering maps remain in Geo Explorer; the homepage illustration is decorative, not live AQI or real-time atmospheric observations.

## Verification

The TypeScript component was transpiled to check its syntax, the CSS was parsed for errors, and the image layers and ZIP were verified. A full local Vite build and on-device motion check are still recommended. The standalone browser preview could not be captured in the authoring environment because local `file://` pages were blocked.
