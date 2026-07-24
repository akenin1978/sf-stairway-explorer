import { useEffect, useState } from 'react';
import { APIProvider, Map, Marker, InfoWindow } from '@vis.gl/react-google-maps';
import { supabase } from '../supabaseClient';
import Legend from './Legend';
import { getRatingStyle } from '../ratingColors';

const SF_CENTER = { lat: 37.7749, lng: -122.4194 };

export default function StairwayMap() {
  const [stairways, setStairways] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        >
          {stairways.map((s) => {
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
              <div className="info-window">
                <h3>{selected.neighborhood || 'Stairway'}</h3>
                <p>{selected.description}</p>
                {selected.rating != null && (
                  <p>Rating: {selected.rating}/5 — {getRatingStyle(selected.rating).label}</p>
                )}
                {selected.stair_count != null && (
                  <p>{selected.stair_count} stairs</p>
                )}
                {selected.photo_url && (
                  <img src={selected.photo_url} alt={selected.description} />
                )}
              </div>
            </InfoWindow>
          )}
        </Map>

        <Legend />
      </APIProvider>
    </div>
  );
}
