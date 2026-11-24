# AeroScope India | Cinematic Whisk Homepage Hero

This is a **frontend-only, non-destructive overlay** for the pearl-white AeroScope dashboard. It uses the **exact Whisk image you supplied** (included in `frontend/public/images`) instead of inventing a new map or changing research data.

## Result

- Big, cinematic homepage hero with your raised India map and satellite on the right.
- Clear heading and working Geo Explorer / Methodology links on the left.
- Slow, soft cloud animation, subtle image drift, graceful button hover and reduced-motion support.
- Existing stats, atlas preview, ML cards, research panels, routing and API calls remain below the hero.
- No new npm dependencies and no changes to Flask.

**Note:** The satellite is baked into your Whisk illustration. The whole illustration drifts very subtly, while CSS clouds float independently. It is **not** a separately animated satellite, satellite track or live-data visualization.

## Install in PowerShell (VS Code)

From your project root:

```powershell
cd "C:\Users\ACER\Downloads\aeroscope-flask-backend-starter\aeroscope-flask-backend"
git branch --show-current
git status
```

**Use the `claude-redesign` branch**, not `main`. Commit or stash current edits before installing.

Download `aeroscope-cinematic-homepage-hero.zip`, then run:

```powershell
Expand-Archive -Path "$HOME\Downloads\aeroscope-cinematic-homepage-hero.zip" -DestinationPath . -Force
python tools/apply_aeroscope_hero.py
cd frontend
npm run build
npm run dev
```

Open `http://localhost:5173/`.

The script patches **only** `frontend/src/pages/Home.tsx` by inserting the hero above the existing `.al-page-heading`. It first saves a timestamped copy of your original `Home.tsx` to Downloads, **outside your Git repository**. The existing headline is visually hidden to prevent duplication; your existing statistic cards remain below the hero. Re-running the script safely does nothing if the hero is already installed.

### What you should see

1. Premium large illustration first, without a big white image card.
2. Heading and two clickable buttons on the left.
3. Semi-transparent animated cloud layers, with gentle overall illustration drift.
4. Existing research statistics and current dashboard cards immediately below.
5. Existing sidebar/header, Geo Explorer, Lab, Cluster Insights and Methodology unchanged.

### If the script reports that Home.tsx is different

Your local homepage might have a newer structure. It deliberately **does not** overwrite or guess at modified code. Manually add this line alongside other imports in `frontend/src/pages/Home.tsx`:

```tsx
import AtmosphereHero from '../components/AtmosphereHero'
```

Then insert `<AtmosphereHero />` as the **first child** of the existing `div className="al-overview"`, above its `div className="al-page-heading"`. The component imports its own stylesheet, so **no** index.css edit is needed.

If your homepage file or structure is significantly different, share its contents for a precise integration.

### Git / privacy

The supplied Whisk illustration is decorative. It contains no private AOD grid or MOSDAC derived data. The archive contains no keys, `.env` files or backend changes.

```powershell
cd ..
git diff -- frontend/src/pages/Home.tsx
git status
```

Build and review before you commit.
