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
  const [loading, setLoading] = useState(false);

  // Whenever the logged-in user changes (sign in, sign out, switch
  // accounts), reload their check-in list from scratch.
  useEffect(() => {
    if (!user) {
      setCheckedInIds(new Set());
      return;
    }

    let isMounted = true;
    setLoading(true);

    supabase
      .from('check_ins')
      .select('stairway_id')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) {
          setCheckedInIds(new Set(data.map((row) => row.stairway_id)));
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

      const { error } = wasChecked
        ? await supabase
            .from('check_ins')
            .delete()
            .eq('user_id', user.id)
            .eq('stairway_id', stairwayId)
        : await supabase
            .from('check_ins')
            .insert({ user_id: user.id, stairway_id: stairwayId });

      if (error) {
        // Roll back the optimistic update since the write failed.
        setCheckedInIds((prev) => {
          const next = new Set(prev);
          wasChecked ? next.add(stairwayId) : next.delete(stairwayId);
          return next;
        });
        return { error };
      }

      return { error: null };
    },
    [user, checkedInIds]
  );

  const value = {
    checkedInIds,
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
