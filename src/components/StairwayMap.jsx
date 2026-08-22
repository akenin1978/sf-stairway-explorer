import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  APIProvider,
  Map,
  Marker,
  InfoWindow,
  useMap,
} from '@vis.gl/react-google-maps';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useCheckIns } from '../CheckInsContext';
import { useBadges } from '../BadgesContext';
import MapControlsPanel from './MapControlsPanel';
import { getRatingStyle } from '../ratingColors';
import BadgeEarnedModal from './BadgeEarnedModal';
import ConfirmDialog from './ConfirmDialog';

// Resize + re-encode a captured photo before upload. Modern phone cameras
// produce multi-MB images; on iOS Safari in particular, camera capture
// (via capture="environment") already puts real memory pressure on the
// tab, and holding a large original file in memory while it uploads can
// cause the OS to silently reload the page mid-verification -- which
// looks exactly like "nothing happened," no error shown anywhere.
// Shrinking the file right after capture reduces that risk and speeds
// up the upload.
function compressPhoto(file, maxDimension = 1600, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            reject(new Error('compression-produced-no-blob'));
            return;
          }
          resolve(new File([blob], 'checkin.jpg', { type: 'image/jpeg' }));
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image-load-failed'));
    };

    img.src = objectUrl;
  });
}

const SF_CENTER = { lat: 37.7749, lng: -122.4194 };

// Keeps the map locked to San Francisco proper -- including Treasure Island
// and Alcatraz -- so it can't be panned out across the country, while
// giving Google's own info-window auto-pan (never disabled) enough room
// to shift the map and reveal a full card, even at the map's minimum zoom
// (11) where each on-screen pixel covers the most ground and a card needs
// the most degrees of "pan budget" to fully come into view. Worked out
// from the actual pixel-to-degree math at zoom 11 for SF's latitude
// (~60m/pixel), sized for a generously tall card (~500px): about 0.3
// degrees of latitude and 0.35 degrees of longitude beyond the city's
// true edges. Still just Bay Area (Marin/Peninsula/East Bay suburbs, or
// open ocean to the west) -- nowhere near "the rest of the country."
const SF_BOUNDS = {
  north: 38.135,
  south: 37.403,
  west: -122.865,
  east: -122.0,
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

function ratingKey(rating) {
  return rating == null ? 'unrated' : rating;
}

// Camera-only capture and reliable GPS both depend on being on a phone or
// tablet, not a laptop/desktop. Modern iPads report their user agent as
// "Macintosh" (Apple did this on purpose for web compatibility), so a
// plain device-name check alone would wrongly treat an iPad as a desktop
// -- checking for touch support alongside catches that case too.
function isMobileOrTablet() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isObviouslyMobile = /iPhone|iPad|iPod|Android/i.test(ua);
  const isTouchDisguisedAsMac =
    /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return isObviouslyMobile || isTouchDisguisedAsMac;
}

// Purely cosmetic-but-necessary: gently centers the map on whichever
// stairway is selected. Google's own InfoWindow auto-pan is supposed to
// handle bringing a tapped/off-screen marker into view on its own, but in
// practice that's not reliable enough by itself on mobile -- especially
// once our own max-height/overflow-y CSS on the card content is in the
// mix. This is intentionally simple (no DOM measurement, no timing
// dependency on photos loading) specifically so it can't reintroduce the
// fragility of the old pixel-measuring approach we removed earlier.
function MapRecenter({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.latitude, lng: target.longitude });
    // Dead-centering the marker only leaves half the screen's height
    // above it -- often not enough room for a tall card (title +
    // description + rating/steps line + full photo + two action
    // buttons). Shifting the marker further down the screen leaves much
    // more headroom above it for the card to actually fit. This is a
    // fixed, deterministic offset (not a measurement of the actual
    // card), so it can't reintroduce the fragility of the pixel-
    // measuring approach we removed earlier. Bumped from -140 to -230
    // after a real card (photo + meta line + Mark as spotted + Verify
    // with photo) still had its title clipped above the screen at the
    // smaller offset -- backed up by the card's own internal scroll
    // (see .info-window CSS) for the rare card still too tall even with
    // this much room.
    map.panBy(0, -230);
  }, [map, target]);

  return null;
}

// Pans (and zooms in on) the map whenever a new "my location" result comes
// in. Mirrors MapRecenter above -- same simple, no-DOM-measurement approach.
function PanToUserLocation({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    map.setZoom(16);
  }, [map, target]);

  return null;
}

function StairwayMarkers({
  stairways,
  checkedInIds,
  checkedInMethods,
  spotMode,
  onSelect,
}) {
  return stairways.map((stairway) => {
    const style = getRatingStyle(stairway.rating);
    const isChecked = checkedInIds.has(stairway.id);
    const isVerified =
      checkedInMethods.get(stairway.id) === 'photo-verified';

    return (
      <Marker
        key={stairway.id}
        position={{ lat: stairway.latitude, lng: stairway.longitude }}
        onClick={() => {
          if (!spotMode) onSelect(stairway);
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
            ? {
                text: '★',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 'bold',
              }
            : isChecked
            ? {
                text: '✓',
                color: '#ffffff',
                fontSize: '10px',
                fontWeight: 'bold',
              }
            : undefined
        }
      />
    );
  });
}

// Tracks the map's current visible area (with some padding) so the
// stairway list can be culled to only what's on/near screen, instead of
// rendering all ~1200 markers regardless of zoom level. Updates on
// 'idle' -- which fires once after a pan/zoom gesture settles, not on
// every frame -- so recalculating bounds doesn't itself cause a
// re-render storm during the gesture.
function ViewportBoundsTracker({
  onBoundsChange,
  onInteractionChange,
  onZoomChange,
}) {
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

    function handleInteractionStart() {
      onInteractionChange(true);
    }

    function handleIdle() {
      updateBounds();
      onZoomChange(map.getZoom());
      onInteractionChange(false);
    }

    const listeners = [
      map.addListener('dragstart', handleInteractionStart),
      map.addListener('zoom_changed', handleInteractionStart),
      map.addListener('idle', handleIdle),
    ];

    // Pointer events catch touch, pen, and mouse interaction immediately,
    // including mobile pinch gestures that Google Maps may classify
    // differently from a desktop drag.
    const container = map.getDiv();
    container.addEventListener('pointerdown', handleInteractionStart, {
      passive: true,
    });

    updateBounds();
    onZoomChange(map.getZoom());

    return () => {
      listeners.forEach((listener) => listener.remove());
      container.removeEventListener('pointerdown', handleInteractionStart);
    };
  }, [map, onBoundsChange, onInteractionChange, onZoomChange]);

  return null;
}

// The round "locate me" button that floats over the map, bottom-right,
// positioned above Google's own zoom controls so the two don't overlap.
function LocateMeButton({ onLocate, locating }) {
  return (
    <button
      type="button"
      className="locate-me-button"
      onClick={onLocate}
      disabled={locating}
      aria-label="Find my location"
      title="Find my location"
      style={{
        position: 'absolute',
        bottom: '96px',
        right: '10px',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        border: 'none',
        background: '#ffffff',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: locating ? 'default' : 'pointer',
        padding: 0,
        zIndex: 5,
      }}
    >
      {locating ? (
        <span style={{ fontSize: '14px' }}>…</span>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" fill="#4b3ce0" />
          <path
            d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12"
            stroke="#4b3ce0"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

function formatSpottedDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function StairwayMap({
  onReportIssue,
  onRequireSignIn,
  spotMode,
  onCancelSpot,
  spottedListOpen,
  onCloseSpottedList,
}) {
  const [stairways, setStairways] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  const { checkedInIds, checkedInDates, checkedInMethods, toggleCheckIn, verifyWithPhoto } =
    useCheckIns();
  const { checkAndAwardBadges } = useBadges();

  // --- Badge-earned alert state ---
  const [badgeQueue, setBadgeQueue] = useState([]);

  // --- Custom confirm dialog state (replaces window.confirm, which always
  // shows the raw site URL -- not ideal before we have a custom domain) ---
  const [confirmAction, setConfirmAction] = useState(null); // { message, onConfirm } | null

  // Shared logic for adding a check-in + checking for newly-earned badges.
  // Pulled out of the button's onClick so both the direct-toggle path and
  // the "confirmed via dialog" path call the exact same code.
  async function performCheckInToggle(stairway) {
    const wasAdding = !checkedInIds.has(stairway.id);
    const result = await toggleCheckIn(stairway.id);

    if (wasAdding && !result.error) {
      const updatedIds = new Set(checkedInIds).add(stairway.id);
      checkAndAwardBadges(stairways, updatedIds, stairway.id)
        .then((newBadges) => {
          if (newBadges && newBadges.length > 0) setBadgeQueue(newBadges);
        })
        .catch((err) => console.error('Badge check failed', err));
    }
  }

  // --- Photo verification state ---
  const [verifyStatus, setVerifyStatus] = useState('idle'); // idle | verifying | error
  const [verifyErrorMsg, setVerifyErrorMsg] = useState('');
  const verifyFileInputRef = useRef(null);

  useEffect(() => {
    setVerifyStatus('idle');
    setVerifyErrorMsg('');
  }, [selected]);

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!selected) return;

    // Previously this silently did nothing if no file came back from the
    // camera/picker (e.g. cancelled, or a capture that didn't register) --
    // that's indistinguishable from "it saved" without this message.
    if (!file) {
      setVerifyStatus('error');
      setVerifyErrorMsg(
        "No photo was captured -- try again and make sure to take or choose a photo."
      );
      return;
    }

    setVerifyStatus('verifying');
    setVerifyErrorMsg('');

    let uploadFile = file;
    try {
      uploadFile = await compressPhoto(file);
    } catch (err) {
      // Compression is a mitigation, not a requirement -- if it fails for
      // any reason, fall back to the original file rather than blocking
      // verification entirely.
      console.error('Photo compression failed, using original file', err);
      uploadFile = file;
    }

    const { error, distance } = await verifyWithPhoto(selected, uploadFile);

    if (error) {
      setVerifyStatus('error');
      if (error === 'too-far') {
        const applicableThreshold = selected.verification_radius_feet ?? 300;
        const isLine =
          selected.verification_line_start_lat != null &&
          selected.verification_line_end_lat != null;
        setVerifyErrorMsg(
          isLine
            ? `You're about ${distance}ft from the nearest point along this stretch -- get within ${applicableThreshold}ft to verify.`
            : `You're about ${distance}ft away -- get within ${applicableThreshold}ft of the stairway to verify.`
        );
      } else if (error === 'location-failed') {
        setVerifyErrorMsg(
          "Couldn't get your location -- check that location access is allowed for this site."
        );
      } else if (error === 'no-geolocation') {
        setVerifyErrorMsg('Location services are not available in this browser.');
      } else {
        setVerifyErrorMsg('Something went wrong saving your verification. Try again?');
      }
    } else {
      setVerifyStatus('idle');
      const updatedIds = new Set(checkedInIds).add(selected.id);
      checkAndAwardBadges(stairways, updatedIds, selected.id)
        .then((newBadges) => {
          if (newBadges && newBadges.length > 0) setBadgeQueue(newBadges);
        })
        .catch((err) => console.error('Badge check failed', err));
    }
  }

  // --- "My Spotted Stairways" list state ---
  const [spottedSearch, setSpottedSearch] = useState('');
  const [spottedSort, setSpottedSort] = useState('recent'); // recent | neighborhood | rating | stair_count
  const [spottedNeighborhoodFilter, setSpottedNeighborhoodFilter] = useState('');

  // Close the info window whenever the list panel opens, so the two don't
  // overlap on screen.
  useEffect(() => {
    if (spottedListOpen) setSelected(null);
  }, [spottedListOpen]);

  const spottedStairways = useMemo(() => {
    let list = stairways.filter((s) => checkedInIds.has(s.id));

    if (spottedNeighborhoodFilter) {
      list = list.filter((s) => s.neighborhood === spottedNeighborhoodFilter);
    }

    if (spottedSearch.trim()) {
      const q = spottedSearch.trim().toLowerCase();
      list = list.filter((s) => s.description?.toLowerCase().includes(q));
    }

    const sorted = [...list];
    if (spottedSort === 'recent') {
      sorted.sort((a, b) => {
        const dateA = checkedInDates.get(a.id) || '';
        const dateB = checkedInDates.get(b.id) || '';
        return dateB.localeCompare(dateA); // newest first
      });
    } else if (spottedSort === 'neighborhood') {
      sorted.sort((a, b) =>
        (a.neighborhood || '').localeCompare(b.neighborhood || '')
      );
    } else if (spottedSort === 'rating') {
      sorted.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (spottedSort === 'stair_count') {
      sorted.sort((a, b) => (b.stair_count ?? -1) - (a.stair_count ?? -1));
    }

    return sorted;
  }, [
    stairways,
    checkedInIds,
    checkedInDates,
    spottedSearch,
    spottedSort,
    spottedNeighborhoodFilter,
  ]);

  // Only offer neighborhoods the user has actually spotted something in,
  // rather than every neighborhood in the whole database -- keeps the
  // filter dropdown relevant to their own progress.
  const spottedNeighborhoods = useMemo(() => {
    const set = new Set(
      stairways
        .filter((s) => checkedInIds.has(s.id))
        .map((s) => s.neighborhood)
        .filter(Boolean)
    );
    return [...set].sort();
  }, [stairways, checkedInIds]);

  function jumpToSpottedStairway(stairway) {
    onCloseSpottedList?.();
    setSelected(stairway);
  }

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

  // --- "Locate me" (general map button, separate from the Spot-a-Stairway
  // "use my location" flow above) ---
  const [myLocation, setMyLocation] = useState(null);
  // Separate from myLocation -- myLocation updates continuously (for the
  // dot + flare), but panTarget only updates once per "locate me" tap,
  // so the map centers/zooms once and then leaves scroll/zoom alone
  // instead of snapping back on every GPS update while you're walking.
  const [panTarget, setPanTarget] = useState(null);
  const [myHeading, setMyHeading] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  const locationWatchIdRef = useRef(null);
  const hasCenteredRef = useRef(false);

  // "Locate me" now tracks continuously (watchPosition) instead of taking
  // a single one-time fix (getCurrentPosition) -- the direction flare
  // needs live updates as you walk. GPS heading only comes through from
  // the browser while actually moving, so it's null when stationary;
  // that's why the flare only appears once you're walking, not the
  // instant you tap the button.
  function handleLocateMe() {
    if (!navigator.geolocation) {
      setLocationError('Location services are not available in this browser.');
      return;
    }
    setLocating(true);
    setLocationError('');

    if (locationWatchIdRef.current != null) {
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
      },
      () => {
        setLocationError(
          "Couldn't get your location -- check your device's location permissions."
        );
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Stop watching when the map unmounts -- otherwise this would keep
  // requesting location updates (and draining battery) indefinitely.
  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current != null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
    };
  }, []);

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
      // A single unbounded request silently caps out at Supabase's
      // default max-rows-per-request limit (1,000) -- with 1,100+
      // stairways, that meant the last ~100 or so never actually loaded,
      // even though nothing looked obviously wrong. Paging through in
      // batches, stopping only once a page comes back with fewer rows
      // than we asked for, guarantees we always get everything regardless
      // of how large the table grows or what the server's cap is set to.
      const PAGE_SIZE = 500;
      let allRows = [];
      let from = 0;

      while (true) {
        const { data, error } = await supabase
          .from('stairways')
          .select('*')
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);

        if (error) {
          if (isMounted) {
            setError(error.message);
            setLoading(false);
          }
          return;
        }

        const rows = data ?? [];
        allRows = allRows.concat(rows);

        if (rows.length < PAGE_SIZE) break; // reached the true end of the table
        from += PAGE_SIZE;
      }

      if (!isMounted) return;
      setStairways(allRows);
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

  const [mapBounds, setMapBounds] = useState(null);
  const [, setIsMapInteracting] = useState(false);
  const [mapZoom, setMapZoom] = useState(12);

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
          mapTypeControlOptions={
            window.google?.maps?.MapTypeControlStyle
              ? { style: window.google.maps.MapTypeControlStyle.DROPDOWN_MENU }
              : undefined
          }
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
          <MapRecenter target={selected} />
          <PanToUserLocation target={panTarget} />
          <ViewportBoundsTracker
            onBoundsChange={setMapBounds}
            onInteractionChange={setIsMapInteracting}
            onZoomChange={setMapZoom}
          />
          {myLocation && (
            <>
              {/* Soft outer halo -- makes this read as "a location marker"
                  rather than just another colored dot, distinct in both
                  shape and color from every rating marker on the map. */}
              <Marker
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
              />
              {/* Direction flare -- only appears once we have a real travel
                  heading (i.e. you're actually walking, not standing
                  still). rotation is degrees clockwise from north, same
                  convention GPS heading already uses, so no conversion
                  needed before passing it straight through. */}
              {myHeading != null && (
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
              )}
              <Marker
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
              />
            </>
          )}
          <StairwayMarkers
            stairways={culledStairways}
            checkedInIds={checkedInIds}
            checkedInMethods={checkedInMethods}
            spotMode={spotMode}
            onSelect={setSelected}
          />

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

          {selected && !spotMode && (
            <InfoWindow
              position={{ lat: selected.latitude, lng: selected.longitude }}
              onCloseClick={() => setSelected(null)}
            >
              <div className="info-window">
                <button
                  className="info-window-close"
                  onClick={() => setSelected(null)}
                  aria-label="Close"
                >
                  ×
                </button>
                <h3 className="info-window-title">{selected.description}</h3>

                {(selected.rating != null || selected.stair_count != null) && (
                  <p className="info-window-meta">
                    {selected.rating != null && `Rating: ${selected.rating}`}
                    {selected.rating != null && selected.stair_count != null && ', '}
                    {selected.stair_count != null && `Steps: ${selected.stair_count}`}
                  </p>
                )}
                {selected.direct_photo_url ? (
                  <img
                    src={uncroppedPhotoUrl(selected.direct_photo_url)}
                    alt={selected.description}
                    referrerPolicy="no-referrer"
                  />
                ) : selected.photo_url ? (
                  <p>
                    <a href={selected.photo_url} target="_blank" rel="noreferrer">
                      View photo on Google Photos ↗
                    </a>
                  </p>
                ) : null}

                {user ? (
                  <>
                    <button
                      className={
                        'checkin-toggle' +
                        (checkedInIds.has(selected.id) ? ' checked' : '')
                      }
                      onClick={async () => {
                        // A plain self-reported check-in un-toggles freely --
                        // that's cheap to redo. But un-checking a
                        // photo-verified one deletes the whole check-in row,
                        // photo reference included, with no way back through
                        // the app. One confirmation catches an accidental
                        // second tap without slowing down anyone who
                        // genuinely wants to undo a real mistake.
                        const isVerified =
                          checkedInMethods.get(selected.id) === 'photo-verified';
                        if (isVerified) {
                          setConfirmAction({
                            message:
                              "This will remove your photo verification for this stairway too -- there's no way to undo it. Continue?",
                            onConfirm: () => performCheckInToggle(selected),
                          });
                          return;
                        }

                        await performCheckInToggle(selected);
                      }}
                    >
                      {checkedInMethods.get(selected.id) === 'photo-verified'
                        ? '✓ Verified'
                        : checkedInIds.has(selected.id)
                        ? '✓ Spotted'
                        : 'Mark as spotted'}
                    </button>

                    {checkedInMethods.get(selected.id) !== 'photo-verified' &&
                      (isMobileOrTablet() ? (
                        <button
                          className="verify-photo-button"
                          onClick={() => verifyFileInputRef.current?.click()}
                          disabled={verifyStatus === 'verifying'}
                        >
                          {verifyStatus === 'verifying'
                            ? 'Verifying…'
                            : '📷 Verify with photo'}
                        </button>
                      ) : (
                        <p className="verify-desktop-hint">
                          Open this app on mobile to verify with a photo.
                        </p>
                      ))}

                    <input
                      ref={verifyFileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      style={{ display: 'none' }}
                      onChange={handlePhotoSelected}
                    />

                    {verifyStatus === 'error' && (
                      <p className="verify-error">{verifyErrorMsg}</p>
                    )}
                  </>
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
        </Map>

        <LocateMeButton onLocate={handleLocateMe} locating={locating} />
        {locationError && (
          <div
            style={{
              position: 'absolute',
              bottom: '142px',
              right: '10px',
              maxWidth: '220px',
              background: '#ffffff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '8px 10px',
              fontSize: '13px',
              color: '#c0392b',
              zIndex: 5,
            }}
          >
            {locationError}
          </div>
        )}

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

      {spottedListOpen && (
        <div className="modal-backdrop" onClick={onCloseSpottedList}>
          <div
            className="modal-card spotted-list-card"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={onCloseSpottedList}
              aria-label="Close"
            >
              ×
            </button>

            <h2>My Spotted Stairways</h2>
            <p className="modal-context">
              {checkedInIds.size} / {stairways.length || '…'} spotted
            </p>

            <input
              type="text"
              className="spotted-search-input"
              placeholder="Search your spotted stairways…"
              value={spottedSearch}
              onChange={(e) => setSpottedSearch(e.target.value)}
            />

            <div className="spotted-controls">
              <select
                value={spottedSort}
                onChange={(e) => setSpottedSort(e.target.value)}
              >
                <option value="recent">Sort: Most recent</option>
                <option value="neighborhood">Sort: Neighborhood</option>
                <option value="rating">Sort: Rating</option>
                <option value="stair_count">Sort: Stair count</option>
              </select>

              <select
                value={spottedNeighborhoodFilter}
                onChange={(e) => setSpottedNeighborhoodFilter(e.target.value)}
              >
                <option value="">All neighborhoods</option>
                {spottedNeighborhoods.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="spotted-list">
              {spottedStairways.length === 0 ? (
                <p className="spotted-list-empty">
                  {checkedInIds.size === 0
                    ? "You haven't spotted any stairways yet -- tap a pin on the map and mark it as spotted!"
                    : 'No spotted stairways match your search/filter.'}
                </p>
              ) : (
                spottedStairways.map((s) => (
                  <button
                    key={s.id}
                    className="spotted-list-item"
                    onClick={() => jumpToSpottedStairway(s)}
                  >
                    <span className="spotted-list-item-desc">
                      {s.description || 'Stairway'}
                      {checkedInMethods.get(s.id) === 'photo-verified' && (
                        <span className="spotted-list-item-verified">
                          ★ Verified
                        </span>
                      )}
                    </span>
                    <span className="spotted-list-item-meta">
                      {s.neighborhood}
                      {s.rating != null ? ` · Rating ${s.rating}` : ''}
                      {s.stair_count != null ? ` · ${s.stair_count} stairs` : ''}
                    </span>
                    <span className="spotted-list-item-date">
                      {formatSpottedDate(checkedInDates.get(s.id))}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {badgeQueue.length > 0 && (
        <BadgeEarnedModal badges={badgeQueue} onClose={() => setBadgeQueue([])} />
      )}

      {confirmAction && (
        <ConfirmDialog
          message={confirmAction.message}
          onConfirm={() => {
            confirmAction.onConfirm();
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
