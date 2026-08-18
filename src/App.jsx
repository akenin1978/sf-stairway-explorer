import { useEffect, useState } from 'react';
import StairwayMap from './components/StairwayMap';
import FeedbackModal from './components/FeedbackModal';
import AuthModal from './components/AuthModal';
import SettingsModal from './components/SettingsModal';
import { useAuth } from './AuthContext';
import { useCheckIns } from './CheckInsContext';
import { supabase } from './supabaseClient';

export default function App() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackStairway, setFeedbackStairway] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [spotMode, setSpotMode] = useState(false);
  const [spottedListOpen, setSpottedListOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { count: checkedInCount, verifiedCount } = useCheckIns();
  const [totalStairways, setTotalStairways] = useState(null);

  useEffect(() => {
    supabase
      .from('stairways')
      .select('id', { count: 'exact', head: true })
      .then(({ count }) => {
        if (count != null) setTotalStairways(count);
      });
  }, []);

  const openGeneralFeedback = () => {
    setFeedbackStairway(null);
    setFeedbackOpen(true);
  };

  const openStairwayFeedback = (stairway) => {
    setFeedbackStairway(stairway);
    setFeedbackOpen(true);
  };

  return (
    <div className="app">
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
    </div>
  );
}
