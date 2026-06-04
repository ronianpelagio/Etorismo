import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalIcon, ChevronLeft, ChevronRight, Plus, Pencil, Trash2, ImageIcon } from 'lucide-react';
import { supabase } from '../services/supabase';
import { EventItem } from '../types';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import { Skeleton } from '../components/LoadingSkeleton';
import Modal, { ConfirmModal } from '../components/Modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

const emptyForm = { title: '', event_datetime: '', description: '', image_url: '' };
type EForm = typeof emptyForm;

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
  const itemsPerPage = 6;
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    load();
  }, [currentPage]);

  const load = async () => {
    setLoading(true);
    const { count } = await supabase.from('events').select('*', { count: 'exact', head: true });
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

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm);
    setError(null);
    setShowModal(true);
  };
  const openEdit = (item: EventItem) => {
    setEditItem(item);
    setForm({
      title: item.title,
      event_datetime: item.event_datetime ? new Date(item.event_datetime).toISOString().slice(0, 16) : '',
      description: item.description ?? '',
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    await supabase.from('events').delete().eq('id', deleteItem.id);
    setDeleteItem(null);
    await load();
    setSaving(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Programming"
        title="Events"
        description="Manage upcoming and past museum events."
        actions={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add event
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: itemsPerPage }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card">
          <EmptyState
            icon={<CalIcon className="h-5 w-5" />}
            title="No events yet"
            description="Schedule your first museum event."
            action={
              <Button onClick={openCreate} variant="outline" className="rounded-xl">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add event
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((item) => (
              <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}>
                <Card className="group relative h-full overflow-hidden rounded-2xl border-border bg-card transition hover:border-foreground/30">
                  {item.image_url ? (
                    <div className="relative h-28 w-full overflow-hidden border-b border-border bg-muted">
                      <img src={item.image_url} alt={item.title} className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card/60" />
                    </div>
                  ) : (
                    <div className="flex h-28 w-full items-center justify-center border-b border-border bg-muted/30">
                      <ImageIcon className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
                      <Badge variant="outline" className="rounded-full border-border bg-muted/40 text-[10px] text-muted-foreground">
                        {new Date(item.event_datetime) > new Date() ? 'Upcoming' : 'Past'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <CalIcon className="h-3 w-3" />
                      {new Date(item.event_datetime).toLocaleString()}
                    </div>
                    {item.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
                    )}
                    <div className="mt-3 flex justify-end gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(item)} className="h-7 rounded-lg text-[11px]">
                        <Pencil className="mr-1 h-3 w-3" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteItem(item)} className="h-7 rounded-lg text-[11px] text-destructive hover:text-destructive">
                        <Trash2 className="mr-1 h-3 w-3" /> Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-8 rounded-lg"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 rounded-lg"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </>
      )}

      <Modal
        open={showModal}
        onOpenChange={setShowModal}
        title={editItem ? 'Edit event' : 'New event'}
        description="Schedule a museum event with optional cover image."
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowModal(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSubmit as any} disabled={saving} className="rounded-xl">
              {saving ? 'Saving…' : editItem ? 'Save changes' : 'Create event'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Event name</Label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-10 rounded-xl bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Date & Time</Label>
            <Input
              type="datetime-local"
              value={form.event_datetime}
              onChange={(e) => setForm({ ...form, event_datetime: e.target.value })}
              className="h-10 rounded-xl bg-muted/40"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl bg-muted/40" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Image URL</Label>
            <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" className="h-10 rounded-xl bg-muted/40" />
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
        title="Delete event"
        description={`Delete “${deleteItem?.title}”? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={saving}
        onConfirm={handleDelete}
      />
    </div>
  );
}
