# SF Stairway Explorer

A React web app showing San Francisco's public stairways on a Google Map,
pulling data live from Supabase.

## What's in here

- **React + Vite** — the app itself
- **`@vis.gl/react-google-maps`** — Google's own React library for the map
- **`@supabase/supabase-js`** — talks directly to your `stairways` table
- Markers are clickable and show description, rating, stair count, and photo

This has been built and test-compiled already — `npm run build` succeeds.
It has **not** been run in an actual browser yet, since that needs real API
keys. That's the next step below.

## Setup (do this first)

1. Install [Node.js](https://nodejs.org) if you don't have it (v18 or later).
2. In this folder, run:
   ```
   npm install
   ```
3. Copy the environment template:
   ```
   cp .env.example .env
   ```
4. Open `.env` and fill in three values:
   - `VITE_SUPABASE_URL` — Supabase → Project Settings → API → Project URL
   - `VITE_SUPABASE_ANON_KEY` — Supabase → Project Settings → API Keys →
     the **anon / publishable** key (NOT the secret/service_role one — this
     one is safe for client-side use)
   - `VITE_GOOGLE_MAPS_API_KEY` — the same Google Maps key from your
     FlutterFlow work, as long as "Maps JavaScript API" is enabled on it
5. Run it locally:
   ```
   npm run dev
   ```
   Then open the URL it prints (usually http://localhost:5173).

If your stairways show up as pins on a real SF map, it worked.

## Pushing to GitHub

1. Create a new repo on [github.com](https://github.com) (don't add a
   README or .gitignore there — this folder already has one).
2. In this folder:
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url-here>
   git push -u origin main
   ```

Your `.env` file will NOT be pushed (it's in `.gitignore`) — that's
intentional, so your real keys never end up on GitHub.

## Deploying (Vercel)

1. Go to [vercel.com](https://vercel.com), sign in with GitHub.
2. Click "Add New Project," select this repo.
3. Vercel auto-detects Vite — no config needed.
4. Before deploying, add your three env vars (same names as `.env`) under
   the project's Environment Variables settings.
5. Deploy. You'll get a live URL.

## Project structure

```
src/
  main.jsx              entry point
  App.jsx                top-level layout
  supabaseClient.js       Supabase connection
  components/
    StairwayMap.jsx       the map itself — fetch + markers + info window
```
