#!/usr/bin/env python3
# Run from your project root: python3 patch_28_defer_during_interaction.py
path = 'src/components/StairwayMap.jsx'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

# --- Edit 1: ViewportBoundsTracker also reports whether a gesture is
# currently in progress, so markers can be hidden entirely while it is ---
old_tracker = """function ViewportBoundsTracker({ onBoundsChange }) {
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

new_tracker = """function ViewportBoundsTracker({ onBoundsChange, onInteractingChange }) {
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

    // While actively dragging or zooming, drop every stairway marker
    // rather than trying to keep them positioned smoothly mid-gesture --
    // that's the single most performance-critical moment, and repositioning
    // ~1000+ markers competes directly with the gesture's own frame budget.
    // They repopulate the instant the gesture settles (idle).
    function handleInteractionStart() {
      onInteractingChange(true);
    }

    function handleIdle() {
      onInteractingChange(false);
      updateBounds();
    }

    const listeners = [
      map.addListener('dragstart', handleInteractionStart),
      map.addListener('zoom_changed', handleInteractionStart),
      map.addListener('idle', handleIdle),
    ];
    updateBounds();

    return () => listeners.forEach((l) => l.remove());
  }, [map, onBoundsChange, onInteractingChange]);

  return null;
}"""

content = do_replace(content, old_tracker, new_tracker, "Edit 1 (ViewportBoundsTracker interaction tracking)")

# --- Edit 2: add isInteracting state ---
old_state = """  const [mapBounds, setMapBounds] = useState(null);"""

new_state = """  const [mapBounds, setMapBounds] = useState(null);
  const [isInteracting, setIsInteracting] = useState(false);"""

content = do_replace(content, old_state, new_state, "Edit 2 (isInteracting state)")

# --- Edit 3: pass the new callback to the tracker ---
content = do_replace(
    content,
    "          <ViewportBoundsTracker onBoundsChange={setMapBounds} />",
    "          <ViewportBoundsTracker onBoundsChange={setMapBounds} onInteractingChange={setIsInteracting} />",
    "Edit 3 (wire up callback)"
)

# --- Edit 4: render nothing while interacting, culledStairways once settled ---
content = do_replace(
    content,
    "          {culledStairways.map((s) => {",
    "          {(isInteracting ? [] : culledStairways).map((s) => {",
    "Edit 4 (drop markers during interaction)"
)

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- stairway markers now disappear during active pan/zoom and repopulate once the gesture settles.")
