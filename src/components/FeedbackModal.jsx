import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function FeedbackModal({ stairway, onClose }) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('submitting');

    const { error } = await supabase.from('feedback').insert({
      stairway_id: stairway?.id ?? null,
      stairway_description: stairway?.description ?? null,
      message: message.trim(),
      contact_email: email.trim() || null,
    });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    } else {
      setStatus('success');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {status === 'success' ? (
          <div>
            <h2>Thanks!</h2>
            <p>Your message has been sent.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2>{stairway ? 'Report an issue' : 'Send feedback'}</h2>

            {stairway && (
              <p className="modal-context">Re: {stairway.description}</p>
            )}

            <textarea
              placeholder={
                stairway
                  ? "What's wrong with this stairway's listing?"
                  : 'Missing a stairway, or something not working right? Let me know.'
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              required
            />

            <input
              type="email"
              placeholder="Your email (optional, if you'd like a reply)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {status === 'error' && (
              <p className="modal-error">Something went wrong: {errorMsg}</p>
            )}

            <button type="submit" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending…' : 'Send'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
