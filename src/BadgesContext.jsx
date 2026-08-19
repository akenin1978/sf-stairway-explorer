import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { supabase } from './supabaseClient';
import { useAuth } from './AuthContext';
import { NEIGHBORHOOD_BADGES, MILESTONE_BADGES } from './badgeDefinitions';

const BadgesContext = createContext(null);

const BEST_OF_THE_BEST_ID = 'special-best-of-the-best';

export function BadgesProvider({ children }) {
  const { user } = useAuth();
  const [earnedBadgeIds, setEarnedBadgeIds] = useState(new Set());
  const [earnedBadgeDates, setEarnedBadgeDates] = useState(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setEarnedBadgeIds(new Set());
      setEarnedBadgeDates(new Map());
      return;
    }

    let isMounted = true;
    setLoading(true);

    supabase
      .from('badges_earned')
      .select('badge_id, earned_at')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) {
          setEarnedBadgeIds(new Set(data.map((row) => row.badge_id)));
          setEarnedBadgeDates(
            new Map(data.map((row) => [row.badge_id, row.earned_at]))
          );
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Writes one newly-earned badge, both to the database and to local
  // state. Uses upsert with ignoreDuplicates as a safety net -- if this
  // somehow gets called twice for the same badge (e.g. two check-ins in
  // quick succession), it silently no-ops the second time rather than
  // erroring or creating a duplicate row.
  const awardBadge = useCallback(
    async (badgeId) => {
      if (!user) return;

      const { error } = await supabase.from('badges_earned').upsert(
        { user_id: user.id, badge_id: badgeId },
        { onConflict: 'user_id,badge_id', ignoreDuplicates: true }
      );

      if (!error) {
        setEarnedBadgeIds((prev) => new Set(prev).add(badgeId));
        setEarnedBadgeDates((prev) =>
          new Map(prev).set(badgeId, new Date().toISOString())
        );
      }
    },
    [user]
  );

  // The core awarding check. Runs right after a check-in succeeds
  // (self-reported or photo-verified -- badges count both). Deliberately
  // scoped to just what's relevant to the ONE stairway just spotted,
  // rather than re-scanning all ~74 badges on every check-in:
  //   - that stairway's neighborhood (did this just complete it?)
  //   - the new running total (did this just cross a milestone?)
  //   - Best of the Best, only if the stairway just spotted was a 5
  //
  // `stairways` is the full list already loaded by the map (with
  // neighborhood/rating on each), and `checkedInIds` is the user's
  // current full set of spotted stairway ids, including the one just
  // added.
  const checkAndAwardBadges = useCallback(
    async (stairways, checkedInIds, spottedStairwayId) => {
      if (!user || !stairways || stairways.length === 0) return;

      const spottedStairway = stairways.find(
        (s) => s.id === spottedStairwayId
      );
      if (!spottedStairway) return;

      // --- Neighborhood completion ---
      const neighborhoodBadge = NEIGHBORHOOD_BADGES.find(
        (b) => b.neighborhood === spottedStairway.neighborhood
      );
      if (neighborhoodBadge && !earnedBadgeIds.has(neighborhoodBadge.id)) {
        const stairwaysInNeighborhood = stairways.filter(
          (s) => s.neighborhood === spottedStairway.neighborhood
        );
        const allSpotted = stairwaysInNeighborhood.every((s) =>
          checkedInIds.has(s.id)
        );
        if (allSpotted) {
          await awardBadge(neighborhoodBadge.id);
        }
      }

      // --- Milestones ---
      const totalSpotted = checkedInIds.size;
      const totalStairways = stairways.length;
      for (const milestone of MILESTONE_BADGES) {
        if (earnedBadgeIds.has(milestone.id)) continue;
        const threshold =
          milestone.threshold === 'all' ? totalStairways : milestone.threshold;
        if (totalSpotted >= threshold) {
          await awardBadge(milestone.id);
        }
      }

      // --- Best of the Best ---
      if (
        spottedStairway.rating === 5 &&
        !earnedBadgeIds.has(BEST_OF_THE_BEST_ID)
      ) {
        const fiveStarStairways = stairways.filter((s) => s.rating === 5);
        const allFiveStarSpotted = fiveStarStairways.every((s) =>
          checkedInIds.has(s.id)
        );
        if (allFiveStarSpotted) {
          await awardBadge(BEST_OF_THE_BEST_ID);
        }
      }
    },
    [user, earnedBadgeIds, awardBadge]
  );

  const value = {
    earnedBadgeIds,
    earnedBadgeDates,
    loading,
    checkAndAwardBadges,
  };

  return (
    <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>
  );
}

export function useBadges() {
  const ctx = useContext(BadgesContext);
  if (!ctx) {
    throw new Error('useBadges must be used within a BadgesProvider');
  }
  return ctx;
}
