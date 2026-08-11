import { useEffect, useState } from 'react';
import { Filter } from 'bad-words';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

const profanityFilter = new Filter();

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

    const trimmedName = displayName.trim();

    // Only a display name that's actually going to be shown (leaderboard
    // opted in) needs to pass these checks -- an empty/unused name is
    // always fine.
    if (leaderboardOptIn && trimmedName) {
      if (profanityFilter.isProfane(trimmedName)) {
        setStatus('error');
        setErrorMsg(
          'That display name isn\'t allowed. Please choose something else.'
        );
        return;
      }

      // Case-insensitive check against everyone else's display name. The
      // database also enforces this for real (two people can't end up
      // with the same name even if they both hit save at the same
      // moment) -- this is just for instant, friendly feedback before
      // that.
      const { data: existing, error: lookupError } = await supabase
        .from('user_settings')
        .select('user_id')
        .ilike('display_name', trimmedName)
        .neq('user_id', user.id)
        .maybeSingle();

      if (lookupError) {
        setStatus('error');
        setErrorMsg(lookupError.message);
        return;
      }

      if (existing) {
        setStatus('error');
        setErrorMsg('That display name is already taken. Try another.');
        return;
      }
    }

    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        leaderboard_opt_in: leaderboardOptIn,
        // Store an empty display name as null, not an empty string, so
        // it's unambiguous that nothing was set.
        display_name: trimmedName || null,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      setStatus('error');
      // The database's own uniqueness rule is the real backstop -- if
      // someone else grabbed the same name in the split second between
      // our check above and this save, this is what catches it.
      if (error.code === '23505') {
        setErrorMsg('That display name is already taken. Try another.');
      } else {
        setErrorMsg(error.message);
      }
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
                  Only photo-verified check-ins count toward it.
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
              <p className="modal-error">{errorMsg}</p>
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
