import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Trash2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { RatingReview } from '../types';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import SearchBar from '../components/SearchBar';
import { Skeleton } from '../components/LoadingSkeleton';
import { ConfirmModal } from '../components/Modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function RatingsPage() {
  const [reviews, setReviews] = useState<RatingReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteItem, setDeleteItem] = useState<RatingReview | null>(null);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data, error: e } = await supabase
      .from('user_ratings')
      .select('*, users(email, first_name, last_name), artifacts(name)')
      .order('created_at', { ascending: false });
    if (e) setError(e.message);
    setReviews((data || []) as RatingReview[]);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setSaving(true);
    await supabase.from('user_ratings').delete().eq('id', deleteItem.id);
    setDeleteItem(null);
    await load();
    setSaving(false);
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return reviews;
    return reviews.filter((r) => {
      const author =
  `${(r as any).users?.first_name ?? ''} ${(r as any).users?.last_name ?? ''}`.trim()
  || (r as any).users?.email
  || 'Anonymous';
      const artifact = (r as any).artifacts?.name || '';
      return (
        author.toLowerCase().includes(q) ||
        artifact.toLowerCase().includes(q) ||
        (r.feedback ?? '').toLowerCase().includes(q)
      );
    });
  }, [reviews, query]);

  const stars = (n: number) =>
    Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${i < n ? 'fill-foreground text-foreground' : 'text-muted-foreground/40'}`}
      />
    ));

  const avg = reviews.length
    ? (reviews.reduce((s, r) => s + (r.rating ?? 0), 0) / reviews.length).toFixed(1)
    : '—';

  return (
    <div>
      <PageHeader
        eyebrow="Feedback"
        title="Ratings & Reviews"
        description="Browse visitor feedback and star ratings."
        actions={
          <Badge variant="outline" className="rounded-full border-border bg-muted/40 px-3 py-1 text-xs">
            <Star className="mr-1.5 h-3 w-3 fill-foreground text-foreground" /> Avg {avg}
          </Badge>
        }
      />

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
          {error}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between gap-3">
        <SearchBar value={query} onChange={setQuery} placeholder="Search reviews…" className="w-full sm:w-72" />
        <span className="text-xs text-muted-foreground">{filtered.length} reviews</span>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card">
          <EmptyState
            icon={<Star className="h-5 w-5" />}
            title={query ? 'No matching reviews' : 'No reviews yet'}
            description={query ? 'Try a different search term.' : 'Visitor ratings will appear here.'}
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((r) => {
            const author = (r as any).users?.full_name || (r as any).users?.email || 'Anonymous';
            const artifact = (r as any).artifacts?.name || 'Unknown artifact';
            return (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
              >
                <Card className="rounded-2xl border-border bg-card p-5 transition hover:border-foreground/30">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted text-sm font-semibold uppercase text-foreground">
                        {author[0]}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{author}</div>
                        <div className="truncate text-[11px] text-muted-foreground">re: {artifact}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-0.5">{stars(r.rating ?? 0)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                    {r.feedback || <span className="italic">No comment provided.</span>}
                  </p>
                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteItem(r)}
                      className="h-7 rounded-lg text-[11px] text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Remove
                    </Button>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
        title="Remove review"
        description="Remove this review permanently?"
        confirmLabel="Remove"
        destructive
        loading={saving}
        onConfirm={handleDelete}
      />
    </div>
  );
}
