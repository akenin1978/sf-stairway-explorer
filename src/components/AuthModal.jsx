import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthModal({ onClose }) {
  const [mode, setMode] = useState('sign-in'); // 'sign-in' | 'sign-up'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');

    const { error } =
      mode === 'sign-in'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
      return;
    }

    if (mode === 'sign-up') {
      // Depending on your Supabase Auth settings, new accounts may need to
      // confirm their email before they can sign in -- show a clear next
      // step either way rather than assuming.
      setStatus('success');
    } else {
      onClose();
    }
  }

  async function handleGoogleSignIn() {
    setStatus('submitting');
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    // On success, the browser navigates away to Google immediately, so
    // there's nothing further to do here. We only reach this point if the
    // request itself failed to even start.
    if (error) {
      setStatus('error');
      setErrorMsg(error.message);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {status === 'success' && mode === 'sign-up' ? (
          <div>
            <h2>Check your email</h2>
            <p>
              We sent a confirmation link to <strong>{email}</strong>. Click
              it to finish creating your account, then come back and sign in.
            </p>
          </div>
        ) : (
          <>
            <h2>{mode === 'sign-in' ? 'Sign in' : 'Create an account'}</h2>

            <button
              type="button"
              className="google-signin-button"
              onClick={handleGoogleSignIn}
              disabled={status === 'submitting'}
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="auth-divider">
              <span>or</span>
            </div>

            <form onSubmit={handleSubmit}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={
                  mode === 'sign-in' ? 'current-password' : 'new-password'
                }
                minLength={6}
                required
              />

              {status === 'error' && (
                <p className="modal-error">{errorMsg}</p>
              )}

              <button type="submit" disabled={status === 'submitting'}>
                {status === 'submitting'
                  ? 'Please wait…'
                  : mode === 'sign-in'
                    ? 'Sign in'
                    : 'Create account'}
              </button>
            </form>

            <p className="auth-switch">
              {mode === 'sign-in' ? (
                <>
                  New here?{' '}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setMode('sign-up');
                      setStatus('idle');
                      setErrorMsg('');
                    }}
                  >
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => {
                      setMode('sign-in');
                      setStatus('idle');
                      setErrorMsg('');
                    }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58Z"
      />
    </svg>
  );
}
