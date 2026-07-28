import { useEffect, useState } from 'react';
import StairwayMap from './components/StairwayMap';
import FeedbackModal from './components/FeedbackModal';
import AuthModal from './components/AuthModal';
import { useAuth } from './AuthContext';
import { useCheckIns } from './CheckInsContext';
import { supabase } from './supabaseClient';

export default function App() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackStairway, setFeedbackStairway] = useState(null);
  const [authOpen, setAuthOpen] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { count: checkedInCount } = useCheckIns();
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
        <h1>SF Stairway Spotter</h1>
        <div className="header-actions">
          {user && (
            <span className="header-progress">
              {checkedInCount} / {totalStairways ?? '…'} climbed
            </span>
          )}
          <button className="header-feedback-button" onClick={openGeneralFeedback}>
            Feedback
          </button>
          {!loading && (
            user ? (
              <div className="header-account">
                <span className="header-account-email">{user.email}</span>
                <button className="header-signout-button" onClick={signOut}>
                  Log out
                </button>
              </div>
            ) : (
              <button className="header-signin-button" onClick={() => setAuthOpen(true)}>
                Sign in
              </button>
            )
          )}
        </div>
      </header>

      <StairwayMap
        onReportIssue={openStairwayFeedback}
        onRequireSignIn={() => setAuthOpen(true)}
      />

      {feedbackOpen && (
        <FeedbackModal
          stairway={feedbackStairway}
          onClose={() => setFeedbackOpen(false)}
        />
      )}

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}
