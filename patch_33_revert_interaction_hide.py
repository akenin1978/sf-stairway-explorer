#!/usr/bin/env python3
# Run from your project root: python3 patch_33_revert_interaction_hide.py
path = 'src/components/StairwayMap.jsx'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

# --- Edit 1: revert ViewportBoundsTracker back to idle-only bounds
# tracking, removing the interaction hide/show logic entirely ---
old_tracker = """function ViewportBoundsTracker({ onBoundsChange, onInteractingChange }) {
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
      console.log('[debug] interaction start -- hiding markers');
      onInteractingChange(true);
    }

    function handleIdle() {
      console.log('[debug] idle -- showing markers again');
      onInteractingChange(false);
      updateBounds();
    }

    const listeners = [
      map.addListener('dragstart', handleInteractionStart),
      map.addListener('zoom_changed', handleInteractionStart),
      map.addListener('idle', handleIdle),
    ];

    // dragstart/zoom_changed are Google Maps' own semantic events, but
    // pinch-to-zoom on touch devices doesn't always trigger them the same
    // way a desktop mouse-drag or scroll-wheel does. Listening for the
    // raw touchstart event directly on the map's container is a lower-
    // level, more reliable signal that fires the instant fingers touch
    // the screen, regardless of how Maps classifies the gesture.
    const container = map.getDiv();
    container.addEventListener('touchstart', handleInteractionStart, { passive: true });

    updateBounds();

    return () => {
      listeners.forEach((l) => l.remove());
      container.removeEventListener('touchstart', handleInteractionStart);
    };
  }, [map, onBoundsChange, onInteractingChange]);

  return null;
}"""

new_tracker = """function ViewportBoundsTracker({ onBoundsChange }) {
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

content = do_replace(content, old_tracker, new_tracker, "Edit 1 (revert ViewportBoundsTracker)")

# --- Edit 2: remove isInteracting state ---
content = do_replace(
    content,
    """  const [mapBounds, setMapBounds] = useState(null);
  const [isInteracting, setIsInteracting] = useState(false);""",
    "  const [mapBounds, setMapBounds] = useState(null);",
    "Edit 2 (remove isInteracting state)"
)

# --- Edit 3: revert the tracker mount ---
content = do_replace(
    content,
    "          <ViewportBoundsTracker onBoundsChange={setMapBounds} onInteractingChange={setIsInteracting} />",
    "          <ViewportBoundsTracker onBoundsChange={setMapBounds} />",
    "Edit 3 (revert mount)"
)

# --- Edit 4: revert the render back to plain culledStairways ---
content = do_replace(
    content,
    "          {(isInteracting ? [] : culledStairways).map((s) => {",
    "          {culledStairways.map((s) => {",
    "Edit 4 (revert render)"
)

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- reverted to viewport culling only. The mobile crash should be gone.")
