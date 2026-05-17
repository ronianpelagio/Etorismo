import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { LiveMass } from '../types';

const defaultSession: LiveMass = { title: 'Museum Live Stream', stream_url: '', is_live: false, started_at: null, created_at: null };

export default function LivePage() {
  const [session, setSession]     = useState<LiveMass>(defaultSession);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showStop, setShowStop]   = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [saved, setSaved]         = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('live_mass').select('*')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (data) setSession({ id: data.id, title: data.title ?? defaultSession.title,
        stream_url: data.stream_url, is_live: data.is_live ?? false,
        started_at: data.started_at ?? null, created_at: data.created_at ?? null });
      setLoading(false);
    })();
  }, []);

  const saveSession = async (update: Partial<LiveMass>) => {
    setSaving(true); setError(null);
    const payload = { title: update.title ?? session.title, stream_url: update.stream_url ?? session.stream_url,
      is_live: update.is_live ?? session.is_live, started_at: update.started_at ?? session.started_at };
    try {
      if (session.id) {
        const { error: e } = await supabase.from('live_mass').update(payload).eq('id', session.id);
        if (e) throw e;
      } else {
        const { data, error: e } = await supabase.from('live_mass').insert(payload).select().maybeSingle();
        if (e) throw e;
        if (data?.id) setSession(s => ({ ...s, id: data.id }));
      }
      setSession(s => ({ ...s, ...payload }));
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const toggleLive = async () => {
    const next = !session.is_live;
    await saveSession({ is_live: next, started_at: next ? new Date().toISOString() : null });
    setShowModal(false); setShowStop(false);
  };

  return (
    <div className="page-shell">
      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— Broadcast</div>
          <h1 className="page-title">Live Streaming</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">Control live events and share your streaming URL.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className={`live-badge ${session.is_live ? 'live-badge-on' : ''}`}>
            <span className={`live-dot-badge ${session.is_live ? 'live-dot-badge-on' : ''}`} />
            {session.is_live ? 'LIVE' : 'Offline'}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="panel"><div className="empty-state">Loading stream settings…</div></div>
      ) : (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1.3fr 1fr' }}>
          {/* Settings card */}
          <div className="panel">
            <div className="panel-section-title">Stream Configuration</div>
            <div style={{ display: 'grid', gap: 16, marginTop: 16 }}>
              <div className="field">
                <label>Stream Title</label>
                <input value={session.title} onChange={e => setSession(s => ({ ...s, title: e.target.value }))} />
              </div>
              <div className="field">
                <label>Stream URL</label>
                <input value={session.stream_url ?? ''}
                  onChange={e => setSession(s => ({ ...s, stream_url: e.target.value }))}
                  placeholder="rtmp:// or https://…" />
              </div>
            </div>
            {error && <div className="alert-box" style={{ marginTop: 16 }}><span className="alert-ico">!</span><span>{error}</span></div>}
            {saved && <div className="toast toast-success" style={{ marginTop: 12 }}>✓ Settings saved.</div>}
            <div className="action-row" style={{ marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => saveSession({})} disabled={saving}>
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Control card */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="panel-section-title">Stream Control</div>
            <div className="stream-status-card">
              <div className={`stream-indicator ${session.is_live ? 'stream-indicator-live' : ''}`}>
                {session.is_live ? '⬤' : '◎'}
              </div>
              <div>
                <div className="stream-status-label">{session.is_live ? 'Currently streaming' : 'Not streaming'}</div>
                {session.started_at && (
                  <div className="stream-status-meta">
                    Started {new Date(session.started_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
            <button
              className={`btn ${session.is_live ? 'btn-danger' : 'btn-primary'}`}
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => session.is_live ? setShowStop(true) : setShowModal(true)}
            >
              {session.is_live ? 'Stop Streaming' : 'Start Streaming'}
            </button>
          </div>
        </div>
      )}

      {/* Start confirm modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-panel modal-sm">
            <div className="modal-header">
              <div><div className="modal-eyebrow">— Broadcast</div><h3>Go Live</h3><div className="modal-goldline" /></div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--ink-mid)' }}>
                Start broadcasting <strong style={{ color: 'var(--ink)' }}>"{session.title}"</strong>?
                Make sure your stream URL is configured correctly.
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={toggleLive} disabled={saving}>
                  {saving ? 'Starting…' : '⬤ Go Live'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stop confirm modal */}
      {showStop && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowStop(false)}>
          <div className="modal-panel modal-sm">
            <div className="modal-header">
              <div><div className="modal-eyebrow">— Broadcast</div><h3>End Stream</h3><div className="modal-goldline" /></div>
              <button className="modal-close" onClick={() => setShowStop(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--ink-mid)' }}>
                Are you sure you want to end the live stream? Viewers will be disconnected.
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowStop(false)}>Keep Streaming</button>
                <button className="btn btn-danger" onClick={toggleLive} disabled={saving}>
                  {saving ? 'Stopping…' : 'End Stream'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}