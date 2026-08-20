import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function FriendsModal({ onClose }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [sendStatus, setSendStatus] = useState('idle'); // idle | sending | error
  const [sendError, setSendError] = useState('');

  async function refresh() {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_my_friends');
    if (!error) setFriends(data || []);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const received = friends.filter((f) => !f.i_am_requester && f.status === 'pending');
  const sent = friends.filter((f) => f.i_am_requester && f.status === 'pending');
  const accepted = friends.filter((f) => f.status === 'accepted');

  async function handleSendRequest(e) {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) return;

    setSendStatus('sending');
    setSendError('');

    const { data: found, error: lookupError } = await supabase
      .rpc('find_user_by_email', { lookup_email: trimmed })
      .maybeSingle();

    if (lookupError || !found) {
      setSendStatus('error');
      setSendError("Couldn't find anyone with that email.");
      return;
    }

    if (found.user_id === user.id) {
      setSendStatus('error');
      setSendError("That's your own email.");
      return;
    }

    const alreadyConnected = friends.some((f) => f.friend_user_id === found.user_id);
    if (alreadyConnected) {
      setSendStatus('error');
      setSendError('Already friends or a request is already pending with them.');
      return;
    }

    const { error: insertError } = await supabase
      .from('friendships')
      .insert({ requester_id: user.id, addressee_id: found.user_id });

    if (insertError) {
      setSendStatus('error');
      setSendError(insertError.message);
      return;
    }

    setEmailInput('');
    setSendStatus('idle');
    refresh();
  }

  async function handleAccept(friendshipId) {
    await supabase
      .from('friendships')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', friendshipId);
    refresh();
  }

  async function handleRemove(friendshipId) {
    await supabase.from('friendships').delete().eq('id', friendshipId);
    refresh();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card friends-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        <h2>Friends</h2>

        <form onSubmit={handleSendRequest} className="friends-add-form">
          <input
            type="email"
            placeholder="Friend's email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
          />
          <button type="submit" disabled={sendStatus === 'sending'}>
            {sendStatus === 'sending' ? 'Sending…' : 'Add'}
          </button>
        </form>
        {sendStatus === 'error' && <p className="modal-error">{sendError}</p>}

        {loading ? (
          <p className="modal-context">Loading…</p>
        ) : (
          <>
            {received.length > 0 && (
              <>
                <h3 className="friends-section-heading">
                  Requests ({received.length})
                </h3>
                <div className="friends-list">
                  {received.map((f) => (
                    <div key={f.friendship_id} className="friends-row">
                      <span className="friends-name">{f.friend_display_name}</span>
                      <button
                        className="friends-accept-button"
                        onClick={() => handleAccept(f.friendship_id)}
                      >
                        Accept
                      </button>
                      <button
                        className="friends-decline-button"
                        onClick={() => handleRemove(f.friendship_id)}
                      >
                        Decline
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {sent.length > 0 && (
              <>
                <h3 className="friends-section-heading">Sent</h3>
                <div className="friends-list">
                  {sent.map((f) => (
                    <div key={f.friendship_id} className="friends-row">
                      <span className="friends-name">{f.friend_display_name}</span>
                      <span className="friends-pending-tag">Pending</span>
                      <button
                        className="friends-decline-button"
                        onClick={() => handleRemove(f.friendship_id)}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h3 className="friends-section-heading">
              Friends ({accepted.length})
            </h3>
            {accepted.length === 0 ? (
              <p className="modal-context">
                No friends yet -- add one above by email.
              </p>
            ) : (
              <div className="friends-list">
                {accepted.map((f) => (
                  <div key={f.friendship_id} className="friends-row">
                    <span className="friends-name">{f.friend_display_name}</span>
                    <button
                      className="friends-decline-button"
                      onClick={() => handleRemove(f.friendship_id)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
