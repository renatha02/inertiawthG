import React, { useState } from 'react';

export default function Login({ onLogin, error }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      await onLogin(email, password);
    } catch (err) {
      setLocalError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page" style={{ display: 'flex', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
      <div className="glass-panel" style={{ maxWidth: '420px', width: '100%', padding: '32px' }}>
        <h1 style={{ marginBottom: '12px' }}>RENATHA Pharmacy Login</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Sign in to manage inventory, sales, alerts, and USSD operations.
        </p>

        {(error || localError) && (
          <div className="alert-banner" style={{ marginBottom: '16px' }}>
            {error || localError}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
              required
            />
          </label>

          <label>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Logging in…' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}
