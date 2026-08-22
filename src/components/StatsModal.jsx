import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useCheckIns } from '../CheckInsContext';

// Display-only shortenings for a few long neighborhood names in this
// list -- the underlying data (used for badges and the sheet sync)
// stays exactly as-is. If any of these don't match, it's because the
// actual stored spelling differs slightly (extra word, different
// punctuation) -- worth a quick check against the real data.
const NEIGHBORHOOD_DISPLAY_OVERRIDES = {
  'BART and Muni Stations': 'BART and Muni',
  'Castro/Eureka Valley': 'Castro/Eur. Valley',
  'Forest Hill Extension': 'Forest Hill Ext.',
  'Northern Waterfront': 'No. Waterfront',
  'Presidio (Fort Winfield Scott)': 'Presidio (Ft. Scott)',
};

export default function StatsModal({ onClose }) {
  const { user } = useAuth();
  const { checkedInIds } = useCheckIns();
  const [stairways, setStairways] = useState([]);
  const [streak, setStreak] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    // Supabase caps a single select at 1000 rows by default (db-max-rows) --
    // with 1200+ stairways, a plain .select() silently truncates. Page
    // through with .range() until a page comes back short, which means
    // we've reached the end.
    async function fetchAllStairways() {
      const pageSize = 1000;
      let from = 0;
      let all = [];
      while (true) {
        const { data, error } = await supabase
          .from('stairways')
          .select('id, neighborhood')
          .range(from, from + pageSize - 1);
        if (error || !data) break;
        all = all.concat(data);
        if (data.length < pageSize) break;
        from += pageSize;
      }
      return all;
    }

    async function load() {
      setLoading(true);

      const [stairwayData, { data: streakData }] = await Promise.all([
        fetchAllStairways(),
        supabase.rpc('get_my_streak').maybeSingle(),
      ]);

      if (!cancelled) {
        setStairways(stairwayData || []);
        setStreak(streakData || { current_streak: 0, longest_streak: 0 });
        setLoading(false);
      }
    }

    if (user) load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const stats = useMemo(() => {
    const totalStairways = stairways.length;
    const totalSpotted = checkedInIds.size;

    const neighborhoodMap = new Map();
    for (const s of stairways) {
      if (!s.neighborhood) continue;
      const entry = neighborhoodMap.get(s.neighborhood) || { total: 0, spotted: 0 };
      entry.total += 1;
      if (checkedInIds.has(s.id)) entry.spotted += 1;
      neighborhoodMap.set(s.neighborhood, entry);
    }

    const neighborhoods = Array.from(neighborhoodMap.entries())
      .map(([name, { total, spotted }]) => ({
        name,
        total,
        spotted,
        pct: total > 0 ? Math.round((spotted / total) * 100) : 0,
      }))
      .sort((a, b) => {
        // Three tiers: in-progress neighborhoods (the actionable ones --
        // a little more effort finishes them) lead, sorted by how close
        // to done they are. Fully-complete neighborhoods move to their
        // own group after that -- nothing left to do there, so they
        // shouldn't compete for the top slot just for being small (a
        // tiny 1/1 neighborhood hitting 100% used to jump straight to
        // the top, which wasn't useful). Not-yet-started stays last.
        const tier = (n) => (n.pct === 100 ? 1 : n.spotted > 0 ? 0 : 2);
        const aTier = tier(a);
        const bTier = tier(b);
        if (aTier !== bTier) return aTier - bTier;
        if (aTier === 0) {
          return b.pct - a.pct || b.spotted - a.spotted || a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
      });

    return { totalStairways, totalSpotted, neighborhoods };
  }, [stairways, checkedInIds]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card stats-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <h2>My stats</h2>

        {loading ? (
          <p className="modal-context">Loading&hellip;</p>
        ) : (
          <>
            <div className="stats-streak-row">
              <div className="stats-streak-block">
                <span className="stats-streak-number">{streak?.current_streak ?? 0}</span>
                <span className="stats-streak-label">week streak</span>
              </div>
              <div className="stats-streak-block">
                <span className="stats-streak-number">{streak?.longest_streak ?? 0}</span>
                <span className="stats-streak-label">longest streak</span>
              </div>
            </div>
            <p className="stats-streak-hint">
              A streak counts consecutive weeks with at least one photo-verified check-in.
            </p>

            <div className="stats-summary-row">
              <div className="stats-summary-block">
                <span className="stats-summary-number">
                  {stats.totalSpotted} / {stats.totalStairways}
                </span>
                <span className="stats-summary-label">stairways spotted</span>
              </div>
            </div>

            <h3 className="stats-section-heading">Neighborhood completion</h3>
            <div className="stats-neighborhood-list">
              {stats.neighborhoods.map((n) => (
                <div key={n.name} className="stats-neighborhood-row">
                  <span className="stats-neighborhood-name">{NEIGHBORHOOD_DISPLAY_OVERRIDES[n.name] || n.name}</span>
                  <div className="stats-neighborhood-bar-track">
                    <div
                      className="stats-neighborhood-bar-fill"
                      style={{ width: `${n.pct}%` }}
                    />
                  </div>
                  <span className="stats-neighborhood-count">
                    {n.spotted}/{n.total}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
