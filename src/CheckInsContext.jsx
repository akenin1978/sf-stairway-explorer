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

const GPS_THRESHOLD_METERS = 100;

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

export function CheckInsProvider({ children }) {
  const { user } = useAuth();
  const [checkedInIds, setCheckedInIds] = useState(new Set());
  const [checkedInDates, setCheckedInDates] = useState(new Map());
  const [checkedInMethods, setCheckedInMethods] = useState(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setCheckedInIds(new Set());
      setCheckedInDates(new Map());
      setCheckedInMethods(new Map());
      return;
    }

    let isMounted = true;
    setLoading(true);

    supabase
      .from('check_ins')
      .select('stairway_id, created_at, verification_method')
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

        const { error } = await supabase
          .from('check_ins')
          .delete()
          .eq('user_id', user.id)
          .eq('stairway_id', stairwayId);

        if (error) {
          setCheckedInIds((prev) => new Set(prev).add(stairwayId));
          return { error };
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
    [user, checkedInIds]
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
        return { error: 'too-far', distance: Math.round(distance) };
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
