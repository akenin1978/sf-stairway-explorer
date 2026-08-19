import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useCheckIns } from '../CheckInsContext';
import { useBadges } from '../BadgesContext';
import {
  NEIGHBORHOOD_BADGES,
  MILESTONE_BADGES,
  SPECIAL_BADGES,
} from '../badgeDefinitions';

const PAGE_SIZE = 500;

// Small reusable badge medallion -- same design locked in earlier: dark
// green ring around a medium-green fill, white 4-step staircase icon.
// Grayed out (both ring and fill desaturated) until earned.
//
// notificationCount shows a small red circle in the top-right corner --
// only meaningful on an already-EARNED badge, when new stairways have
// been added to its category since it was earned. The badge itself
// stays earned either way (badges are never revoked), this is just a
// "hey, there's something new here" nudge, not a re-completion
// requirement.
function BadgeMedallion({ name, subtitle, progressLabel, earned, notificationCount }) {
  const ringColor = earned ? '#27500A' : '#B8B8B8';
  const fillColor = earned ? '#4F831A' : '#DDDDDD';
  const iconColor = earned ? '#FFFFFF' : '#F5F5F5';

  return (
    <div className="badge-tile">
      <div className="badge-tile-medallion-wrap">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="34" fill="none" stroke={ringColor} strokeWidth="3" />
          <circle cx="36" cy="36" r="29" fill={fillColor} />
          <g transform="translate(20,24)">
            <rect x="0" y="18" width="8" height="6" fill={iconColor} />
            <rect x="8" y="12" width="8" height="12" fill={iconColor} />
            <rect x="16" y="6" width="8" height="18" fill={iconColor} />
            <rect x="24" y="0" width="8" height="24" fill={iconColor} />
          </g>
        </svg>
        {earned && notificationCount > 0 && (
          <span className="badge-tile-notification">{notificationCount}</span>
        )}
      </div>
      <span className="badge-tile-name">{name}</span>
      {subtitle && <span className="badge-tile-subtitle">{subtitle}</span>}
      {progressLabel && (
        <span className="badge-tile-progress">{progressLabel}</span>
      )}
    </div>
  );
}

export default function BadgesModal({ onClose }) {
  const { checkedInIds } = useCheckIns();
  const { earnedBadgeIds, loading: badgesLoading } = useBadges();
  const [stairways, setStairways] = useState([]);
  const [loadingStairways, setLoadingStairways] = useState(true);

  // Lightweight fetch of just what's needed to compute progress --
  // separate from the main map's own fetch, since this modal can be
  // opened independently of the map having loaded (or being open at
  // all).
  useEffect(() => {
    let isMounted = true;

    async function fetchAll() {
      setLoadingStairways(true);
      let all = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from('stairways')
          .select('id, neighborhood, rating')
          // Same filter the map itself uses -- a stairway with no
          // coordinates yet can't be shown or checked in on, so it
          // shouldn't count toward "total" here either. Without this,
          // this screen's totals (including the "SF Stairway Legend"
          // milestone) could disagree with what the map shows.
          .not('latitude', 'is', null)
          .not('longitude', 'is', null)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1);
        if (error || !data || data.length === 0) break;
        all = all.concat(data);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
      }
      if (isMounted) {
        setStairways(all);
        setLoadingStairways(false);
      }
    }

    fetchAll();
    return () => {
      isMounted = false;
    };
  }, []);

  const loading = badgesLoading || loadingStairways;

  function neighborhoodProgress(neighborhoodName) {
    const inNeighborhood = stairways.filter(
      (s) => s.neighborhood === neighborhoodName
    );
    const spotted = inNeighborhood.filter((s) => checkedInIds.has(s.id));
    return { spotted: spotted.length, total: inNeighborhood.length };
  }

  const totalSpotted = checkedInIds.size;
  const totalStairways = stairways.length;

  const fiveStarStairways = stairways.filter((s) => s.rating === 5);
  const fiveStarSpotted = fiveStarStairways.filter((s) =>
    checkedInIds.has(s.id)
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card badges-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Badges</h2>

        {loading ? (
          <p className="modal-context">Loading…</p>
        ) : (
          <>
            <h3 className="badges-section-heading">Neighborhoods</h3>
            <div className="badges-grid">
              {NEIGHBORHOOD_BADGES.map((badge) => {
                const { spotted, total } = neighborhoodProgress(
                  badge.neighborhood
                );
                return (
                  <BadgeMedallion
                    key={badge.id}
                    name={badge.name}
                    subtitle={badge.neighborhood}
                    progressLabel={total > 0 ? `${spotted}/${total}` : null}
                    earned={earnedBadgeIds.has(badge.id)}
                    notificationCount={total - spotted}
                  />
                );
              })}
            </div>

            <h3 className="badges-section-heading">Milestones</h3>
            <div className="badges-grid">
              {MILESTONE_BADGES.map((badge) => {
                const threshold =
                  badge.threshold === 'all' ? totalStairways : badge.threshold;
                return (
                  <BadgeMedallion
                    key={badge.id}
                    name={badge.name}
                    progressLabel={`${Math.min(totalSpotted, threshold)}/${threshold}`}
                    earned={earnedBadgeIds.has(badge.id)}
                  />
                );
              })}
            </div>

            <h3 className="badges-section-heading">Special</h3>
            <div className="badges-grid">
              {SPECIAL_BADGES.map((badge) => (
                <BadgeMedallion
                  key={badge.id}
                  name={badge.name}
                  subtitle={badge.description}
                  progressLabel={
                    badge.id === 'special-best-of-the-best'
                      ? `${fiveStarSpotted.length}/${fiveStarStairways.length}`
                      : null
                  }
                  earned={earnedBadgeIds.has(badge.id)}
                  notificationCount={
                    badge.id === 'special-best-of-the-best'
                      ? fiveStarStairways.length - fiveStarSpotted.length
                      : 0
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
