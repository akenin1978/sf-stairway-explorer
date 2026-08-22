#!/usr/bin/env python3
# Run from your project root: python3 patch_25_fix_pan_lock.py
path = 'src/components/StairwayMap.jsx'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

# --- Edit 1: add panTarget state + a ref tracking whether we've already
# centered for the current locate-me session ---
old_state = """  const [myLocation, setMyLocation] = useState(null);
  const [myHeading, setMyHeading] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const locationWatchIdRef = useRef(null);"""

new_state = """  const [myLocation, setMyLocation] = useState(null);
  // Separate from myLocation -- myLocation updates continuously (for the
  // dot + flare), but panTarget only updates once per "locate me" tap,
  // so the map centers/zooms once and then leaves scroll/zoom alone
  // instead of snapping back on every GPS update while you're walking.
  const [panTarget, setPanTarget] = useState(null);
  const [myHeading, setMyHeading] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const locationWatchIdRef = useRef(null);
  const hasCenteredRef = useRef(false);"""

content = do_replace(content, old_state, new_state, "Edit 1 (add panTarget state)")

# --- Edit 2: reset the "has centered" flag at the start of each locate-me
# tap, and only set panTarget on the first fix of that session ---
old_watch = """    if (locationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
    }

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setMyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (pos.coords.heading != null && !Number.isNaN(pos.coords.heading)) {
          setMyHeading(pos.coords.heading);
        }
        setLocating(false);
      },"""

new_watch = """    if (locationWatchIdRef.current != null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
    }
    hasCenteredRef.current = false;

    locationWatchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMyLocation(loc);
        if (!hasCenteredRef.current) {
          setPanTarget(loc);
          hasCenteredRef.current = true;
        }
        if (pos.coords.heading != null && !Number.isNaN(pos.coords.heading)) {
          setMyHeading(pos.coords.heading);
        }
        setLocating(false);
      },"""

content = do_replace(content, old_watch, new_watch, "Edit 2 (gate the pan)")

# --- Edit 3: pass panTarget (not myLocation) to PanToUserLocation ---
content = do_replace(
    content,
    "          <PanToUserLocation target={myLocation} />",
    "          <PanToUserLocation target={panTarget} />",
    "Edit 3 (use panTarget for panning)"
)

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- the map now only auto-centers on the first GPS fix after tapping locate-me, not on every subsequent update.")
