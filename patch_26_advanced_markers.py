#!/usr/bin/env python3
# Run from your project root: python3 patch_26_advanced_markers.py
path = 'src/components/StairwayMap.jsx'
with open(path) as f:
    content = f.read()

def do_replace(content, old, new, label):
    count = content.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly 1 match, found {count}. Stopping without further changes -- paste this error back and we'll fix it.")
    return content.replace(old, new)

# --- Edit 1: import AdvancedMarker instead of Marker ---
content = do_replace(
    content,
    "import { APIProvider, Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps';",
    "import { APIProvider, Map, AdvancedMarker, InfoWindow, useMap } from '@vis.gl/react-google-maps';",
    "Edit 1 (import)"
)

# --- Edit 2: read the Map ID env var, guard against it being missing
# (AdvancedMarker silently fails without a valid vector Map ID) ---
old_guard = """  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="status-banner">
        Missing VITE_GOOGLE_MAPS_API_KEY. Add it to your .env file (see
        .env.example) and restart the dev server.
      </div>
    );
  }"""

new_guard = """  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID;

  if (!apiKey) {
    return (
      <div className="status-banner">
        Missing VITE_GOOGLE_MAPS_API_KEY. Add it to your .env file (see
        .env.example) and restart the dev server.
      </div>
    );
  }

  if (!mapId) {
    return (
      <div className="status-banner">
        Missing VITE_GOOGLE_MAPS_MAP_ID. A vector Map ID is required for
        AdvancedMarker -- add it to your .env file and restart the dev
        server.
      </div>
    );
  }"""

content = do_replace(content, old_guard, new_guard, "Edit 2 (mapId guard)")

# --- Edit 3: pass mapId to the Map component ---
old_map = """        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={SF_CENTER}
          defaultZoom={12}
          minZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}"""

new_map = """        <Map
          mapId={mapId}
          style={{ width: '100%', height: '100%' }}
          defaultCenter={SF_CENTER}
          defaultZoom={12}
          minZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}"""

content = do_replace(content, old_map, new_map, "Edit 3 (mapId prop)")

# --- Edit 4: location halo ---
old_halo = """              <Marker
                position={myLocation}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: '#4b3ce0',
                  fillOpacity: 0.2,
                  strokeWeight: 0,
                  scale: 18,
                }}
                zIndex={997}
                clickable={false}
              />"""

new_halo = """              <AdvancedMarker position={myLocation} zIndex={997}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(75, 60, 224, 0.2)',
                    transform: 'translateY(50%)',
                    pointerEvents: 'none',
                  }}
                />
              </AdvancedMarker>"""

content = do_replace(content, old_halo, new_halo, "Edit 4 (halo marker)")

# --- Edit 5: direction flare ---
old_flare = """              {myHeading != null && (
                <Marker
                  position={myLocation}
                  icon={{
                    path: 'M 0,0 L -0.6,-1.3 Q 0,-1.6 0.6,-1.3 Z',
                    fillColor: '#4b3ce0',
                    fillOpacity: 0.35,
                    strokeWeight: 0,
                    scale: 18,
                    rotation: myHeading,
                    anchor: new window.google.maps.Point(0, 0),
                  }}
                  zIndex={998}
                  clickable={false}
                />
              )}"""

new_flare = """              {myHeading != null && (
                <AdvancedMarker position={myLocation} zIndex={998}>
                  <svg
                    width="48"
                    height="50"
                    viewBox="-24 -50 48 50"
                    style={{
                      transform: `rotate(${myHeading}deg)`,
                      transformOrigin: 'bottom center',
                      overflow: 'visible',
                      pointerEvents: 'none',
                    }}
                  >
                    <path d="M 0,0 L -18,-40 Q 0,-50 18,-40 Z" fill="#4b3ce0" fillOpacity="0.35" />
                  </svg>
                </AdvancedMarker>
              )}"""

content = do_replace(content, old_flare, new_flare, "Edit 5 (direction flare)")

# --- Edit 6: solid location dot ---
old_dot = """              <Marker
                position={myLocation}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: '#4b3ce0',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 2,
                  scale: 7,
                }}
                zIndex={999}
                clickable={false}
              />"""

new_dot = """              <AdvancedMarker position={myLocation} zIndex={999}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    background: '#4b3ce0',
                    border: '2px solid #ffffff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    transform: 'translateY(50%)',
                    pointerEvents: 'none',
                  }}
                />
              </AdvancedMarker>"""

content = do_replace(content, old_dot, new_dot, "Edit 6 (solid location dot)")

# --- Edit 7: the ~1200 stairway markers ---
old_stairways = """              <Marker
                key={s.id}
                position={{ lat: s.latitude, lng: s.longitude }}
                onClick={() => {
                  if (!spotMode) setSelected(s);
                }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: style.color,
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 1.5,
                  scale: 8,
                }}
                label={
                  isVerified
                    ? { text: '★', color: '#ffffff', fontSize: '10px', fontWeight: 'bold' }
                    : isChecked
                    ? { text: '✓', color: '#ffffff', fontSize: '10px', fontWeight: 'bold' }
                    : undefined
                }
              />"""

new_stairways = """              <AdvancedMarker
                key={s.id}
                position={{ lat: s.latitude, lng: s.longitude }}
                onClick={() => {
                  if (!spotMode) setSelected(s);
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: style.color,
                    border: '1.5px solid #ffffff',
                    transform: 'translateY(50%)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {isVerified ? (
                    <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold', lineHeight: 1 }}>★</span>
                  ) : isChecked ? (
                    <span style={{ color: '#ffffff', fontSize: 10, fontWeight: 'bold', lineHeight: 1 }}>✓</span>
                  ) : null}
                </div>
              </AdvancedMarker>"""

content = do_replace(content, old_stairways, new_stairways, "Edit 7 (stairway markers)")

# --- Edit 8: spot-mode pin ---
old_spot = """            <Marker
              position={{ lat: spotLocation.lat, lng: spotLocation.lng }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#e91e63',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 10,
              }}
            />"""

new_spot = """            <AdvancedMarker position={{ lat: spotLocation.lat, lng: spotLocation.lng }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: '#e91e63',
                  border: '2px solid #ffffff',
                  transform: 'translateY(50%)',
                }}
              />
            </AdvancedMarker>"""

content = do_replace(content, old_spot, new_spot, "Edit 8 (spot-mode pin)")

with open(path, 'w') as f:
    f.write(content)

print(f"Done: {path} -- all 5 marker usages migrated from Marker to AdvancedMarker, mapId wired in.")
