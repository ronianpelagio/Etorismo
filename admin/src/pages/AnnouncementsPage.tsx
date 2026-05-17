import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Announcement } from '../types';

const emptyForm = { title: '', description: '', announcement_datetime: '', image_url: '' };
type AForm = typeof emptyForm;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow">— Manage</div>
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

function DeleteModal({ item, onClose, onConfirm, saving }:
  { item: Announcement; onClose: () => void; onConfirm: () => void; saving: boolean }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel modal-sm">
        <div className="modal-header">
          <div>
            <div className="modal-eyebrow">— Confirm Action</div>
            <h3>Delete Announcement</h3>
            <div className="modal-goldline" />
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--ink-mid)', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong style={{ color: 'var(--ink)' }}>"{item.title}"</strong>?
            This action cannot be undone.
          </p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm} disabled={saving}>
              {saving ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState<Announcement | null>(null);
  const [deleteItem, setDeleteItem] = useState<Announcement | null>(null);
  const [form, setForm]             = useState<AForm>(emptyForm);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('announcements')
      .select('*').order('announcement_datetime', { ascending: false });
    setAnnouncements((data || []) as Announcement[]);
    if (e) setError(e.message);
    setLoading(false);
  };

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setShowModal(true); };
  const openEdit   = (item: Announcement) => {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description ?? '',
      announcement_datetime: item.announcement_datetime
        ? new Date(item.announcement_datetime).toISOString().slice(0, 16) : '',
      image_url: item.image_url ?? '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      if (!form.title || !form.announcement_datetime) throw new Error('Title and date are required.');
      const payload = {
        title: form.title,
        description: form.description || null,
        announcement_datetime: new Date(form.announcement_datetime).toISOString(),
        image_url: form.image_url || null,
      };
      if (editItem) {
        const { error: e } = await supabase.from('announcements').update(payload).eq('id', editItem.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('announcements').insert(payload);
        if (e) throw e;
      }
      setShowModal(false); await load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    const { error: e } = await supabase.from('announcements').delete().eq('id', deleteItem.id);
    if (e) setError(e.message);
    setDeleteItem(null); await load();
    setSaving(false);
  };

  const statusLabel = (item: Announcement) => item.image_url ? 'Published' : 'Draft';

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— Content Management</div>
          <h1 className="page-title">Announcements</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">Publish notices and updates for museum visitors.</p>
        </div>
        <div className="top-bar-actions">
          <button className="btn btn-primary" onClick={openCreate}>+ New Announcement</button>
        </div>
      </div>

      {error && <div className="alert-box" style={{ marginBottom: 20 }}><span className="alert-ico">!</span><span>{error}</span></div>}

      {/* List panel */}
      <div className="panel">
        {loading ? (
          <div className="empty-state">Loading announcements…</div>
        ) : announcements.length === 0 ? (
          <div className="empty-state">No announcements yet. Create your first one.</div>
        ) : (
          <div className="card-list">
            {announcements.map(item => (
              <div key={item.id} className="list-card">
                <div className="list-card-left">
                  <div className="list-card-strip" />
                  <div>
                    <div className="list-card-title">{item.title}</div>
                    <div className="list-card-meta">
                      {new Date(item.announcement_datetime).toLocaleString()}
                    </div>
                    {item.description && (
                      <div className="list-card-body">{item.description}</div>
                    )}
                  </div>
                </div>
                <div className="list-card-right">
                  <span className={`tag ${item.image_url ? 'tag-success' : ''}`}>
                    {statusLabel(item)}
                  </span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteItem(item)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <Modal title={editItem ? 'Edit Announcement' : 'New Announcement'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div className="field">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" />
            </div>
            <div className="field">
              <label>Date & Time</label>
              <input type="datetime-local" value={form.announcement_datetime}
                onChange={e => setForm({ ...form, announcement_datetime: e.target.value })} />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea rows={3} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Optional details…" />
            </div>
            <div className="field">
              <label>Image URL</label>
              <input value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…" />
            </div>
            {error && <div className="alert-box"><span className="alert-ico">!</span><span>{error}</span></div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Publish'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Modal */}
      {deleteItem && (
        <DeleteModal item={deleteItem} onClose={() => setDeleteItem(null)}
          onConfirm={handleDelete} saving={saving} />
      )}
    </div>
  );
}