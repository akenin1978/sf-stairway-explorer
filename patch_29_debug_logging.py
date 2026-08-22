#!/usr/bin/env python3
# TEMPORARY -- run from your project root: python3 patch_29_debug_logging.py
# This just adds console.log calls so we can see in the browser console
# whether the drag/zoom/idle events are actually firing. We'll remove
# these once we've confirmed what's happening.
path = 'src/components/StairwayMap.jsx'
with open(path) as f:
    content = f.read()

old = """    function handleInteractionStart() {
      onInteractingChange(true);
    }

    function handleIdle() {
      onInteractingChange(false);
      updateBounds();
    }"""

new = """    function handleInteractionStart() {
      console.log('[debug] interaction start -- hiding markers');
      onInteractingChange(true);
    }

    function handleIdle() {
      console.log('[debug] idle -- showing markers again');
      onInteractingChange(false);
      updateBounds();
    }"""

count = content.count(old)
if count != 1:
    raise SystemExit(f"Expected exactly 1 match, found {count}. Stopping without changes -- paste this error back and we'll fix it.")

content = content.replace(old, new)
with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- temporary debug logging added.")
