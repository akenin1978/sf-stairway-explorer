#!/usr/bin/env python3
# Run from your project root: python3 patch_27_viewport_culling.py
path = 'src/components/StairwayMap.jsx'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

# --- Edit 1: add a ViewportBoundsTracker helper component, right after
# the existing PanToUserLocation helper it sits alongside ---
old_anchor = """function PanToUserLocation({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    map.setZoom(16);
  }, [map, target]);

  return null;
}"""

new_anchor = """function PanToUserLocation({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    map.setZoom(16);
  }, [map, target]);

  return null;
}

// Tracks the map's current visible area (with some padding) so the
// stairway list can be culled to only what's on/near screen, instead of
// rendering all ~1200 markers regardless of zoom level. Updates on
// 'idle' -- which fires once after a pan/zoom gesture settles, not on
// every frame -- so recalculating bounds doesn't itself cause a
// re-render storm during the gesture.
function ViewportBoundsTracker({ onBoundsChange }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    function updateBounds() {
      const bounds = map.getBounds();
      if (!bounds) return;
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const latSpan = ne.lat() - sw.lat();
      const lngSpan = ne.lng() - sw.lng();
      const padding = 0.3; // 30% extra margin so markers don't pop in/out abruptly while panning
      onBoundsChange({
        north: ne.lat() + latSpan * padding,
        south: sw.lat() - latSpan * padding,
        east: ne.lng() + lngSpan * padding,
        west: sw.lng() - lngSpan * padding,
      });
    }

    const listener = map.addListener('idle', updateBounds);
    updateBounds();

    return () => listener.remove();
  }, [map, onBoundsChange]);

  return null;
}"""

content = do_replace(content, old_anchor, new_anchor, "Edit 1 (ViewportBoundsTracker component)")

# --- Edit 2: add mapBounds state + a culledStairways derived list ---
old_visible_close = """  }, [stairways, visibleRatings, visibleNeighborhoods]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;"""

new_visible_close = """  }, [stairways, visibleRatings, visibleNeighborhoods]);

  const [mapBounds, setMapBounds] = useState(null);

  // Further narrows visibleStairways (already filtered by rating/
  // neighborhood toggles) down to just what's within the current map
  // view. mapBounds is null until the map's first 'idle' event fires,
  // so everything renders normally on initial load.
  const culledStairways = useMemo(() => {
    if (!mapBounds) return visibleStairways;
    return visibleStairways.filter(
      (s) =>
        s.latitude <= mapBounds.north &&
        s.latitude >= mapBounds.south &&
        s.longitude <= mapBounds.east &&
        s.longitude >= mapBounds.west
    );
  }, [visibleStairways, mapBounds]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;"""

content = do_replace(content, old_visible_close, new_visible_close, "Edit 2 (mapBounds state + culledStairways)")

# --- Edit 3: mount the bounds tracker alongside the other map-child helpers ---
content = do_replace(
    content,
    "          <PanToUserLocation target={panTarget} />",
    "          <PanToUserLocation target={panTarget} />\n          <ViewportBoundsTracker onBoundsChange={setMapBounds} />",
    "Edit 3 (mount tracker)"
)

# --- Edit 4: render culledStairways instead of visibleStairways ---
content = do_replace(
    content,
    "          {visibleStairways.map((s) => {",
    "          {culledStairways.map((s) => {",
    "Edit 4 (use culled list)"
)

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- stairway markers now cull to the visible map area (plus padding) instead of always rendering all of them.")
