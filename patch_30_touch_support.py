#!/usr/bin/env python3
# Run from your project root: python3 patch_30_touch_support.py
path = 'src/components/StairwayMap.jsx'
with open(path) as f:
    content = f.read()

old = """    const listeners = [
      map.addListener('dragstart', handleInteractionStart),
      map.addListener('zoom_changed', handleInteractionStart),
      map.addListener('idle', handleIdle),
    ];
    updateBounds();

    return () => listeners.forEach((l) => l.remove());
  }, [map, onBoundsChange, onInteractingChange]);"""

new = """    const listeners = [
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
  }, [map, onBoundsChange, onInteractingChange]);"""

count = content.count(old)
if count != 1:
    raise SystemExit(f"Expected exactly 1 match, found {count}. Stopping without changes -- paste this error back and we'll fix it.")

content = content.replace(old, new)
with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- pinch-zoom on touch devices should now reliably hide markers during the gesture, same as desktop drag/zoom.")
