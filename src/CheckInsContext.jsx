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

export function CheckInsProvider({ children }) {
  const { user } = useAuth();
  const [checkedInIds, setCheckedInIds] = useState(new Set());
  // Maps stairway_id -> ISO date string of when it was spotted. Kept
  // alongside checkedInIds (rather than replacing it) so the many places
  // that just need a fast "is this one checked?" lookup don't have to
  // change.
  const [checkedInDates, setCheckedInDates] = useState(new Map());
  const [loading, setLoading] = useState(false);

  // Whenever the logged-in user changes (sign in, sign out, switch
  // accounts), reload their check-in list from scratch.
  useEffect(() => {
    if (!user) {
      setCheckedInIds(new Set());
      setCheckedInDates(new Map());
      return;
    }

    let isMounted = true;
    setLoading(true);

    supabase
      .from('check_ins')
      .select('stairway_id, created_at')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) {
          setCheckedInIds(new Set(data.map((row) => row.stairway_id)));
          setCheckedInDates(
            new Map(data.map((row) => [row.stairway_id, row.created_at]))
          );
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Adds or removes a single stairway from the user's checklist. Updates
  // local state immediately (so the checkbox feels instant) and rolls back
  // if the database call actually fails.
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

        const { error } = await supabase
          .from('check_ins')
          .delete()
          .eq('user_id', user.id)
          .eq('stairway_id', stairwayId);

        if (error) {
          // Roll back -- we don't know the original created_at anymore,
          // but re-fetching on next load will fix it; for now just mark
          // it checked again so the UI isn't wrong about that.
          setCheckedInIds((prev) => new Set(prev).add(stairwayId));
          return { error };
        }
      } else {
        // Optimistically use "now" until the real server timestamp comes
        // back, so the list can sort correctly immediately.
        const optimisticDate = new Date().toISOString();
        setCheckedInDates((prev) =>
          new Map(prev).set(stairwayId, optimisticDate)
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

  const value = {
    checkedInIds,
    checkedInDates,
    loading,
    toggleCheckIn,
    count: checkedInIds.size,
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
