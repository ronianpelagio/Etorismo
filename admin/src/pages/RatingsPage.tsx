import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { RatingReview } from '../types';

export default function RatingsPage() {
  const [reviews, setReviews]     = useState<RatingReview[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<RatingReview | null>(null);
  const [saving, setSaving]       = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from('user_ratings')
      .select('*, users(email, full_name), artifacts(name)')
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    setReviews((data || []) as RatingReview[]);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteItem) return; setSaving(true);
    await supabase.from('user_ratings').delete().eq('id', deleteItem.id);
    setDeleteItem(null); await load(); setSaving(false);
  };

  const stars = (n: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <span key={i} style={{ color: i < n ? '#C9A84C' : 'var(--border)', fontSize: 14 }}>★</span>
    ));

  return (
    <div className="page-shell">
      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— Visitor Feedback</div>
          <h1 className="page-title">Ratings & Reviews</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">Browse visitor feedback and star ratings.</p>
        </div>
      </div>

      {error && <div className="alert-box" style={{ marginBottom: 20 }}><span className="alert-ico">!</span><span>{error}</span></div>}

      <div className="panel">
        {loading ? (
          <div className="empty-state">Loading reviews…</div>
        ) : reviews.length === 0 ? (
          <div className="empty-state">No ratings or reviews available yet.</div>
        ) : (
          <div className="card-list">
            {reviews.map(r => {
              const author = (r as any).users?.full_name || (r as any).users?.email || 'Anonymous';
              const artifact = (r as any).artifacts?.name || 'Unknown artifact';
              return (
                <div key={r.id} className="review-list-card">
                  <div className="review-list-top">
                    <div className="review-avatar">{author[0].toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div className="review-author">{author}</div>
                      <div className="review-artifact">re: {artifact}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div>{stars(r.rating ?? 0)}</div>
                      <div className="review-date">{new Date(r.created_at || '').toLocaleDateString()}</div>
                    </div>
                  </div>
                  <p className="review-body">{r.feedback || 'No comment provided.'}</p>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-danger btn-sm" onClick={() => setDeleteItem(r)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteItem && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDeleteItem(null)}>
          <div className="modal-panel modal-sm">
            <div className="modal-header">
              <div><div className="modal-eyebrow">— Confirm</div><h3>Remove Review</h3><div className="modal-goldline" /></div>
              <button className="modal-close" onClick={() => setDeleteItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--ink-mid)' }}>Remove this review permanently?</p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteItem(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Removing…' : 'Remove'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}