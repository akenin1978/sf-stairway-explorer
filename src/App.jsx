import { useEffect, useState } from 'react';
import StairwayMap from './components/StairwayMap';
import OnboardingCarousel from './components/OnboardingCarousel';
import { Component } from 'react';

// TEMPORARY debugging tool -- shows the actual crash message on screen
// instead of a silent blank page, so we can see mobile errors without
// needing a cable-connected remote debugger. Remove once the real bug
// is found and fixed.
class OnboardingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#fff',
            zIndex: 3000,
            padding: 24,
            fontFamily: 'monospace',
            fontSize: 13,
            overflow: 'auto',
          }}
        >
          <h2 style={{ color: '#c0392b' }}>Onboarding crashed:</h2>
          <p>{this.state.error.message}</p>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{this.state.error.stack}</pre>
          <button onClick={() => window.location.reload()}>Reload</button>
        </div>
      );
    }
    return this.props.children;
  }
}
import FeedbackModal from './components/FeedbackModal';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import BadgesModal from './components/BadgesModal';
import StatsModal from './components/StatsModal';
import LeaderboardModal from './components/LeaderboardModal';
import FriendsModal from './components/FriendsModal';
import { useAuth } from './AuthContext';
import { useCheckIns } from './CheckInsContext';
import { supabase } from './supabaseClient';

export default function App() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackStairway, setFeedbackStairway] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [badgesOpen, setBadgesOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [friendsOpen, setFriendsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [spotMode, setSpotMode] = useState(false);
  const [spottedListOpen, setSpottedListOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { count: checkedInCount, verifiedCount } = useCheckIns();
  const [totalStairways, setTotalStairways] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    supabase
      .from('stairways')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if (count != null) setTotalStairways(count);
      });
  }, []);

  // Shown once ever, only to first-time visitors who aren't signed in.
  // Dismissing (Skip, "Get started", or swiping past the last slide) sets
  // a permanent localStorage flag on this device.
  useEffect(() => {
    if (!loading && !user) {
      const seen = localStorage.getItem('sf_stairway_onboarding_seen') === 'true';
      if (!seen) setShowOnboarding(true);
    }
  }, [loading, user]);

  function dismissOnboarding() {
    localStorage.setItem('sf_stairway_onboarding_seen', 'true');
    setShowOnboarding(false);
  }

  const openGeneralFeedback = () => {
    setFeedbackStairway(null);
    setFeedbackOpen(true);
  };

  const openStairwayFeedback = (stairway) => {
    setFeedbackStairway(stairway);
    setFeedbackOpen(true);
  };

  return (
    <OnboardingErrorBoundary>
    <div className="app">
      {showOnboarding && (
        <OnboardingErrorBoundary>
          <OnboardingCarousel
            totalStairways={totalStairways}
            onDismiss={dismissOnboarding}
          />
        </OnboardingErrorBoundary>
      )}

      <header className="app-header">
        <h1>
          <svg
            className="app-header-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <rect x="1" y="17" width="5" height="6" fill="#ffffff" />
            <rect x="7" y="12" width="5" height="11" fill="#ffffff" />
            <rect x="13" y="7" width="5" height="16" fill="#ffffff" />
            <rect x="19" y="2" width="4" height="21" fill="#ffffff" />
          </svg>
          SF Stairway Spotter
        </h1>

        <div className="header-menu-wrapper">
          <button
            className="header-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>

          {menuOpen && (
            <>
              <div
                className="header-menu-backdrop"
                onClick={() => setMenuOpen(false)}
              />
              <div className="header-menu-panel">
                <button
                  className="header-menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    openGeneralFeedback();
                  }}
                >
                  Feedback
                </button>

                {!loading &&
                  (user ? (
                    <>
                      <div className="header-menu-email">{user.email}</div>
                      <button
                        className="header-menu-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setBadgesOpen(true);
                        }}
                      >
                        Badges
                      </button>
                      <button
                        className="header-menu-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setStatsOpen(true);
                        }}
                      >
                        My stats
                      </button>
                      <button
                        className="header-menu-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setLeaderboardOpen(true);
                        }}
                      >
                        Leaderboard
                      </button>
                      <button
                        className="header-menu-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setFriendsOpen(true);
                        }}
                      >
                        Friends
                      </button>
                      <button
                        className="header-menu-item"
                        onClick={() => {
                          setMenuOpen(false);
                          setSettingsOpen(true);
                        }}
                      >
                        Settings
                      </button>
                      <button
                        className="header-menu-item"
                        onClick={() => {
                          setMenuOpen(false);
                          signOut();
                        }}
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <button
                      className="header-menu-item"
                      onClick={() => {
                        setMenuOpen(false);
                        setAuthOpen(true);
                      }}
                    >
                      Sign in
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>

        {user && (
          <button
            className="header-progress"
            onClick={() => setSpottedListOpen(true)}
          >
            {checkedInCount} / {totalStairways ?? '…'} spotted
            {verifiedCount > 0 ? ` (${verifiedCount} verified)` : ''}
          </button>
        )}
      </header>

      <StairwayMap
        onReportIssue={openStairwayFeedback}
        onRequireSignIn={() => setAuthOpen(true)}
        spotMode={spotMode}
        onStartSpot={() => setSpotMode(true)}
        onCancelSpot={() => setSpotMode(false)}
        spottedListOpen={spottedListOpen}
        onCloseSpottedList={() => setSpottedListOpen(false)}
      />

      {feedbackOpen && (
        <FeedbackModal
          stairway={feedbackStairway}
          onClose={() => setFeedbackOpen(false)}
        />
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {settingsOpen && (
        <SettingsModal onClose={() => setSettingsOpen(false)} />
      )}

      {badgesOpen && <BadgesModal onClose={() => setBadgesOpen(false)} />}

      {statsOpen && <StatsModal onClose={() => setStatsOpen(false)} />}

      {leaderboardOpen && (
        <LeaderboardModal onClose={() => setLeaderboardOpen(false)} />
      )}

      {friendsOpen && <FriendsModal onClose={() => setFriendsOpen(false)} />}
    </div>
    </OnboardingErrorBoundary>
  );
}
