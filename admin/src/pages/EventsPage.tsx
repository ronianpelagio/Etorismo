import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { EventItem } from '../types';

const emptyForm = { title: '', event_datetime: '', description: '', image_url: '' };
type EForm = typeof emptyForm;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel">
        <div className="modal-header">
          <div><div className="modal-eyebrow">— Events</div><h3>{title}</h3><div className="modal-goldline" /></div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default function EventsPage() {
  const [events, setEvents]         = useState<EventItem[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState<EventItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<EventItem | null>(null);
  const [form, setForm]             = useState<EForm>(emptyForm);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('events')
      .select('*').order('event_datetime', { ascending: false });
    setEvents((data || []) as EventItem[]);
    if (e) setError(e.message);
    setLoading(false);
  };

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setError(null); setShowModal(true); };
  const openEdit   = (item: EventItem) => {
    setEditItem(item);
    setForm({
      title: item.title,
      event_datetime: item.event_datetime ? new Date(item.event_datetime).toISOString().slice(0, 16) : '',
      description: item.description ?? '',
      image_url: item.image_url ?? '',
    });
    setError(null); setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (!form.title || !form.event_datetime) throw new Error('Title and date are required.');
      const payload = {
        title: form.title,
        event_datetime: new Date(form.event_datetime).toISOString(),
        description: form.description || null,
        image_url: form.image_url || null,
      };
      if (editItem) {
        const { error: e } = await supabase.from('events').update(payload).eq('id', editItem.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('events').insert(payload);
        if (e) throw e;
      }
      setShowModal(false); await load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return; setSaving(true);
    await supabase.from('events').delete().eq('id', deleteItem.id);
    setDeleteItem(null); await load(); setSaving(false);
  };

  return (
    <div className="page-shell">
      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— Programming</div>
          <h1 className="page-title">Events</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">Manage upcoming and past museum events.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Event</button>
      </div>

      <div className="panel">
        {loading ? (
          <div className="empty-state">Loading events…</div>
        ) : events.length === 0 ? (
          <div className="empty-state">No events yet. Schedule your first one.</div>
        ) : (
          <div className="card-list">
            {events.map(item => (
              <div key={item.id} className="list-card">
                <div className="list-card-left">
                  <div className="list-card-strip" />
                  <div>
                    <div className="list-card-title">{item.title}</div>
                    <div className="list-card-meta">{new Date(item.event_datetime).toLocaleString()}</div>
                    {item.description && <div className="list-card-body">{item.description}</div>}
                  </div>
                </div>
                <div className="list-card-right">
                  <span className={`tag ${item.image_url ? 'tag-success' : ''}`}>
                    {item.image_url ? 'Image added' : 'No image'}
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

      {showModal && (
        <Modal title={editItem ? 'Edit Event' : 'New Event'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
            <div className="field"><label>Event Name</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="field"><label>Date & Time</label>
              <input type="datetime-local" value={form.event_datetime}
                onChange={e => setForm({ ...form, event_datetime: e.target.value })} />
            </div>
            <div className="field"><label>Description</label>
              <textarea rows={3} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="field"><label>Image URL</label>
              <input value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…" />
            </div>
            {error && <div className="alert-box"><span className="alert-ico">!</span><span>{error}</span></div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteItem && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDeleteItem(null)}>
          <div className="modal-panel modal-sm">
            <div className="modal-header">
              <div><div className="modal-eyebrow">— Confirm</div><h3>Delete Event</h3><div className="modal-goldline" /></div>
              <button className="modal-close" onClick={() => setDeleteItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--ink-mid)' }}>
                Delete <strong style={{ color: 'var(--ink)' }}>"{deleteItem.title}"</strong>? This cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteItem(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
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