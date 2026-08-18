import { useEffect, useState } from 'react';
import { Filter } from 'bad-words';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useCheckIns, storagePathFromPublicUrl } from '../CheckInsContext';

const profanityFilter = new Filter();

export default function SettingsModal({ onClose }) {
  const { user, signOut } = useAuth();
  const { checkedInPhotoUrls } = useCheckIns();
  const [leaderboardOptIn, setLeaderboardOptIn] = useState(false);
  const [displayName, setDisplayName] = useState('');
  // What's actually saved right now, so we can tell (a) whether there are
  // unsaved changes worth warning about on close, and (b) fall back to the
  // last-known-good display name if someone edits it into something
  // invalid -- an invalid name shouldn't be able to block saving the
  // leaderboard toggle, since those are two unrelated things.
  const [savedLeaderboardOptIn, setSavedLeaderboardOptIn] = useState(false);
  const [savedDisplayName, setSavedDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState('');
  const [deleteStatus, setDeleteStatus] = useState('idle'); // idle | deleting | error

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
          setSavedLeaderboardOptIn(data.leaderboard_opt_in);
          setSavedDisplayName(data.display_name || '');
        }
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  const hasUnsavedChanges =
    !loading &&
    (leaderboardOptIn !== savedLeaderboardOptIn ||
      displayName.trim() !== savedDisplayName);

  function handleCloseAttempt() {
    if (
      hasUnsavedChanges &&
      !window.confirm('You have unsaved changes. Discard them?')
    ) {
      return;
    }
    onClose();
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!user) return;

    setStatus('saving');
    setErrorMsg('');

    const trimmedName = displayName.trim();
    const nameChanged = trimmedName !== savedDisplayName;

    // A name only needs to pass these checks if it's actually going to be
    // shown (leaderboard on) AND it's actually being changed -- no reason
    // to re-validate a name that's already saved and untouched.
    let nameError = null;
    if (leaderboardOptIn && trimmedName && nameChanged) {
      if (trimmedName.length < 3) {
        nameError = 'Display name needs to be at least 3 characters.';
      } else if (profanityFilter.isProfane(trimmedName)) {
        nameError = "That display name isn't allowed. Please choose something else.";
      } else {
        // Case-insensitive check against everyone else's display name.
        // The database also enforces this for real (two people can't end
        // up with the same name even if they both hit save at the same
        // moment) -- this is just for instant, friendly feedback before
        // that.
        const { data: existing, error: lookupError } = await supabase
          .from('user_settings')
          .select('user_id')
          .ilike('display_name', trimmedName)
          .neq('user_id', user.id)
          .maybeSingle();

        if (lookupError) {
          nameError = lookupError.message;
        } else if (existing) {
          nameError = 'That display name is already taken. Try another.';
        }
      }
    }

    // If the name is invalid, don't let that block the leaderboard
    // toggle -- save the toggle with whatever name was already saved
    // before, and tell the person clearly that only the name part didn't
    // go through.
    const nameToSave = nameError ? savedDisplayName : trimmedName;

    const { error } = await supabase.from('user_settings').upsert(
      {
        user_id: user.id,
        leaderboard_opt_in: leaderboardOptIn,
        // Store an empty display name as null, not an empty string, so
        // it's unambiguous that nothing was set.
        display_name: nameToSave || null,
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
      return;
    }

    setSavedLeaderboardOptIn(leaderboardOptIn);
    setSavedDisplayName(nameToSave);

    if (nameError) {
      setStatus('error');
      setErrorMsg(
        `Your leaderboard setting was saved, but your display name wasn't: ${nameError}`
      );
      // Revert the input back to the last-good name so the field isn't
      // left showing an unsaved, invalid value.
      setDisplayName(nameToSave);
    } else {
      setStatus('saved');
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;

    const confirmed = window.confirm(
      'Delete your account? This permanently removes your account, every ' +
      'stairway you\'ve checked off, all your photo verifications, and any ' +
      'badges or leaderboard standing tied to it. This cannot be undone.'
    );
    if (!confirmed) return;

    setDeleteStatus('deleting');

    // Clean up photo files first -- once the account row is gone, we'd
    // have no record of which files were even ours to remove.
    const paths = [...checkedInPhotoUrls.values()]
      .map(storagePathFromPublicUrl)
      .filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from('checkin-photos').remove(paths).catch(() => {});
    }

    const { error } = await supabase.rpc('delete_my_account');

    if (error) {
      setDeleteStatus('error');
      setErrorMsg(`Couldn't delete your account: ${error.message}`);
      return;
    }

    await signOut();
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={handleCloseAttempt}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button
          className="modal-close"
          onClick={handleCloseAttempt}
          aria-label="Close"
        >
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
                  minLength={3}
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

            <div className="settings-danger-zone">
              {deleteStatus === 'error' && (
                <p className="modal-error">{errorMsg}</p>
              )}
              <button
                type="button"
                className="settings-delete-account"
                onClick={handleDeleteAccount}
                disabled={deleteStatus === 'deleting'}
              >
                {deleteStatus === 'deleting'
                  ? 'Deleting…'
                  : 'Delete my account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
