import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';

const CheckInsContext = createContext(null);

// Defined in feet since that's the unit used everywhere else in this app
// (US audience, and how override radii for long stairways get measured
// and calibrated) -- meters is just what the distance math needs
// internally.
const GPS_THRESHOLD_FEET = 250;
const GPS_THRESHOLD_METERS = GPS_THRESHOLD_FEET * 0.3048;

function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Pulls the storage path back out of a public Supabase Storage URL, so a
// deleted check-in can also clean up the actual photo file instead of
// leaving it orphaned in storage forever. Returns null if the URL doesn't
// match the expected shape rather than guessing. Exported so account
// deletion can reuse the same logic for every photo at once.
export function storagePathFromPublicUrl(publicUrl) {
  if (!publicUrl) return null;
  const marker = '/checkin-photos/';
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return publicUrl.slice(idx + marker.length);
}

export function CheckInsProvider({ children }) {
  const { user } = useAuth();
  const [checkedInIds, setCheckedInIds] = useState(new Set());
  const [checkedInDates, setCheckedInDates] = useState(new Map());
  const [checkedInMethods, setCheckedInMethods] = useState(new Map());
  const [checkedInPhotoUrls, setCheckedInPhotoUrls] = useState(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setCheckedInIds(new Set());
      setCheckedInDates(new Map());
      setCheckedInMethods(new Map());
      setCheckedInPhotoUrls(new Map());
      return;
    }

    let isMounted = true;
    setLoading(true);

    supabase
      .from('check_ins')
      .select('stairway_id, created_at, verification_method, photo_url')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) {
          setCheckedInIds(new Set(data.map((row) => row.stairway_id)));
          setCheckedInDates(
            new Map(data.map((row) => [row.stairway_id, row.created_at]))
          );
          setCheckedInMethods(
            new Map(
              data.map((row) => [
                row.stairway_id,
                row.verification_method || 'self-reported',
              ])
            )
          );
          setCheckedInPhotoUrls(
            new Map(
              data
                .filter((row) => row.photo_url)
                .map((row) => [row.stairway_id, row.photo_url])
            )
          );
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const toggleCheckIn = useCallback(
    async (stairwayId) => {
      if (!user) return { error: 'not-signed-in' };

      const wasChecked = checkedInIds.has(stairwayId);

      setCheckedInIds((prev) => {
        const next = new Set(prev);
        wasChecked ? next.delete(stairwayId) : next.add(stairwayId);
        return next;
      });

      if (wasChecked) {
        // Grab this before clearing local state below, since we need it
        // to clean up the actual photo file in storage -- otherwise a
        // removed check-in leaves an orphaned file behind forever.
        const photoUrlToClean = checkedInPhotoUrls.get(stairwayId);

        setCheckedInDates((prev) => {
          const next = new Map(prev);
          next.delete(stairwayId);
          return next;
        });
        setCheckedInMethods((prev) => {
          const next = new Map(prev);
          next.delete(stairwayId);
          return next;
        });
        setCheckedInPhotoUrls((prev) => {
          const next = new Map(prev);
          next.delete(stairwayId);
          return next;
        });

        const { error } = await supabase
          .from('check_ins')
          .delete()
          .eq('user_id', user.id)
          .eq('stairway_id', stairwayId);

        if (error) {
          setCheckedInIds((prev) => new Set(prev).add(stairwayId));
          return { error };
        }

        // Best-effort cleanup -- if this fails, the check-in itself is
        // still correctly deleted, it just leaves one unused file behind.
        // Not worth failing the whole un-check over.
        const storagePath = storagePathFromPublicUrl(photoUrlToClean);
        if (storagePath) {
          supabase.storage
            .from('checkin-photos')
            .remove([storagePath])
            .catch(() => {});
        }
      } else {
        const optimisticDate = new Date().toISOString();
        setCheckedInDates((prev) =>
          new Map(prev).set(stairwayId, optimisticDate)
        );
        setCheckedInMethods((prev) =>
          new Map(prev).set(stairwayId, 'self-reported')
        );

        const { data, error } = await supabase
          .from('check_ins')
          .insert({ user_id: user.id, stairway_id: stairwayId })
          .select('created_at')
          .single();

        if (error) {
          setCheckedInIds((prev) => {
            const next = new Set(prev);
            next.delete(stairwayId);
            return next;
          });
          setCheckedInDates((prev) => {
            const next = new Map(prev);
            next.delete(stairwayId);
            return next;
          });
          setCheckedInMethods((prev) => {
            const next = new Map(prev);
            next.delete(stairwayId);
            return next;
          });
          return { error };
        }

        if (data?.created_at) {
          setCheckedInDates((prev) =>
            new Map(prev).set(stairwayId, data.created_at)
          );
        }
      }

      return { error: null };
    },
    [user, checkedInIds, checkedInPhotoUrls]
  );

  const verifyWithPhoto = useCallback(
    async (stairway, photoFile) => {
      if (!user) return { error: 'not-signed-in' };

      if (!navigator.geolocation) {
        return { error: 'no-geolocation' };
      }

      const position = await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ pos }),
          (err) => resolve({ err }),
          { enableHighAccuracy: true, timeout: 15000 }
        );
      });

      if (position.err || !position.pos) {
        return { error: 'location-failed' };
      }

      const distance = haversineDistanceMeters(
        position.pos.coords.latitude,
        position.pos.coords.longitude,
        stairway.latitude,
        stairway.longitude
      );

      if (distance > GPS_THRESHOLD_METERS) {
        return {
          error: 'too-far',
          distance: Math.round(distance / 0.3048), // meters -> feet
        };
      }

      const filePath = `${user.id}/${stairway.id}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('checkin-photos')
        .upload(filePath, photoFile, {
          contentType: photoFile.type || 'image/jpeg',
        });

      if (uploadError) {
        return { error: 'upload-failed' };
      }

      const { data: urlData } = supabase.storage
        .from('checkin-photos')
        .getPublicUrl(filePath);

      const nowIso = new Date().toISOString();

      const { error: upsertError } = await supabase.from('check_ins').upsert(
        {
          user_id: user.id,
          stairway_id: stairway.id,
          verification_method: 'photo-verified',
          photo_url: urlData.publicUrl,
          verified_at: nowIso,
        },
        { onConflict: 'user_id,stairway_id' }
      );

      if (upsertError) {
        return { error: 'save-failed' };
      }

      setCheckedInIds((prev) => new Set(prev).add(stairway.id));
      setCheckedInDates((prev) => {
        if (prev.has(stairway.id)) return prev;
        return new Map(prev).set(stairway.id, nowIso);
      });
      setCheckedInMethods((prev) =>
        new Map(prev).set(stairway.id, 'photo-verified')
      );
      setCheckedInPhotoUrls((prev) =>
        new Map(prev).set(stairway.id, urlData.publicUrl)
      );

      return { error: null };
    },
    [user]
  );

  const verifiedCount = [...checkedInMethods.values()].filter(
    (m) => m === 'photo-verified'
  ).length;

  const value = {
    checkedInIds,
    checkedInDates,
    checkedInMethods,
    checkedInPhotoUrls,
    loading,
    toggleCheckIn,
    verifyWithPhoto,
    count: checkedInIds.size,
    verifiedCount,
  };

  return (
    <CheckInsContext.Provider value={value}>
      {children}
    </CheckInsContext.Provider>
  );
}

export function useCheckIns() {
  const ctx = useContext(CheckInsContext);
  if (!ctx) {
    throw new Error('useCheckIns must be used within a CheckInsProvider');
  }
  return ctx;
}
