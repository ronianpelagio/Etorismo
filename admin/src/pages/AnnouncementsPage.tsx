import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Announcement } from '../types';

const emptyForm = { title: '', description: '', announcement_datetime: '', image_url: '' };
type AForm = typeof emptyForm;

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="modal-panel" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 35px -10px rgba(0,0,0,0.2)', borderTop: '4px solid #16A34A' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 12px 28px', borderBottom: '1px solid #F0FDF4' }}>
          <div>
            <div className="modal-eyebrow" style={{ color: '#16A34A', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>— Manage</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '4px', marginBottom: '4px', color: '#1F2937' }}>{title}</h3>
            <div className="modal-goldline" style={{ height: '2px', width: '50px', backgroundColor: '#16A34A', marginTop: '8px' }} />
          </div>
          <button className="modal-close" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '28px' }}>{children}</div>
      </div>
    </div>
  );
}

function DeleteModal({ item, onClose, onConfirm, saving }:
  { item: Announcement; onClose: () => void; onConfirm: () => void; saving: boolean }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="modal-panel modal-sm" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 35px -10px rgba(0,0,0,0.2)', borderTop: '4px solid #DC2626' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 12px 28px', borderBottom: '1px solid #F0FDF4' }}>
          <div>
            <div className="modal-eyebrow" style={{ color: '#DC2626', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>— Confirm Action</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '4px', marginBottom: '4px', color: '#1F2937' }}>Delete Announcement</h3>
            <div className="modal-goldline" style={{ height: '2px', width: '50px', backgroundColor: '#DC2626', marginTop: '8px' }} />
          </div>
          <button className="modal-close" onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: '28px' }}>
          <p style={{ color: '#4B5563', lineHeight: 1.6 }}>
            Are you sure you want to delete <strong style={{ color: '#1F2937' }}>"{item.title}"</strong>?
            This action cannot be undone.
          </p>
          <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose} style={{ padding: '8px 20px', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#1F2937' }}>Cancel</button>
            <button className="btn btn-danger" onClick={onConfirm} disabled={saving} style={{ backgroundColor: '#DC2626', border: 'none', padding: '8px 24px', borderRadius: '10px', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}>
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
    <div className="page-shell" style={{ backgroundColor: '#F0FDF4', minHeight: '100vh' }}>
      <style>{`
        .btn-primary {
          background-color: #16A34A !important;
          border-color: #16A34A !important;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          background-color: #15803D !important;
          border-color: #15803D !important;
          transform: translateY(-1px);
        }
        .btn-danger {
          background-color: #DC2626 !important;
          border-color: #DC2626 !important;
        }
        .btn-danger:hover {
          background-color: #B91C1C !important;
        }
        .btn-ghost {
          background: transparent !important;
          border: 1px solid #D1D5DB !important;
        }
        .btn-ghost:hover {
          border-color: #16A34A !important;
          color: #16A34A !important;
        }
        .tag-success {
          background-color: #DCFCE7 !important;
          color: #15803D !important;
        }
        .list-card {
          transition: all 0.2s ease;
        }
        .list-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        }
        .list-card-strip {
          background-color: #16A34A !important;
        }
        .field input:focus, .field textarea:focus {
          border-color: #16A34A !important;
          outline: none !important;
          box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.1) !important;
        }
      `}</style>
      {/* Header */}
      <div className="top-bar" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderBottom: '1px solid #DCFCE7' }}>
        <div>
          <div className="page-eyebrow" style={{ color: '#16A34A', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>— Content Management</div>
          <h1 className="page-title" style={{ color: '#1F2937', fontSize: '2rem', fontWeight: '700', marginTop: '8px', marginBottom: 0 }}>Announcements</h1>
          <div className="page-gold-line" style={{ height: '3px', width: '60px', backgroundColor: '#16A34A', margin: '12px 0 16px 0' }} />
          <p className="page-subtitle" style={{ color: '#4B5563', marginTop: '8px' }}>Publish notices and updates for museum visitors.</p>
        </div>
        <div className="top-bar-actions">
          <button className="btn btn-primary" onClick={openCreate} style={{ backgroundColor: '#16A34A', border: 'none', padding: '10px 20px', borderRadius: '12px', color: '#FFFFFF', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>+ New Announcement</button>
        </div>
      </div>

      {error && <div className="alert-box" style={{ marginBottom: 20, margin: '0 32px 20px 32px', backgroundColor: '#FEE2E2', borderLeft: '4px solid #EF4444', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}><span className="alert-ico" style={{ color: '#EF4444' }}>!</span><span style={{ color: '#991B1B' }}>{error}</span></div>}

      {/* List panel */}
      <div className="panel" style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', margin: '0 32px 32px 32px', padding: '24px' }}>
        {loading ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>Loading announcements…</div>
        ) : announcements.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>No announcements yet. Create your first one.</div>
        ) : (
          <div className="card-list">
            {announcements.map(item => (
              <div key={item.id} className="list-card" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #F0FDF4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                <div className="list-card-left" style={{ display: 'flex', gap: '16px', flex: 1 }}>
                  <div className="list-card-strip" style={{ width: '4px', backgroundColor: '#16A34A', borderRadius: '4px' }} />
                  <div>
                    <div className="list-card-title" style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1F2937', marginBottom: '6px' }}>{item.title}</div>
                    <div className="list-card-meta" style={{ fontSize: '0.875rem', color: '#16A34A', marginBottom: '8px' }}>
                      📅 {new Date(item.announcement_datetime).toLocaleString()}
                    </div>
                    {item.description && (
                      <div className="list-card-body" style={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: '1.5' }}>{item.description}</div>
                    )}
                  </div>
                </div>
                <div className="list-card-right" style={{ textAlign: 'right', minWidth: '140px' }}>
                  <span className={`tag ${item.image_url ? 'tag-success' : ''}`} style={item.image_url ? { backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', display: 'inline-block' } : { backgroundColor: '#F3F4F6', color: '#6B7280', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', display: 'inline-block' }}>
                    {statusLabel(item)}
                  </span>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', color: '#1F2937' }}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteItem(item)} style={{ padding: '6px 12px', backgroundColor: '#DC2626', border: 'none', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', color: '#FFFFFF' }}>Delete</button>
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
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, color: '#1F2937' }}>Title</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Announcement title" style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px', transition: 'all 0.2s' }} />
            </div>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, color: '#1F2937' }}>Date & Time</label>
              <input type="datetime-local" value={form.announcement_datetime}
                onChange={e => setForm({ ...form, announcement_datetime: e.target.value })} 
                style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px' }} />
            </div>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, color: '#1F2937' }}>Description</label>
              <textarea rows={3} value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Optional details…" 
                style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px', fontFamily: 'inherit' }} />
            </div>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, color: '#1F2937' }}>Image URL</label>
              <input value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…" 
                style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px' }} />
            </div>
            {error && <div className="alert-box" style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #EF4444', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><span className="alert-ico" style={{ color: '#EF4444' }}>!</span><span style={{ color: '#991B1B' }}>{error}</span></div>}
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ padding: '8px 20px', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#1F2937' }}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ backgroundColor: '#16A34A', border: 'none', padding: '8px 24px', borderRadius: '10px', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}>
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