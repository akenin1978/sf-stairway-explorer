import React, { useEffect, useState } from 'react';
import { getRandomBadgeMessage } from '../badgeMessages';
import { TIER_COLORS } from '../badgeDefinitions';

/**
 * BadgeEarnedModal
 *
 * Shows a celebratory modal when the user earns one or more badges.
 * Pass an array of newly-earned badge objects; the modal handles
 * showing them one at a time with a "1 of 3" style counter if there
 * are multiple, and calls onClose when the user has dismissed all of them.
 *
 * Badge object shape expected:
 *   { id, name, neighborhood, tier }
 *   tier is one of: 'neighborhood' | 'bronze' | 'silver' | 'gold' | 'special'
 *
 * Usage:
 *   const [badgeQueue, setBadgeQueue] = useState([]);
 *   ...after check-in...
 *   const newBadges = await checkAndAwardBadges(userId);
 *   if (newBadges.length > 0) setBadgeQueue(newBadges);
 *   ...
 *   {badgeQueue.length > 0 && (
 *     <BadgeEarnedModal badges={badgeQueue} onClose={() => setBadgeQueue([])} />
 *   )}
 */

// Labels only — colors come from the shared TIER_COLORS in badgeDefinitions.js
// so this always matches BadgesModal.jsx's gallery exactly.
const TIER_LABELS = {
  neighborhood: 'Neighborhood Badge',
  bronze: 'Milestone Badge',
  silver: 'Milestone Badge',
  gold: 'Milestone Badge',
  special: 'Special Badge',
};

function BadgeMedallion({ tier }) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.neighborhood;
  // Same viewBox, stroke-ring, and staircase icon geometry as the
  // gallery's BadgeMedallion (BadgesModal.jsx), just rendered larger.
  return (
    <div className="badge-earned-medallion">
      <svg width="140" height="140" viewBox="0 0 72 72" aria-hidden="true">
        <circle cx="36" cy="36" r="34" fill="none" stroke={colors.ring} strokeWidth="3" />
        <circle cx="36" cy="36" r="29" fill={colors.fill} />
        <g transform="translate(20,24)">
          <rect x="0" y="18" width="8" height="6" fill="#FFFFFF" />
          <rect x="8" y="12" width="8" height="12" fill="#FFFFFF" />
          <rect x="16" y="6" width="8" height="18" fill="#FFFFFF" />
          <rect x="24" y="0" width="8" height="24" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}

export default function BadgeEarnedModal({ badges, onClose }) {
  const [index, setIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  const current = badges[index];
  const hasMultiple = badges.length > 1;
  const isLast = index === badges.length - 1;

  useEffect(() => {
    if (current) {
      setMessage(getRandomBadgeMessage(current.name));
      // trigger the pop-in animation on a fresh frame
      setVisible(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    }
  }, [index, current]);

  // Escape key closes (advances to next, or closes on last)
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') handleNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!current) return null;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setIndex((i) => i + 1);
    }
  };

  const tierColors = TIER_COLORS[current.tier] || TIER_COLORS.neighborhood;
  const tierLabel = TIER_LABELS[current.tier] || TIER_LABELS.neighborhood;

  return (
    <div className="badge-earned-overlay" onClick={handleNext} role="presentation">
      <div
        className={`badge-earned-card ${visible ? 'is-visible' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Badge earned: ${current.name}`}
      >
        {hasMultiple && (
          <div className="badge-earned-counter">
            {index + 1} of {badges.length}
          </div>
        )}

        <BadgeMedallion tier={current.tier} />

        <div className="badge-earned-tier-label" style={{ color: tierColors.fill }}>
          {tierLabel}
        </div>

        <h2 className="badge-earned-message">{message}</h2>

        <div className="badge-earned-name">{current.name}</div>
        {current.neighborhood && (
          <div className="badge-earned-neighborhood">{current.neighborhood}</div>
        )}

        <button className="badge-earned-dismiss" onClick={handleNext}>
          {isLast ? 'Nice!' : 'Next badge →'}
        </button>
      </div>

      <style>{`
        .badge-earned-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 30, 15, 0.55);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .badge-earned-card {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 36px 32px 28px;
          max-width: 340px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          transform: scale(0.85);
          opacity: 0;
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease-out;
        }

        .badge-earned-card.is-visible {
          transform: scale(1);
          opacity: 1;
        }

        .badge-earned-counter {
          font-size: 13px;
          font-weight: 600;
          color: #888;
          margin-bottom: 12px;
          letter-spacing: 0.02em;
        }

        .badge-earned-medallion {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .badge-earned-tier-label {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-bottom: 10px;
        }

        .badge-earned-message {
          font-size: 19px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 16px;
          line-height: 1.35;
        }

        .badge-earned-name {
          font-size: 16px;
          font-weight: 700;
          color: #27500A;
        }

        .badge-earned-neighborhood {
          font-size: 13px;
          color: #888;
          margin-top: 2px;
        }

        .badge-earned-dismiss {
          margin-top: 24px;
          background: #27500A;
          color: #FFFFFF;
          border: none;
          border-radius: 999px;
          padding: 12px 28px;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .badge-earned-dismiss:hover {
          background: #1d3d08;
        }

        @media (prefers-reduced-motion: reduce) {
          .badge-earned-card {
            transition: opacity 0.15s ease-out;
            transform: none !important;
          }
        }
      `}</style>
    </div>
  );
}
