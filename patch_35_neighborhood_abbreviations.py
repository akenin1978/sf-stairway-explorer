#!/usr/bin/env python3
# Run from your project root: python3 patch_35_neighborhood_abbreviations.py
path = 'src/components/StatsModal.jsx'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

# --- Edit 1: add a display-only abbreviation map. This does NOT change
# the underlying neighborhood data (still used for badges/sync) -- it
# only shortens what's shown in this specific list. ---
old_import = "import { useCheckIns } from '../CheckInsContext';"
new_import = """import { useCheckIns } from '../CheckInsContext';

// Display-only shortenings for a few long neighborhood names in this
// list -- the underlying data (used for badges and the sheet sync)
// stays exactly as-is. If any of these don't match, it's because the
// actual stored spelling differs slightly (extra word, different
// punctuation) -- worth a quick check against the real data.
const NEIGHBORHOOD_DISPLAY_OVERRIDES = {
  'BART and Muni Stations': 'BART and Muni',
  'Castro/Eureka Valley': 'Castro/Eur. Valley',
  'Forest Hill Extension': 'Forest Hill Ext.',
  'Northern Waterfront': 'No. Waterfront',
  'Presidio (Fort Winfield Scott)': 'Presidio (Ft. Scott)',
};"""

content = do_replace(content, old_import, new_import, "Edit 1 (abbreviation map)")

# --- Edit 2: use the override when rendering the name ---
content = do_replace(
    content,
    '<span className="stats-neighborhood-name">{n.name}</span>',
    '<span className="stats-neighborhood-name">{NEIGHBORHOOD_DISPLAY_OVERRIDES[n.name] || n.name}</span>',
    "Edit 2 (apply override)"
)

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- long neighborhood names now show shortened versions in the stats list.")
