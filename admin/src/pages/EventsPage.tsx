import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { EventItem } from '../types';

const emptyForm = { title: '', event_datetime: '', description: '', image_url: '' };
type EForm = typeof emptyForm;

function SkeletonCard() {
  return (
    <div className="list-card skeleton" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
      <div className="list-card-left" style={{ display: 'flex', gap: '16px', flex: 1 }}>
        <div className="list-card-strip skeleton-strip" style={{ width: '4px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton-title" style={{ height: '20px', backgroundColor: '#E5E7EB', borderRadius: '4px', width: '60%', marginBottom: '8px' }} />
          <div className="skeleton-meta" style={{ height: '16px', backgroundColor: '#E5E7EB', borderRadius: '4px', width: '40%', marginBottom: '8px' }} />
          <div className="skeleton-description" style={{ height: '48px', backgroundColor: '#E5E7EB', borderRadius: '4px', width: '80%' }} />
        </div>
      </div>
      <div className="list-card-right" style={{ textAlign: 'right', minWidth: '140px' }}>
        <div className="skeleton-tag" style={{ height: '24px', backgroundColor: '#E5E7EB', borderRadius: '12px', width: '80px', marginLeft: 'auto' }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
          <div className="skeleton-btn" style={{ width: '50px', height: '32px', backgroundColor: '#E5E7EB', borderRadius: '8px' }} />
          <div className="skeleton-btn" style={{ width: '50px', height: '32px', backgroundColor: '#E5E7EB', borderRadius: '8px' }} />
        </div>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
      <div className="modal-panel" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', width: '90%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 35px -10px rgba(0,0,0,0.2)', borderTop: '4px solid #16A34A' }}>
        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 12px 28px', borderBottom: '1px solid #F0FDF4' }}>
          <div>
            <div className="modal-eyebrow" style={{ color: '#16A34A', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>— Events</div>
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

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<EventItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<EventItem | null>(null);
  const [form, setForm] = useState<EForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(6);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => { load(); }, [currentPage]);

  const load = async () => {
    setLoading(true);
    
    const { count } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true });
    
    setTotalCount(count || 0);
    
    const from = (currentPage - 1) * itemsPerPage;
    const to = from + itemsPerPage - 1;
    
    const { data, error: e } = await supabase
      .from('events')
      .select('*')
      .order('event_datetime', { ascending: false })
      .range(from, to);
    
    setEvents((data || []) as EventItem[]);
    if (e) setError(e.message);
    setLoading(false);
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setError(null); setShowModal(true); };
  const openEdit = (item: EventItem) => {
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
      setShowModal(false); 
      setCurrentPage(1);
      await load();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return; setSaving(true);
    await supabase.from('events').delete().eq('id', deleteItem.id);
    setDeleteItem(null); 
    await load();
    setSaving(false);
  };

  const Pagination = () => {
    if (totalPages <= 1) return null;
    
    const pageNumbers = [];
    const maxVisible = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let endPage = Math.min(totalPages, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
      startPage = Math.max(1, endPage - maxVisible + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return (
      <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '24px', flexWrap: 'wrap' }}>
        <button 
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{ padding: '8px 16px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '10px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, color: '#1F2937' }}
        >
          ← Previous
        </button>
        
        {startPage > 1 && (
          <>
            <button className="pagination-btn" onClick={() => handlePageChange(1)} style={{ padding: '8px 14px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '10px', cursor: 'pointer', color: '#1F2937' }}>1</button>
            {startPage > 2 && <span className="pagination-dots" style={{ color: '#9CA3AF' }}>...</span>}
          </>
        )}
        
        {pageNumbers.map(num => (
          <button
            key={num}
            className={`pagination-btn ${currentPage === num ? 'active' : ''}`}
            onClick={() => handlePageChange(num)}
            style={currentPage === num ? 
              { padding: '8px 14px', backgroundColor: '#16A34A', border: '1px solid #16A34A', borderRadius: '10px', color: '#FFFFFF', cursor: 'pointer' } : 
              { padding: '8px 14px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '10px', color: '#1F2937', cursor: 'pointer' }}
          >
            {num}
          </button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="pagination-dots" style={{ color: '#9CA3AF' }}>...</span>}
            <button className="pagination-btn" onClick={() => handlePageChange(totalPages)} style={{ padding: '8px 14px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '10px', cursor: 'pointer', color: '#1F2937' }}>
              {totalPages}
            </button>
          </>
        )}
        
        <button 
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          style={{ padding: '8px 16px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '10px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, color: '#1F2937' }}
        >
          Next →
        </button>
      </div>
    );
  };

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
      <div className="top-bar" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderBottom: '1px solid #DCFCE7' }}>
        <div>
          <div className="page-eyebrow" style={{ color: '#16A34A', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>— Programming</div>
          <h1 className="page-title" style={{ color: '#1F2937', fontSize: '2rem', fontWeight: '700', marginTop: '8px', marginBottom: 0 }}>Events</h1>
          <div className="page-gold-line" style={{ height: '3px', width: '60px', backgroundColor: '#16A34A', margin: '12px 0 16px 0' }} />
          <p className="page-subtitle" style={{ color: '#4B5563', marginTop: '8px' }}>Manage upcoming and past museum events.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ backgroundColor: '#16A34A', border: 'none', padding: '10px 20px', borderRadius: '12px', color: '#FFFFFF', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>+ Add Event</button>
      </div>

      <div className="panel" style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', margin: '0 32px 32px 32px', padding: '24px' }}>
        {loading ? (
          <div className="card-list">
            {[...Array(itemsPerPage)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="empty-state" style={{ textAlign: 'center', padding: '60px', color: '#6B7280' }}>No events yet. Schedule your first one.</div>
        ) : (
          <>
            <div className="card-list">
              {events.map(item => (
                <div key={item.id} className="list-card" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '20px', marginBottom: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', border: '1px solid #F0FDF4', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div className="list-card-left" style={{ display: 'flex', gap: '16px', flex: 1 }}>
                    <div className="list-card-strip" style={{ width: '4px', backgroundColor: '#16A34A', borderRadius: '4px' }} />
                    <div>
                      <div className="list-card-title" style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1F2937', marginBottom: '6px' }}>{item.title}</div>
                      <div className="list-card-meta" style={{ fontSize: '0.875rem', color: '#16A34A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📅 {new Date(item.event_datetime).toLocaleString()}
                      </div>
                      {item.description && (
                        <div className="list-card-body" style={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: '1.5' }}>{item.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="list-card-right" style={{ textAlign: 'right', minWidth: '140px' }}>
                    <span className={`tag ${item.image_url ? 'tag-success' : ''}`} style={item.image_url ? { backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', display: 'inline-block' } : { backgroundColor: '#F3F4F6', color: '#6B7280', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '500', display: 'inline-block' }}>
                      {item.image_url ? '✓ Image added' : 'No image'}
                    </span>
                    <div style={{ display: 'flex', gap: 8, marginTop: 10, justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)} style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #D1D5DB', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', color: '#1F2937' }}>
                        Edit
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setDeleteItem(item)} style={{ padding: '6px 12px', backgroundColor: '#DC2626', border: 'none', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', color: '#FFFFFF' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Pagination />
            <div className="pagination-info" style={{ textAlign: 'center', marginTop: '16px', fontSize: '0.75rem', color: '#9CA3AF' }}>
              Showing {events.length} of {totalCount} events
            </div>
          </>
        )}
      </div>

      {showModal && (
        <Modal title={editItem ? 'Edit Event' : 'New Event'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 20 }}>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, color: '#1F2937' }}>Event Name</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px', transition: 'all 0.2s' }} />
            </div>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, color: '#1F2937' }}>Date & Time</label>
              <input 
                type="datetime-local" 
                value={form.event_datetime}
                onChange={e => setForm({ ...form, event_datetime: e.target.value })} 
                style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px' }}
              />
            </div>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, color: '#1F2937' }}>Description</label>
              <textarea 
                rows={3} 
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })} 
                style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px', fontFamily: 'inherit' }}
              />
            </div>
            <div className="field" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontWeight: 500, color: '#1F2937' }}>Image URL</label>
              <input 
                value={form.image_url}
                onChange={e => setForm({ ...form, image_url: e.target.value })}
                placeholder="https://…" 
                style={{ padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px' }}
              />
            </div>
            {error && <div className="alert-box" style={{ backgroundColor: '#FEE2E2', borderLeft: '4px solid #EF4444', padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}><span className="alert-ico" style={{ color: '#EF4444' }}>!</span><span style={{ color: '#991B1B' }}>{error}</span></div>}
            <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ padding: '8px 20px', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#1F2937' }}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving} style={{ backgroundColor: '#16A34A', border: 'none', padding: '8px 24px', borderRadius: '10px', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}>
                {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Create Event'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteItem && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDeleteItem(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="modal-panel modal-sm" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 35px -10px rgba(0,0,0,0.2)', borderTop: '4px solid #DC2626' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 12px 28px', borderBottom: '1px solid #F0FDF4' }}>
              <div>
                <div className="modal-eyebrow" style={{ color: '#DC2626', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>— Confirm</div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginTop: '4px', marginBottom: '4px', color: '#1F2937' }}>Delete Event</h3>
                <div className="modal-goldline" style={{ height: '2px', width: '50px', backgroundColor: '#DC2626', marginTop: '8px' }} />
              </div>
              <button className="modal-close" onClick={() => setDeleteItem(null)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#9CA3AF' }}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '28px' }}>
              <p style={{ color: '#4B5563' }}>
                Delete <strong style={{ color: '#1F2937' }}>"{deleteItem.title}"</strong>? This cannot be undone.
              </p>
              <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button className="btn btn-ghost" onClick={() => setDeleteItem(null)} style={{ padding: '8px 20px', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#1F2937' }}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={saving} style={{ backgroundColor: '#DC2626', border: 'none', padding: '8px 24px', borderRadius: '10px', color: '#FFFFFF', fontWeight: 500, cursor: 'pointer' }}>
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