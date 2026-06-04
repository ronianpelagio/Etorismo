import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalIcon, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { Announcement } from '../types';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import SearchBar from '../components/SearchBar';
import { Skeleton } from '../components/LoadingSkeleton';
import Modal, { ConfirmModal } from '../components/Modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const emptyForm = { title: '', description: '', announcement_datetime: '', image_url: '' };
type AForm = typeof emptyForm;

export default function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Announcement | null>(null);
  const [deleteItem, setDeleteItem] = useState<Announcement | null>(null);
  const [form, setForm] = useState<AForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from('announcements')
      .select('*')
      .order('announcement_datetime', { ascending: false });
    setItems((data || []) as Announcement[]);
    if (e) setError(e.message);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (i) => i.title.toLowerCase().includes(q) || (i.description ?? '').toLowerCase().includes(q)
    );
  }, [items, query]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setError(null);
    setShowModal(true);
  };
  const openEdit = (item: Announcement) => {
    setEditItem(item);
    setForm({
      title: item.title,
      description: item.description ?? '',
      announcement_datetime: item.announcement_datetime
        ? new Date(item.announcement_datetime).toISOString().slice(0, 16)
        : '',
      image_url: item.image_url ?? '',
    });
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!form.title || !form.announcement_datetime)
        throw new Error('Title and date are required.');
      const payload = {
        title: form.title,
        description: form.description || null,
        announcement_datetime: new Date(form.announcement_datetime).toISOString(),
        image_url: form.image_url || null,
      };
      if (editItem) {
        const { error: e } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', editItem.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from('announcements').insert(payload);
        if (e) throw e;
      }
      setShowModal(false);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    await supabase.from('announcements').delete().eq('id', deleteItem.id);
    setDeleteItem(null);
    await load();
    setSaving(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Content"
        title="Announcements"
        description="Publish notices and updates for museum visitors."
        actions={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New announcement
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search announcements…" className="w-full sm:w-72" />
        <span className="text-xs text-muted-foreground">{filtered.length} items</span>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card">
          <EmptyState
            icon={<Megaphone className="h-5 w-5" />}
            title={query ? 'No matches found' : 'No announcements yet'}
            description={query ? 'Try a different search term.' : 'Create your first announcement to keep visitors informed.'}
            action={!query && (
              <Button onClick={openCreate} variant="outline" className="rounded-xl">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> New announcement
              </Button>
            )}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -2 }}
            >
              <Card className="group relative overflow-hidden rounded-2xl border-border bg-card p-5 transition hover:border-foreground/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
                      <Badge
                        variant="outline"
                        className={`rounded-full border-border text-[10px] uppercase tracking-wider ${
                          item.image_url ? 'bg-foreground text-background' : 'bg-muted/40 text-muted-foreground'
                        }`}
                      >
                        {item.image_url ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <CalIcon className="h-3 w-3" />
                      {new Date(item.announcement_datetime).toLocaleString()}
                    </div>
                    {item.description && (
                      <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-8 rounded-lg text-xs">
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteItem(item)}
                    className="h-8 rounded-lg text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        title={editItem ? 'Edit announcement' : 'New announcement'}
        description="Visitors will see this in their mobile app feed."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSubmit as any} disabled={saving} className="rounded-xl">
              {saving ? 'Saving…' : editItem ? 'Save changes' : 'Publish'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Title</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 rounded-xl bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date & Time</Label>
            <Input
              type="datetime-local"
              value={form.announcement_datetime}
              onChange={(e) => setForm({ ...form, announcement_datetime: e.target.value })}
              className="h-10 rounded-xl bg-muted/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="rounded-xl bg-muted/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Image URL</Label>
            <Input
              value={form.image_url}
              onChange={(e) => setForm({ ...form, image_url: e.target.value })}
              placeholder="https://…"
              className="h-10 rounded-xl bg-muted/40"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
              {error}
            </div>
          )}
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        title="Delete announcement"
        description={`Delete “${deleteItem?.title}”? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={handleDelete}
      />
    </div>
  );
}
