import React, { useState } from 'react';

export default function SettingsPage() {
  const [form, setForm] = useState({
    museumName: 'ETorismo', defaultLanguage: 'English',
    timezone: 'UTC', notifications: true,
  });
  const [showModal, setShowModal] = useState(false);
  const [saved, setSaved]         = useState(false);

  const handleSave = () => {
    setShowModal(false); setSaved(true);
    setTimeout(() => setSaved(false), 2600);
  };

  return (
    <div className="page-shell">
      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— System</div>
          <h1 className="page-title">Settings</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">Control application preferences and system defaults.</p>
        </div>
      </div>

      <div className="panel form-panel">
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="field"><label>Museum Name</label>
            <input value={form.museumName}
              onChange={e => setForm({ ...form, museumName: e.target.value })} />
          </div>
          <div className="field"><label>Default Language</label>
            <input value={form.defaultLanguage}
              onChange={e => setForm({ ...form, defaultLanguage: e.target.value })} />
          </div>
          <div className="field"><label>Timezone</label>
            <input value={form.timezone}
              onChange={e => setForm({ ...form, timezone: e.target.value })} />
          </div>
          <div className="field field-switch">
            <label>Notifications</label>
            <label className="switch">
              <input type="checkbox" checked={form.notifications}
                onChange={e => setForm({ ...form, notifications: e.target.checked })} />
              <span className="slider-track" />
            </label>
          </div>
        </div>
        {saved && <div className="toast toast-success" style={{ marginTop: 16 }}>✓ Settings saved successfully.</div>}
        <div className="action-row" style={{ marginTop: 24 }}>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>Save Changes</button>
        </div>
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-panel modal-sm">
            <div className="modal-header">
              <div><div className="modal-eyebrow">— Confirm</div><h3>Save Settings</h3><div className="modal-goldline" /></div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--ink-mid)' }}>
                Apply these changes to <strong style={{ color: 'var(--ink)' }}>{form.museumName}</strong>?
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave}>Confirm & Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}