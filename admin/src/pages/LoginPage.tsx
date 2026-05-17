import React, { useState } from 'react';
import { supabase } from '../services/supabase';

type Props = { onLoggedIn: () => void; error?: string | null };

export default function LoginPage({ onLoggedIn, error }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [authErr, setAuthErr]   = useState<string | null>(null);
  const [showPwd, setShowPwd]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setAuthErr(null);
    const { error: err } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(), password,
    });
    setLoading(false);
    if (err) { setAuthErr(err.message); return; }
    onLoggedIn();
  };

  return (
    <main className="login-shell">
      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-gem">E</div>
          <span className="login-brand-name">ETorismo</span>
        </div>

        <div className="login-goldline" />

        <h1 className="login-title">Admin Portal</h1>
        <p className="login-sub">Sacred Heritage Collection Dashboard</p>

        {(authErr || error) && (
          <div className="alert-box">
            <span className="alert-ico">!</span>
            <span>{authErr || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16, marginTop: 24 }}>
          <div className="field">
            <label>Email Address</label>
            <input type="email" value={email} autoComplete="email"
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@etorismo.com" />
          </div>
          <div className="field" style={{ position: 'relative' }}>
            <label>Password</label>
            <input type={showPwd ? 'text' : 'password'} value={password}
              autoComplete="current-password"
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ paddingRight: 48 }} />
            <button type="button" className="pwd-toggle" onClick={() => setShowPwd(v => !v)}>
              {showPwd ? '🙈' : '👁'}
            </button>
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>
        </form>

        <p className="login-footer">Web-only · Separated from mobile app</p>
      </div>
    </main>
  );
}