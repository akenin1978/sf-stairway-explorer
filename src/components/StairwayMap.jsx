import { useEffect, useMemo, useRef, useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { supabase } from '../supabaseClient';
import MapControlsPanel from './MapControlsPanel';
import { getRatingStyle } from '../ratingColors';

const SF_CENTER = { lat: 37.7749, lng: -122.4194 };

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

export default function StairwayMap({ onReportIssue }) {
  const [stairways, setStairways] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
          gestureHandling="greedy"
          disableDefaultUI={false}
          onClick={() => setSelected(null)}
        >
          <MapPanner
            target={selected}
            photoLoaded={photoLoaded}
            infoWindowRef={infoWindowRef}
          />

          {visibleStairways.map((s) => {
            const style = getRatingStyle(s.rating);
            return (
              <Marker
                key={s.id}
                position={{ lat: s.latitude, lng: s.longitude }}
                onClick={() => setSelected(s)}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  fillColor: style.color,
                  fillOpacity: 0.9,
                  strokeColor: '#ffffff',
                  strokeWeight: 1.5,
                  scale: 8,
                }}
              />
            );
          })}

          {selected && (
            <InfoWindow
              position={{ lat: selected.latitude, lng: selected.longitude }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="info-window" ref={infoWindowRef}>
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
                <button
                  className="report-issue-link"
                  onClick={() => onReportIssue?.(selected)}
                >
                  Report an issue with this stairway
                </button>
              </div>
            </InfoWindow>
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
      </APIProvider>
    </div>
  );
}
