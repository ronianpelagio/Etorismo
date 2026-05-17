import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { AudioGuide, Artifact } from '../types';

const emptyForm = { artifact_id: '', artifact_name: '' };

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow">— Audio</div>
            <h3>{title}</h3>
            <div className="modal-goldline" />
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function AudioGuidesPage() {
  const [guides, setGuides] = useState<AudioGuide[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<AudioGuide | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    const [gRes, aRes] = await Promise.all([
      supabase.from('audio_guides').select('*').order('created_at', { ascending: false }),
      supabase.from('artifacts').select('id, name').order('name', { ascending: true }),
    ]);

    if (gRes.error || aRes.error) {
      setError((gRes.error || aRes.error)!.message);
    }

    setGuides((gRes.data || []) as AudioGuide[]);
    setArtifacts((aRes.data || []) as Artifact[]);

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (!form.artifact_id) throw new Error('Artifact is required.');
      if (!file) throw new Error('Please upload an audio file.');

      // Upload file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `audio/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('audio-guides')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('audio-guides')
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Insert to DB
      const { error: insertError } = await supabase.from('audio_guides').insert({
        artifact_id: form.artifact_id,
        artifact_name: form.artifact_name,
        audio_url: publicUrl,
      });

      if (insertError) throw insertError;

      // Reset
      setForm(emptyForm);
      setFile(null);
      setShowModal(false);
      await loadData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    setSaving(true);
    await supabase.from('audio_guides').delete().eq('id', deleteItem.id);

    setDeleteItem(null);
    await loadData();
    setSaving(false);
  };

  return (
    <div className="page-shell">
      {/* HEADER */}
      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— Guided Tours</div>
          <h1 className="page-title">Audio Guides</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">
            Upload and link audio files to artifacts for guided tours.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setForm(emptyForm);
            setFile(null);
            setError(null);
            setShowModal(true);
          }}
        >
          + Add Audio
        </button>
      </div>

      {/* TABLE */}
      <div className="panel">
        {error && (
          <div className="alert-box">
            <span className="alert-ico">!</span>
            <span>{error}</span>
          </div>
        )}

        <div className="table-wrap">
          {loading ? (
            <div className="skeleton-table">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton-row">
                  <span className="skeleton skeleton-row-index" />
                  <span className="skeleton skeleton-row-line" />
                  <span className="skeleton skeleton-row-line short" />
                  <span className="skeleton skeleton-row-actions" />
                </div>
              ))}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Artifact</th>
                  <th>Audio</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {guides.map((g, i) => (
                  <tr key={g.id}>
                    <td className="td-muted">{i + 1}</td>

                    <td>
                      <strong>{g.artifact_name || '—'}</strong>
                    </td>

                    <td>
                      {g.audio_url ? (
                        <audio controls style={{ width: 180 }}>
                          <source src={g.audio_url} />
                        </audio>
                      ) : '—'}
                    </td>

                    <td>
                      <div className="action-row">
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => setDeleteItem(g)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {guides.length === 0 && (
                  <tr>
                    <td colSpan={4} className="empty-cell">
                      No audio guides found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD MODAL */}
      {showModal && (
        <Modal title="Add Audio Guide" onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div className="field">
              <label>Artifact</label>
              <select
                value={form.artifact_id}
                onChange={(e) => {
                  const art = artifacts.find(a => a.id === e.target.value);
                  setForm({
                    ...form,
                    artifact_id: e.target.value,
                    artifact_name: art?.name ?? '',
                  });
                }}
              >
                <option value="">Select an artifact…</option>
                {artifacts.map(a => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label>Upload Audio</label>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>

            {error && (
              <div className="alert-box">
                <span className="alert-ico">!</span>
                <span>{error}</span>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? 'Uploading…' : 'Save Audio'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE MODAL */}
      {deleteItem && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDeleteItem(null)}>
          <div className="modal-panel modal-sm">
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">— Confirm</div>
                <h3>Delete Audio Guide</h3>
                <div className="modal-goldline" />
              </div>
              <button className="modal-close" onClick={() => setDeleteItem(null)}>✕</button>
            </div>

            <div className="modal-body">
              <p style={{ color: 'var(--ink-mid)' }}>
                Remove audio for{' '}
                <strong style={{ color: 'var(--ink)' }}>
                  "{deleteItem.artifact_name}"
                </strong>
                ?
              </p>

              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteItem(null)}>
                  Cancel
                </button>

                <button
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  {saving ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}