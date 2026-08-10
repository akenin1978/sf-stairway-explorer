import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function SettingsModal({ onClose }) {
  const { user } = useAuth();
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState('');

  // Load the user's current settings when the modal opens. If they've
  // never saved settings before, there's simply no row yet -- that's
  // expected, not an error, and just means "off" / "no display name" by
  // default.
  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    supabase
      .from('user_settings')
      .select('leaderboard_opt_in, display_name')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (!error && data) {
          setLeaderboardOptIn(data.leaderboard_opt_in);
          setDisplayName(data.display_name || '');
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;

    setStatus('saving');
    setErrorMsg('');

    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        leaderboard_opt_in: leaderboardOptIn,
        // Store an empty display name as null, not an empty string, so
        // it's unambiguous that nothing was set.
        display_name: displayName.trim() || null,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('saved');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Settings</h2>

        {loading ? (
          <p className="modal-context">Loading…</p>
        ) : (
          <form onSubmit={handleSave}>
            <label className="settings-toggle-row">
              <span>
                <span className="settings-toggle-label">
                  Show me on the leaderboard
                </span>
                <span className="settings-toggle-hint">
                  Off by default. Only photo-verified check-ins count toward
                  it.
                </span>
              </span>
              <span className="settings-toggle">
                <input
                  type="checkbox"
                  checked={leaderboardOptIn}
                  onChange={(e) => setLeaderboardOptIn(e.target.checked)}
                />
                <span className="settings-toggle-track" />
              </span>
            </label>

            {leaderboardOptIn && (
              <div className="settings-field">
                <label htmlFor="display-name">
                  Display name
                  <span className="settings-toggle-hint">
                    {' '}
                    -- shown on the leaderboard instead of your email.
                  </span>
                </label>
                <input
                  id="display-name"
                  type="text"
                  placeholder="e.g. StairMaster_Ali"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                />
              </div>
            )}

            {status === 'error' && (
              <p className="modal-error">Something went wrong: {errorMsg}</p>
            )}
            {status === 'saved' && (
              <p className="settings-saved">Saved!</p>
            )}

            <button type="submit" disabled={status === 'saving'}>
              {status === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
