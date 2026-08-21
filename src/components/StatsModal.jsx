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

    async function load() {
      setLoading(true);

      const [{ data: stairwayData }, { data: streakData }] = await Promise.all([
        supabase.from('stairways').select('id, neighborhood, stair_count'),
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

    const totalSteps = stairways.reduce((sum, s) => {
      if (checkedInIds.has(s.id) && s.stair_count != null) {
        return sum + s.stair_count;
      }
      return sum;
    }, 0);

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
      .sort((a, b) => b.pct - a.pct || b.spotted - a.spotted);

    return { totalStairways, totalSpotted, totalSteps, neighborhoods };
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
              <div className="stats-summary-block">
                <span className="stats-summary-number">{stats.totalSteps.toLocaleString()}</span>
                <span className="stats-summary-label">steps climbed</span>
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
