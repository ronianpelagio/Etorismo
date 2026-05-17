import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { AdminUser } from '../types';

const ROLES    = ['user', 'admin'] as const;
const STATUSES = ['active', 'blocked'] as const;
const emptyForm = { email: '', full_name: '', role: 'user', status: 'active' };

export default function UsersPage() {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [editItem, setEditItem]     = useState<AdminUser | null>(null);
  const [deleteItem, setDeleteItem] = useState<AdminUser | null>(null);
  const [form, setForm]             = useState(emptyForm);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    setLoading(true);
    const { data, error: e } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (e) setError(e.message);
    setUsers((data || []) as AdminUser[]);
    setLoading(false);
  };

  const openCreate = () => { setEditItem(null); setForm(emptyForm); setError(null); setShowModal(true); };
  const openEdit   = (u: AdminUser) => {
    setEditItem(u);
    setForm({ email: u.email, full_name: u.full_name ?? '', role: u.role ?? 'user', status: u.status ?? 'active' });
    setError(null); setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(null);
    try {
      if (!form.email) throw new Error('Email is required.');
      if (editItem) {
        const { error: e } = await supabase.from('users')
          .update({ full_name: form.full_name.trim() || null, role: form.role, status: form.status })
          .eq('id', editItem.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('users').insert({
          email: form.email.trim().toLowerCase(),
          full_name: form.full_name.trim() || null,
          role: form.role, status: form.status,
        });
        if (e) throw e;
      }
      setShowModal(false); await fetch();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return; setSaving(true);
    await supabase.from('users').delete().eq('id', deleteItem.id);
    setDeleteItem(null); await fetch(); setSaving(false);
  };

  const toggleStatus = async (u: AdminUser) => {
    setSaving(true);
    await supabase.from('users').update({ status: u.status === 'blocked' ? 'active' : 'blocked' }).eq('id', u.id);
    await fetch(); setSaving(false);
  };

  const toggleRole = async (u: AdminUser) => {
    setSaving(true);
    await supabase.from('users').update({ role: u.role === 'admin' ? 'user' : 'admin' }).eq('id', u.id);
    await fetch(); setSaving(false);
  };

  return (
    <div className="page-shell">
      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— Access Control</div>
          <h1 className="page-title">Users</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">Manage visitor accounts and access permissions.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add User</button>
      </div>

      {error && !showModal && (
        <div className="alert-box" style={{ marginBottom: 20 }}><span className="alert-ico">!</span><span>{error}</span></div>
      )}

      <div className="panel">
        <div className="table-wrap">
          {loading ? (
            <div className="empty-state">Loading users…</div>
          ) : (
            <table className="table">
              <thead><tr><th>Email</th><th>Name</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.email}</td>
                    <td>{u.full_name || <span className="td-muted">—</span>}</td>
                    <td>
                      <span className={`tag ${u.role === 'admin' ? 'tag-gold' : ''}`}>{u.role || 'user'}</span>
                    </td>
                    <td>
                      <span className={`tag ${u.status === 'blocked' ? 'tag-danger' : 'tag-success'}`}>
                        {u.status || 'active'}
                      </span>
                    </td>
                    <td className="td-muted">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <div className="action-row">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(u)} disabled={saving}>
                          {u.status === 'blocked' ? 'Unblock' : 'Block'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => toggleRole(u)} disabled={saving}>
                          {u.role === 'admin' ? 'Demote' : 'Promote'}
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => setDeleteItem(u)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan={6} className="empty-cell">No users found.</td></tr>}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-panel">
            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">— Users</div>
                <h3>{editItem ? 'Edit User' : 'Add New User'}</h3>
                <div className="modal-goldline" />
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
                {!editItem && (
                  <div className="field"><label>Email</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      placeholder="user@example.com" />
                  </div>
                )}
                <div className="field"><label>Full Name</label>
                  <input value={form.full_name}
                    onChange={e => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Visitor name" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div className="field"><label>Role</label>
                    <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                      {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="field"><label>Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                {error && <div className="alert-box"><span className="alert-ico">!</span><span>{error}</span></div>}
                <div className="modal-actions">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving…' : editItem ? 'Save Changes' : 'Create User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteItem && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setDeleteItem(null)}>
          <div className="modal-panel modal-sm">
            <div className="modal-header">
              <div><div className="modal-eyebrow">— Confirm</div><h3>Remove User</h3><div className="modal-goldline" /></div>
              <button className="modal-close" onClick={() => setDeleteItem(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--ink-mid)' }}>
                Remove <strong style={{ color: 'var(--ink)' }}>{deleteItem.email}</strong> from the database? This cannot be undone.
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setDeleteItem(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Removing…' : 'Remove User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}