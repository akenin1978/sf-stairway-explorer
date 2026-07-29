import { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useCheckIns } from '../CheckInsContext';
import MapControlsPanel from './MapControlsPanel';
import { getRatingStyle } from '../ratingColors';

const SF_CENTER = { lat: 37.7749, lng: -122.4194 };

// Keeps the map locked to San Francisco proper -- including Treasure Island
// and Alcatraz -- so it can't be panned out across the country. Bounds are
// intentionally generous around the city's actual edges (Ocean Beach,
// McLaren Park/Crocker-Amazon in the south, the Presidio/Golden Gate Bridge
// in the north, Bayview/Hunters Point in the east) with a little padding.
// The northern bound in particular has extra headroom beyond Alcatraz/the
// bridge themselves -- MapPanner (below) needs room to pan further north
// to reveal a full info window card on mobile; without this buffer, the
// strict bounds cut that pan short and the top of the card gets clipped
// for stairways right at the old edge.
const SF_BOUNDS = {
  north: 37.87,
  south: 37.703,
  west: -122.515,
  east: -122.35,
};

// The set of rating "buckets" that can be toggled on/off: 5 down to 1, plus
// a special 'unrated' bucket for anything with no rating value.
const ALL_RATING_KEYS = [5, 4, 3, 2, 1, 'unrated'];

// Google's photo links end in a size/crop instruction like "=w600-h315-p-k"
// (width-height-pad/crop-flag). Swapping it for just a width (no height, no
// crop flag) asks Google's servers for the image scaled proportionally,
// with nothing cut off.
function uncroppedPhotoUrl(url) {
  if (!url) return url;
  return url.replace(/=[^=]*$/, '=w1200');
}

// When a marker is tapped, its info window (with photo, description, etc.)
// opens ABOVE the pin. On a small phone screen, if the pin is anywhere near
// the top of the visible map, that card can get cut off -- and since the
// photo loads in *after* the card first appears, the card grows taller
// partway through, so a pan calculated up front can go stale the moment the
// photo finishes loading.
//
// Instead of guessing a fixed offset, this measures the actual on-screen
// position of the rendered info window (via infoWindowRef) against the
// map's own bounding box, and pans by exactly the pixel amount needed to
// bring its top edge fully into view -- re-checking whenever `photoLoaded`
// flips true so the final, photo-included height is accounted for.
const TOP_MARGIN_PX = 16; // small breathing room from the map's top edge

function MapPanner({ target, photoLoaded, infoWindowRef }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;

    // Defer to the next tick so the InfoWindow has actually painted (and,
    // on the photoLoaded pass, so the <img> has taken up its final space)
    // before we measure it.
    const timeoutId = setTimeout(() => {
      const mapDiv = map.getDiv();
      const infoEl = infoWindowRef.current;
      if (!mapDiv || !infoEl) return;

      const mapRect = mapDiv.getBoundingClientRect();
      const infoRect = infoEl.getBoundingClientRect();

      const overflowTop = mapRect.top + TOP_MARGIN_PX - infoRect.top;
      if (overflowTop > 0) {
        // Card's top is above the visible map area (or too close to the
        // edge) -- shift the map so the card moves down by exactly that
        // many pixels. Negative y moves the map's center north, which
        // shifts on-screen content down.
        map.panBy(0, -overflowTop);
      }
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [map, target, photoLoaded, infoWindowRef]);

  return null;
}

function ratingKey(rating) {
  return rating == null ? 'unrated' : rating;
}

export default function StairwayMap({
  onReportIssue,
  onRequireSignIn,
  spotMode,
  onCancelSpot,
}) {
  const [stairways, setStairways] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { checkedInIds, toggleCheckIn } = useCheckIns();

  // --- "Spot a Stairway" state ---
  // spotLocation is null while the person still needs to pick where the
  // stairway is (tap the map, or use their current location). Once set,
  // we show the description form instead of the "tap the map" banner.
  const [spotLocation, setSpotLocation] = useState(null);
  const [spotDescription, setSpotDescription] = useState('');
  const [spotEmail, setSpotEmail] = useState('');
  const [spotStatus, setSpotStatus] = useState('idle'); // idle | submitting | success | error
  const [spotErrorMsg, setSpotErrorMsg] = useState('');

  // Reset everything when spot mode is turned off (whether from a
  // successful submit or hitting Cancel), and close any open stairway
  // info window the moment spot mode is turned on, so the two flows never
  // overlap on screen.
  useEffect(() => {
    if (!spotMode) {
      setSpotLocation(null);
      setSpotDescription('');
      setSpotEmail('');
      setSpotStatus('idle');
      setSpotErrorMsg('');
    } else {
      setSelected(null);
    }
  }, [spotMode]);

  function handleUseMyLocation() {
    if (!navigator.geolocation) {
      setSpotErrorMsg('Location services are not available in this browser.');
      return;
    }
    setSpotErrorMsg('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSpotLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          source: 'gps',
        });
      },
      () => {
        setSpotErrorMsg("Couldn't get your location -- try tapping the map instead.");
      }
    );
  }

  async function handleSpotSubmit(e) {
    e.preventDefault();
    if (!spotDescription.trim() || !spotLocation) return;

    setSpotStatus('submitting');

    const { error } = await supabase.from('stairway_submissions').insert({
      description: spotDescription.trim(),
      latitude: spotLocation.lat,
      longitude: spotLocation.lng,
      location_source: spotLocation.source,
      contact_email: spotEmail.trim() || null,
      user_id: user?.id ?? null,
    });

    if (error) {
      setSpotStatus('error');
      setSpotErrorMsg(error.message);
    } else {
      setSpotStatus('success');
    }
  }

  // Tracks whether the currently-open info window's photo has finished
  // loading, so MapPanner can re-measure and re-pan once the card reaches
  // its final height. Reset any time a different stairway is selected.
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const infoWindowRef = useRef(null);

  useEffect(() => {
    setPhotoLoaded(false);
  }, [selected]);

  // Which rating buckets are currently visible on the map. Starts with
  // everything shown, same as before this feature existed.
  const [visibleRatings, setVisibleRatings] = useState(new Set(ALL_RATING_KEYS));

  // Which neighborhoods are visible. Starts null ("not yet initialized") and
  // gets filled in with "everything" the moment the real data loads, since
  // we don't know the full neighborhood list until then.
  const [visibleNeighborhoods, setVisibleNeighborhoods] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStairways() {
      const { data, error } = await supabase
        .from('stairways')
        .select('*')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null);

      if (!isMounted) return;

      if (error) {
        setError(error.message);
      } else {
        setStairways(data ?? []);
      }
      setLoading(false);
    }

    loadStairways();
    return () => {
      isMounted = false;
    };
  }, []);

  const allNeighborhoods = useMemo(
    () =>
      [...new Set(stairways.map((s) => s.neighborhood).filter(Boolean))].sort(),
    [stairways]
  );

  // Once we know the real neighborhood list, default to showing all of them.
  useEffect(() => {
    if (allNeighborhoods.length > 0 && visibleNeighborhoods === null) {
      setVisibleNeighborhoods(new Set(allNeighborhoods));
    }
  }, [allNeighborhoods, visibleNeighborhoods]);

  const toggleRating = (key) => {
    setVisibleRatings((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleNeighborhood = (name) => {
    setVisibleNeighborhoods((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const showAllNeighborhoods = () => setVisibleNeighborhoods(new Set(allNeighborhoods));
  const hideAllNeighborhoods = () => setVisibleNeighborhoods(new Set());

  const visibleStairways = useMemo(() => {
    if (visibleNeighborhoods === null) return stairways;
    return stairways.filter(
      (s) =>
        visibleRatings.has(ratingKey(s.rating)) &&
        (s.neighborhood == null || visibleNeighborhoods.has(s.neighborhood))
    );
  }, [stairways, visibleRatings, visibleNeighborhoods]);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return (
      <div className="status-banner">
        Missing VITE_GOOGLE_MAPS_API_KEY. Add it to your .env file (see
        .env.example) and restart the dev server.
      </div>
    );
  }

  return (
    <div className="map-container">
      {loading && <div className="status-banner">Loading stairways…</div>}
      {error && (
        <div className="status-banner">
          Couldn't load stairways: {error}
        </div>
      )}

      <APIProvider apiKey={apiKey}>
        <Map
          style={{ width: '100%', height: '100%' }}
          defaultCenter={SF_CENTER}
          defaultZoom={12}
          minZoom={11}
          gestureHandling="greedy"
          disableDefaultUI={false}
          onClick={(e) => {
            if (spotMode) {
              const latLng = e.detail?.latLng;
              if (latLng) {
                setSpotLocation({ lat: latLng.lat, lng: latLng.lng, source: 'pin' });
                setSpotErrorMsg('');
              }
              return;
            }
            setSelected(null);
          }}
          restriction={{
            latLngBounds: SF_BOUNDS,
            strictBounds: true,
          }}
        >
          <MapPanner
            target={selected}
            photoLoaded={photoLoaded}
            infoWindowRef={infoWindowRef}
          />

          {visibleStairways.map((s) => {
            const style = getRatingStyle(s.rating);
            const isChecked = checkedInIds.has(s.id);
            return (
              <Marker
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
                  isChecked
                    ? { text: '✓', color: '#ffffff', fontSize: '10px', fontWeight: 'bold' }
                    : undefined
                }
              />
            );
          })}

          {selected && !spotMode && (
            <InfoWindow
              position={{ lat: selected.latitude, lng: selected.longitude }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="info-window" ref={infoWindowRef}>
                <button
                  className="info-window-close"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                >
                  ×
                </button>
                <h3>{selected.neighborhood || 'Stairway'}</h3>

                <p>{selected.description}</p>
                {selected.rating != null && (
                  <p>Rating: {selected.rating}</p>
                )}
                {selected.stair_count != null && (
                  <p>{selected.stair_count} stairs</p>
                )}
                {selected.direct_photo_url ? (
                  <img
                    src={uncroppedPhotoUrl(selected.direct_photo_url)}
                    alt={selected.description}
                    referrerPolicy="no-referrer"
                    onLoad={() => setPhotoLoaded(true)}
                    onError={() => setPhotoLoaded(true)}
                  />
                ) : selected.photo_url ? (
                  <p>
                    <a href={selected.photo_url} target="_blank" rel="noreferrer">
                      View photo on Google Photos ↗
                    </a>
                  </p>
                ) : null}

                {user ? (
                  <button
                    className={
                      'checkin-toggle' +
                      (checkedInIds.has(selected.id) ? ' checked' : '')
                    }
                    onClick={() => toggleCheckIn(selected.id)}
                  >
                    {checkedInIds.has(selected.id) ? '✓ Spotted' : 'Mark as spotted'}
                  </button>
                ) : (
                  <button
                    className="checkin-toggle signin-prompt"
                    onClick={() => onRequireSignIn?.()}
                  >
                    Sign in to save your spots
                  </button>
                )}

                <button
                  className="report-issue-link"
                  onClick={() => onReportIssue?.(selected)}
                >
                  Report an issue with this stairway
                </button>
              </div>
            </InfoWindow>
          )}
          {spotMode && spotLocation && (
            <Marker
              position={{ lat: spotLocation.lat, lng: spotLocation.lng }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: '#e91e63',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
                scale: 10,
              }}
            />
          )}
        </Map>

        <MapControlsPanel
          visibleRatings={visibleRatings}
          onToggleRating={toggleRating}
          allNeighborhoods={allNeighborhoods}
          visibleNeighborhoods={visibleNeighborhoods ?? new Set()}
          onToggleNeighborhood={toggleNeighborhood}
          onShowAllNeighborhoods={showAllNeighborhoods}
          onHideAllNeighborhoods={hideAllNeighborhoods}
        />

        {spotMode && !spotLocation && (
          <div className="spot-banner">
            <span>Tap the map to mark where you spotted a stairway</span>
            {spotErrorMsg && (
              <span className="spot-banner-error">{spotErrorMsg}</span>
            )}
            <div className="spot-banner-actions">
              <button type="button" onClick={handleUseMyLocation}>
                Use my location
              </button>
              <button type="button" onClick={onCancelSpot}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {spotMode && spotLocation && (
          <div className="spot-form-card">
            {spotStatus === 'success' ? (
              <div>
                <h2>Thanks!</h2>
                <p>I'll take a look and add it to the map if it checks out.</p>
                <button type="button" onClick={onCancelSpot}>
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSpotSubmit}>
                <h2>Spot a Stairway</h2>
                <p className="modal-context">
                  {spotLocation.source === 'gps'
                    ? 'Using your current location.'
                    : 'Location: where you tapped on the map.'}{' '}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => setSpotLocation(null)}
                  >
                    Change location
                  </button>
                </p>

                <textarea
                  placeholder="Describe the stairway and where exactly it is (cross streets, landmarks, etc.)"
                  value={spotDescription}
                  onChange={(e) => setSpotDescription(e.target.value)}
                  rows={4}
                  required
                />

                <input
                  type="email"
                  placeholder="Your email (optional, if you'd like a reply)"
                  value={spotEmail}
                  onChange={(e) => setSpotEmail(e.target.value)}
                />

                {spotStatus === 'error' && (
                  <p className="modal-error">
                    Something went wrong: {spotErrorMsg}
                  </p>
                )}

                <div className="spot-form-buttons">
                  <button
                    type="button"
                    className="spot-form-cancel"
                    onClick={onCancelSpot}
                  >
                    Cancel
                  </button>
                  <button type="submit" disabled={spotStatus === 'submitting'}>
                    {spotStatus === 'submitting' ? 'Submitting…' : 'Submit'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </APIProvider>
    </div>
  );
}
