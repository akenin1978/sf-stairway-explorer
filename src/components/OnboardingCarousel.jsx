import React, { useState, useRef } from 'react';
import { TIER_COLORS } from '../badgeDefinitions';

/**
 * OnboardingCarousel
 *
 * Full-screen, swipeable 3-slide intro shown once to first-time,
 * unauthenticated visitors. Dismissing (Skip, "Get started", or
 * swiping past the last slide) is permanent -- App.jsx sets a
 * localStorage flag and never shows this again on this device.
 */
function StairIcon() {
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" aria-hidden="true">
      <rect x="10" y="100" width="20" height="20" fill="#4F831A" />
      <rect x="30" y="80" width="20" height="40" fill="#4F831A" />
      <rect x="50" y="60" width="20" height="60" fill="#4F831A" />
      <rect x="70" y="40" width="20" height="80" fill="#4F831A" />
      <rect x="90" y="20" width="20" height="100" fill="#4F831A" />
      <rect x="10" y="98" width="100" height="4" fill="#27500A" />
      <rect x="30" y="78" width="80" height="4" fill="#27500A" />
      <rect x="50" y="58" width="60" height="4" fill="#27500A" />
      <rect x="70" y="38" width="40" height="4" fill="#27500A" />
      <rect x="90" y="18" width="20" height="4" fill="#27500A" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="120" height="150" viewBox="0 0 120 150" aria-hidden="true">
      <rect x="2" y="2" width="116" height="146" rx="18" fill="#fff" stroke="#B4B2A9" strokeWidth="3" />
      <rect x="10" y="14" width="100" height="122" rx="4" fill="#EAF3DE" />
      <line x1="10" y1="45" x2="110" y2="45" stroke="#C0DD97" strokeWidth="2" />
      <line x1="10" y1="80" x2="110" y2="80" stroke="#C0DD97" strokeWidth="2" />
      <line x1="10" y1="112" x2="110" y2="112" stroke="#C0DD97" strokeWidth="2" />
      <line x1="38" y1="14" x2="38" y2="136" stroke="#C0DD97" strokeWidth="2" />
      <line x1="72" y1="14" x2="72" y2="136" stroke="#C0DD97" strokeWidth="2" />

      <circle cx="35" cy="37" r="6" fill="#378ADD" />
      <circle cx="58" cy="33" r="6" fill="#4F831A" />
      <circle cx="84" cy="38" r="6" fill="#F4C430" />
      <circle cx="30" cy="61" r="6" fill="#E8871E" />
      <circle cx="87" cy="61" r="6" fill="#4F831A" />
      <circle cx="33" cy="95" r="6" fill="#F4C430" />
      <circle cx="86" cy="95" r="6" fill="#E8871E" />
      <circle cx="58" cy="115" r="6" fill="#C1440E" />

      <circle cx="60" cy="75" r="16" fill="#CECBF6" />
      <circle cx="60" cy="75" r="9" fill="#fff" stroke="#534AB7" strokeWidth="2" />
      <circle cx="60" cy="75" r="5" fill="#7F77DD" />
    </svg>
  );
}

function BadgeMedallionIcon({ tier }) {
  const colors = TIER_COLORS[tier] || TIER_COLORS.neighborhood;
  return (
    <svg width="64" height="64" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="34" fill="none" stroke={colors.ring} strokeWidth="3" />
      <circle cx="36" cy="36" r="29" fill={colors.fill} />
      <g transform="translate(20,24)" fill="#fff">
        <rect x="0" y="18" width="8" height="6" />
        <rect x="8" y="12" width="8" height="12" />
        <rect x="16" y="6" width="8" height="18" />
        <rect x="24" y="0" width="8" height="24" />
      </g>
    </svg>
  );
}

export default function OnboardingCarousel({ totalStairways, onDismiss }) {
  const [slide, setSlide] = useState(0);
  const touchStartX = useRef(null);
  const stairwayCount = totalStairways != null ? totalStairways.toLocaleString() : '1,200';
  // Desktop gets an explicit Next button; touch devices rely on swipe + dots,
  // which feels more natural there and avoids an unnecessary extra tap target.
  const [isDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches
  );

  const slides = [
    {
      icon: <StairIcon />,
      title: (
        <>
          Welcome to
          <br />
          SF Stairway Spotter
        </>
      ),
      body: `Discover San Francisco's ${stairwayCount}+ stairways, one step at a time.`,
    },
    {
      icon: <MapIcon />,
      title: 'Find, then check in',
      body: 'Browse stairways on the map, then check in with a quick tap or photo when you arrive.',
    },
    {
      icon: (
        <div style={{ display: 'flex', gap: 10 }}>
          <BadgeMedallionIcon tier="bronze" />
          <BadgeMedallionIcon tier="gold" />
          <BadgeMedallionIcon tier="special" />
        </div>
      ),
      title: 'Track your progress',
      body: 'Collect badges for your discoveries \u2014 and if you like, share your journey with friends and climb the leaderboard.',
    },
  ];

  function goTo(index) {
    setSlide(Math.max(0, Math.min(slides.length - 1, index)));
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current == null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 40;

    if (deltaX > SWIPE_THRESHOLD) {
      goTo(slide - 1);
    } else if (deltaX < -SWIPE_THRESHOLD) {
      if (slide === slides.length - 1) {
        onDismiss();
      } else {
        goTo(slide + 1);
      }
    }
    touchStartX.current = null;
  }

  const isLast = slide === slides.length - 1;

  return (
    <div
      className="onboarding-overlay"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button className="onboarding-skip" onClick={onDismiss}>
        Skip
      </button>

      <div className="onboarding-track" style={{ transform: `translateX(-${slide * 100}%)` }}>
        {slides.map((s, i) => (
          <div className="onboarding-slide" key={i}>
            <div className="onboarding-icon">{s.icon}</div>
            <p className="onboarding-title">{s.title}</p>
            <p className="onboarding-body">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="onboarding-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={'onboarding-dot' + (i === slide ? ' active' : '')}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      {isDesktop && !isLast && (
        <button className="onboarding-next" onClick={() => goTo(slide + 1)}>
          Next
        </button>
      )}

      {isLast && (
        <button className="onboarding-get-started" onClick={onDismiss}>
          Get started
        </button>
      )}

      <style>{`
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          background: #FFFFFF;
          z-index: 2000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .onboarding-skip {
          position: absolute;
          top: 20px;
          right: 20px;
          border: none;
          background: none;
          font-size: 15px;
          color: #666;
          cursor: pointer;
          padding: 8px;
          z-index: 1;
        }

        .onboarding-track {
          display: flex;
          width: 100%;
          transition: transform 0.3s ease;
        }

        .onboarding-slide {
          flex: 0 0 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 0 36px;
          box-sizing: border-box;
        }

        .onboarding-icon {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          height: 150px;
          margin-bottom: 20px;
        }

        .onboarding-title {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin: 0 0 14px;
          line-height: 1.35;
        }

        .onboarding-body {
          font-size: 15px;
          color: #666;
          line-height: 1.6;
          margin: 0;
          max-width: 300px;
        }

        .onboarding-dots {
          position: absolute;
          bottom: 96px;
          display: flex;
          gap: 8px;
        }

        .onboarding-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #DDDDDD;
          border: none;
          padding: 0;
          cursor: pointer;
        }

        .onboarding-dot.active {
          background: #4F831A;
        }

        .onboarding-next {
          position: absolute;
          bottom: 40px;
          background: #27500A;
          color: #FFFFFF;
          border: none;
          border-radius: 999px;
          padding: 14px 36px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }

        .onboarding-get-started {
          position: absolute;
          bottom: 40px;
          background: #27500A;
          color: #FFFFFF;
          border: none;
          border-radius: 999px;
          padding: 14px 36px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
