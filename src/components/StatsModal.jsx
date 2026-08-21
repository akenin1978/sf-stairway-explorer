import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useCheckIns } from '../CheckInsContext';

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
        const aStarted = a.spotted > 0;
        const bStarted = b.spotted > 0;
        if (aStarted !== bStarted) return aStarted ? -1 : 1;
        if (aStarted && bStarted) {
          // Raw count, not percentage -- a neighborhood where you've
          // spotted 15 of 40 represents more real progress than one
          // where you've spotted 1 of 1, even though the latter is
          // "more complete." Sorting by percentage would let tiny
          // neighborhoods dominate the top just for being small.
          return b.spotted - a.spotted || b.pct - a.pct || a.name.localeCompare(b.name);
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
                  <span className="stats-neighborhood-name">{n.name}</span>
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
