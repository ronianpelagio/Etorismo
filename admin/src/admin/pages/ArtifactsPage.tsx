import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Boxes, ImageIcon, Pencil, Plus, Trash2, Volume2,
  Globe, Mic, UploadCloud, ChevronLeft, ChevronRight,
  Check, X, Calendar,
} from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '../services/supabase';
import { Artifact } from '../types';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { translateAllLanguages, saveAllTranslations, LangCode, LANG_CONFIG } from '../utils/ArtifactUtil';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Sacred Vessels', 'Liturgical Books', 'Vestments', 'Altar Furnishings',
  'Devotional Objects', 'Sacramentals', 'Musical Instruments',
  'Architectural and Decorative Elements',
];

const LANGUAGES = [
  { code: 'en'  as LangCode, label: 'English',  flag: '🇺🇸' },
  { code: 'fil' as LangCode, label: 'Filipino', flag: '🇵🇭' },
  { code: 'ja'  as LangCode, label: 'Japanese', flag: '🇯🇵' },
  { code: 'es'  as LangCode, label: 'Spanish',  flag: '🇪🇸' },
  { code: 'ko'  as LangCode, label: 'Korean',   flag: '🇰🇷' },
];

const PAGE_SIZE = 8;

// ─── Types ────────────────────────────────────────────────────────────────────

type Translation = { name: string; description: string; audio_url: string | null };
type TranslationMap = Partial<Record<LangCode, Translation>>;

type AForm = {
  name: string;
  category: string;
  image_url: string;
  image_file: File | null;
  created_at: string;
  translations: Record<LangCode, { name: string; description: string }>;
};

const emptyTranslations = (): Record<LangCode, { name: string; description: string }> =>
  Object.fromEntries(LANGUAGES.map(l => [l.code, { name: '', description: '' }])) as any;

const emptyForm = (): AForm => ({
  name: '', category: CATEGORIES[0], image_url: '', image_file: null, created_at: '',
  translations: emptyTranslations(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  return new Blob([byteArray], { type: mime });
}

async function uploadImage(artifactId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg';
  const path = `artifacts/${artifactId}.${ext}`;
  const { error } = await supabase.storage.from('artifact-images').upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from('artifact-images').getPublicUrl(path).data.publicUrl;
}

async function generateAudioViaAPI(
  artifactId: string, text: string, langCode: LangCode, voiceName?: string, speakingRate?: number,
): Promise<{ success: boolean; audioUrl: string }> {
  const res = await fetch('https://eturismoadmin.up.railway.app/generate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ artifactId, text, lang: langCode, voiceName, speakingRate: speakingRate || 1.0 }),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Failed'); }
  return res.json();
}

async function upsertTranslation(
  artifactId: string, langCode: LangCode,
  fields: { name?: string; description?: string; audio_url?: string },
) {
  const { data: existing } = await supabase
    .from('artifact_translations')
    .select('name, description, audio_url')
    .eq('artifact_id', artifactId).eq('language_code', langCode).maybeSingle();

  await supabase.from('artifact_translations').upsert({
    artifact_id: artifactId,
    language_code: langCode,
    name: fields.name ?? existing?.name ?? '',
    description: fields.description ?? existing?.description ?? null,
    audio_url: fields.audio_url !== undefined ? fields.audio_url : (existing?.audio_url ?? null),
  }, { onConflict: 'artifact_id,language_code' });
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ArtifactsPage() {
  const [items, setItems]         = useState<Artifact[]>([]);
  const [translationsMap, setTranslationsMap] = useState<Record<string, TranslationMap>>({});
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [query, setQuery]         = useState('');
  const [category, setCategory]   = useState('all');
  const [listError, setListError] = useState<string | null>(null);

  const [showModal, setShowModal]   = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState<AForm>(emptyForm);
  const [imagePreview, setImagePreview] = useState('');
  const [modalStep, setModalStep]   = useState(1);
  const [activeLang, setActiveLang] = useState<LangCode>('en');
  const [saving, setSaving]         = useState(false);
  const [saveStep, setSaveStep]     = useState('');
  const [formError, setFormError]   = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteItem, setDeleteItem] = useState<Artifact | null>(null);
  const [deleting, setDeleting]     = useState(false);

  const [translating, setTranslating]     = useState(false);
  const [translateStep, setTranslateStep] = useState('');

  const [audioSaving, setAudioSaving]           = useState(false);
  const [audioStep, setAudioStep]               = useState('');
  const [generatingAllAudio, setGeneratingAllAudio] = useState(false);
  const [audioStatus, setAudioStatus]           = useState<Record<string, string>>({});

  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice]     = useState('');
  const [speakingRate, setSpeakingRate]       = useState(1.0);
  const [showVoiceControls, setShowVoiceControls] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => { fetchData(page); }, [page]);

  useEffect(() => {
    fetch(`https://eturismoadmin.up.railway.app/available-voices/${activeLang}`)
      .then(r => r.json())
      .then(d => { setAvailableVoices(d.voices || []); setSelectedVoice(d.defaultVoice || ''); })
      .catch(() => {});
  }, [activeLang]);

  const fetchData = async (p: number) => {
    setLoading(true); setListError(null);
    try {
      const offset = (p - 1) * PAGE_SIZE;
      const { data, count, error } = await supabase
        .from('artifacts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      const artifacts = (data || []) as Artifact[];
      setItems(artifacts);
      setTotal(count || 0);

      // Fetch translations for all loaded artifacts
      if (artifacts.length > 0) {
        const ids = artifacts.map(a => a.id);
        const { data: trans } = await supabase
          .from('artifact_translations')
          .select('artifact_id, language_code, name, description, audio_url')
          .in('artifact_id', ids);

        const map: Record<string, TranslationMap> = {};
        for (const t of (trans || [])) {
          if (!map[t.artifact_id]) map[t.artifact_id] = {};
          map[t.artifact_id][t.language_code as LangCode] = {
            name: t.name, description: t.description, audio_url: t.audio_url,
          };
        }
        setTranslationsMap(map);
      }
    } catch (e: any) {
      setListError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Filtering ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = items;
    if (category !== 'all') list = list.filter(i => i.category === category);
    const q = query.toLowerCase().trim();
    if (q) list = list.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.category ?? '').toLowerCase().includes(q) ||
      Object.values(translationsMap[i.id] || {}).some(t => t?.description?.toLowerCase().includes(q))
    );
    return list;
  }, [items, category, query, translationsMap]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ── Modal helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingId(null); setForm(emptyForm()); setImagePreview('');
    setActiveLang('en'); setModalStep(1); setFormError(null); setShowModal(true);
  };

  const openEdit = (a: Artifact) => {
    setEditingId(a.id); setActiveLang('en'); setModalStep(1);
    setImagePreview((a as any).image_url || ''); setFormError(null);
    const existingTrans = translationsMap[a.id] || {};
    const translations = emptyTranslations();
    for (const lang of LANGUAGES) {
      const t = existingTrans[lang.code];
      if (t) translations[lang.code] = { name: t.name || '', description: t.description || '' };
    }
    // English name comes from artifacts.name
    translations.en.name = a.name;
    setForm({
      name: a.name,
      category: a.category || CATEGORIES[0],
      image_url: (a as any).image_url || '',
      image_file: null,
      created_at: a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : '',
      translations,
    });
    setShowModal(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, image_file: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const setTranslationField = (lang: LangCode, field: 'name' | 'description', value: string) => {
    setForm(f => ({
      ...f,
      translations: { ...f.translations, [lang]: { ...f.translations[lang], [field]: value } },
    }));
  };

  // ── Translate ─────────────────────────────────────────────────────────────

  const handleTranslate = async () => {
    if (!form.name.trim())                          { alert('Enter an English name first.');        return; }
    if (!form.translations.en.description.trim())  { alert('Enter an English description first.'); return; }
    setTranslating(true); setTranslateStep('Starting translation…');
    try {
      const result = await translateAllLanguages(
        form.name, form.translations.en.description, setTranslateStep, 'user@example.com',
      );
      setForm(f => {
        const updated = { ...f.translations };
        for (const lang of LANGUAGES) {
          updated[lang.code] = {
            name: result[lang.code]?.name || f.translations[lang.code].name,
            description: result[lang.code]?.description || f.translations[lang.code].description,
          };
        }
        return { ...f, translations: updated };
      });
      alert('Translations completed!');
    } catch (e: any) {
      alert(`Translation error: ${e.message}`);
    } finally {
      setTranslating(false); setTranslateStep('');
    }
  };

  // ── Audio helpers ─────────────────────────────────────────────────────────

  const setAudioStatusFor = (lang: string, status: string, clearAfter = 3000) => {
    setAudioStatus(prev => ({ ...prev, [lang]: status }));
    if (clearAfter > 0) setTimeout(() => setAudioStatus(prev => { const n = { ...prev }; delete n[lang]; return n; }), clearAfter);
  };

  const handleSaveAudio = async (langCode: LangCode) => {
    if (!editingId) { alert('Save the artifact first.'); return; }
    const text = form.translations[langCode]?.description;
    if (!text?.trim()) { alert(`No ${LANGUAGES.find(l => l.code === langCode)?.label} description yet.`); return; }
    setAudioSaving(true); setAudioStep(`Generating ${langCode.toUpperCase()} audio…`);
    setAudioStatusFor(langCode, 'generating', 0);
    try {
      const result = await generateAudioViaAPI(editingId, text, langCode, selectedVoice, speakingRate);
      if (result.success) { setAudioStatusFor(langCode, 'success'); await fetchData(page); }
    } catch (e: any) {
      setAudioStatusFor(langCode, 'error'); alert(`Audio error: ${e.message}`);
    } finally {
      setAudioSaving(false); setAudioStep('');
    }
  };

  const handleGenerateAllAudio = async () => {
    if (!editingId) { alert('Save the artifact first.'); return; }
    setGeneratingAllAudio(true);
    let ok = 0, fail = 0;
    for (const lang of LANGUAGES) {
      const text = form.translations[lang.code]?.description;
      if (!text?.trim()) continue;
      setAudioStep(`Generating ${lang.code.toUpperCase()} audio…`);
      setAudioStatusFor(lang.code, 'generating', 0);
      try {
        await generateAudioViaAPI(editingId, text, lang.code, selectedVoice, speakingRate);
        setAudioStatusFor(lang.code, 'success'); ok++;
      } catch { setAudioStatusFor(lang.code, 'error'); fail++; }
    }
    setGeneratingAllAudio(false); setAudioStep('');
    if (ok > 0) { alert(`${ok} audio file(s) generated!${fail ? ` (${fail} failed)` : ''}`); await fetchData(page); }
    else alert(`Failed to generate ${fail} audio file(s).`);
  };

  // ── Save artifact ─────────────────────────────────────────────────────────

  const handleSaveArtifact = async () => {
    if (!form.name.trim()) { setFormError('Name is required.'); return; }
    setSaving(true); setSaveStep('Saving artifact…'); setFormError(null);
    try {
      const payload = {
        name: form.name,
        category: form.category,
        description: form.translations.en.description || null,
        image_url: form.image_url || null,
        created_at: form.created_at ? new Date(form.created_at).toISOString() : new Date().toISOString(),
      };

      let artifact: any;
      if (editingId) {
        const { data, error } = await supabase.from('artifacts').update(payload).eq('id', editingId).select().single();
        if (error) throw error;
        artifact = data;
      } else {
        const { data, error } = await supabase.from('artifacts').insert(payload).select().single();
        if (error) throw error;
        artifact = data;
      }

      if (form.image_file) {
        setSaveStep('Uploading image…');
        const imageUrl = await uploadImage(artifact.id, form.image_file);
        await supabase.from('artifacts').update({ image_url: imageUrl }).eq('id', artifact.id);
      }

      setSaveStep('Saving translations…');
      for (const lang of LANGUAGES) {
        const t = form.translations[lang.code];
        if (t.name.trim() || t.description.trim()) {
          await upsertTranslation(artifact.id, lang.code, { name: t.name, description: t.description });
        }
      }

      setSaveStep('Generating QR code…');
      const qrValue = artifact.qr_value || `${window.location.origin}/artifact/${artifact.id}`;
      const qrDataUrl = await QRCode.toDataURL(qrValue);
      const qrBlob = dataUrlToBlob(qrDataUrl);
      const { error: qrErr } = await supabase.storage.from('qrcode').upload(`${artifact.id}.png`, qrBlob, { contentType: 'image/png', upsert: true });
      if (!qrErr) {
        const { data: qrUrlData } = supabase.storage.from('qrcode').getPublicUrl(`${artifact.id}.png`);
        await supabase.from('artifacts').update({ qr_code: qrUrlData.publicUrl }).eq('id', artifact.id);
      }

      setSaveStep('Generating audio…');
      try {
        for (const lang of LANGUAGES) {
          const text = form.translations[lang.code]?.description;
          if (text?.trim()) await generateAudioViaAPI(artifact.id, text, lang.code, selectedVoice, speakingRate);
        }
      } catch (audioErr: any) { console.warn('[Audio warning]', audioErr.message); }

      setShowModal(false);
      await fetchData(page);
      alert('✅ Artifact saved!');
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSaving(false); setSaveStep('');
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    const { error } = await supabase.from('artifacts').delete().eq('id', deleteItem.id);
    if (error) alert(`Delete failed: ${error.message}`);
    setDeleteItem(null);
    const newTotalPages = Math.max(1, Math.ceil((total - 1) / PAGE_SIZE));
    const safePage = Math.min(page, newTotalPages);
    if (safePage !== page) setPage(safePage); else await fetchData(page);
    setDeleting(false);
  };

  // ── Audio playback (table row) ────────────────────────────────────────────

  const playAudio = (artifactId: string, langCode: LangCode) => {
    const t = translationsMap[artifactId]?.[langCode];
    if (t?.audio_url) {
      new Audio(t.audio_url).play().catch(() => {});
    } else if (t?.description && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(t.description);
      utter.lang = LANG_CONFIG.find(l => l.code === langCode)?.mmCode || 'en-US';
      window.speechSynthesis.speak(utter);
    }
  };

  const audioStatusIcon = (lang: string) => {
    const s = audioStatus[lang];
    if (s === 'generating') return <Spinner className="ml-1" />;
    if (s === 'success')    return <Check className="ml-1 h-3 w-3 text-emerald-500" />;
    if (s === 'error')      return <X className="ml-1 h-3 w-3 text-red-500" />;
    return null;
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div>
      <PageHeader
        eyebrow="Sacred Collection"
        title="Artifacts"
        description="Manage sacred vessels, vestments, books, and devotional objects."
        actions={
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Artifact
          </Button>
        }
      />

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search artifacts…"
            className="h-9 w-full rounded-xl border-border bg-muted/40 text-sm sm:w-56"
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-full rounded-xl border-border bg-muted/40 text-xs sm:w-56">
              <SelectValue placeholder="Filter category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground">{filtered.length} items</span>
      </div>

      {listError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
          {listError}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-2xl border-border bg-card">
          <EmptyState
            icon={<Boxes className="h-5 w-5" />}
            title={query || category !== 'all' ? 'No matching artifacts' : 'No artifacts yet'}
            description={query || category !== 'all' ? 'Try adjusting your filters.' : 'Add your first artifact.'}
            action={!query && category === 'all' && (
              <Button onClick={openCreate} variant="outline" className="rounded-xl">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add artifact
              </Button>
            )}
          />
        </Card>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-card">
          {filtered.map(a => {
            const art = a as any;
            const artTrans = translationsMap[a.id] || {};
            const langsWithContent = LANGUAGES.filter(l => artTrans[l.code]?.description || artTrans[l.code]?.name);
            const langsWithAudio = LANGUAGES.filter(l => artTrans[l.code]?.audio_url);
            const enDesc = artTrans.en?.description || art.description || '';

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ backgroundColor: 'rgba(0,0,0,0.02)' }}
                className="group flex flex-col gap-3 p-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
                    {art.image_url ? (
                      <img src={art.image_url} alt={a.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
                      </div>
                    )}
                    {art.qr_code && (
                      <img src={art.qr_code} alt="QR"
                        className="absolute bottom-0.5 right-0.5 h-5 w-5 rounded-sm border border-border bg-white p-0.5 opacity-0 transition group-hover:opacity-100"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">{a.name}</h3>
                      <Badge variant="outline" className="rounded-full border-border bg-muted/40 text-[10px] text-muted-foreground">
                        {a.category}
                      </Badge>
                    </div>
                    {enDesc && (
                      <p className="mt-1 line-clamp-1 text-xs leading-relaxed text-muted-foreground">{enDesc}</p>
                    )}
                    {langsWithContent.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {langsWithContent.map(l => (
                          <button
                            key={l.code} onClick={() => playAudio(a.id, l.code)}
                            title={`${l.label}${langsWithAudio.find(x => x.code === l.code) ? ' — audio available' : ''}`}
                            className="inline-flex items-center gap-0.5 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
                          >
                            {l.flag} {l.code.toUpperCase()}
                            {langsWithAudio.find(x => x.code === l.code) && <Volume2 className="h-2.5 w-2.5 text-emerald-500" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(a)} className="h-8 rounded-lg text-xs">
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteItem(a)}
                    className="h-8 rounded-lg text-xs text-destructive hover:text-destructive">
                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-xl">
            <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
          </Button>
          <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="rounded-xl">
            Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      <Modal
        open={showModal}
        onOpenChange={o => { if (!saving) setShowModal(o); }}
        title={editingId ? 'Edit Artifact' : 'New Artifact'}
        description={modalStep === 1 ? 'Basic information and image.' : 'Multilingual descriptions and audio.'}
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between">
            {modalStep === 2 ? (
              <Button variant="ghost" onClick={() => setModalStep(1)} disabled={saving} className="rounded-xl">
                <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => !saving && setShowModal(false)} className="rounded-xl">Cancel</Button>
            )}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 mr-3">
                <span className={`h-2 w-2 rounded-full ${modalStep === 1 ? 'bg-foreground' : 'bg-muted-foreground/30'}`} />
                <span className={`h-2 w-2 rounded-full ${modalStep === 2 ? 'bg-foreground' : 'bg-muted-foreground/30'}`} />
              </div>
              {modalStep === 1 ? (
                <Button onClick={() => setModalStep(2)} disabled={!form.name.trim()} className="rounded-xl">
                  Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              ) : (
                <Button onClick={handleSaveArtifact} disabled={saving} className="rounded-xl">
                  {saving ? <><Spinner className="mr-2" />{saveStep}</> : editingId ? 'Update Artifact' : 'Create Artifact'}
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {modalStep === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name (English) *</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Chalice of St. John" className="h-10 rounded-xl bg-muted/40" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Category</Label>
                    <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                      <SelectTrigger className="h-10 rounded-xl bg-muted/40"><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Upload Image</Label>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange}
                      className="block w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-xs" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Image URL (optional)</Label>
                    <Input type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))}
                      className="h-10 rounded-xl bg-muted/40" placeholder="https://…" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Date Created (optional)</Label>
                  <Input type="date" value={form.created_at} onChange={e => setForm(f => ({ ...f, created_at: e.target.value }))}
                    className="h-10 rounded-xl bg-muted/40" />
                </div>
                {(imagePreview || form.image_url) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Image Preview</Label>
                    <img src={imagePreview || form.image_url} alt="preview" className="max-h-40 rounded-xl border border-border object-cover" />
                  </div>
                )}
              </motion.div>
            )}

            {modalStep === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm"
                    onClick={handleTranslate}
                    disabled={translating || !form.translations.en.description.trim()}
                    className="rounded-xl text-xs">
                    {translating
                      ? <><Spinner className="mr-1.5" />{translateStep || 'Translating…'}</>
                      : <><Globe className="mr-1.5 h-3.5 w-3.5" />Auto-translate</>}
                  </Button>
                  <Button type="button" variant={showVoiceControls ? 'default' : 'outline'} size="sm"
                    onClick={() => setShowVoiceControls(v => !v)} className="rounded-xl text-xs">
                    <Mic className="mr-1.5 h-3.5 w-3.5" />
                    {showVoiceControls ? 'Hide Voice Settings' : 'Voice Settings'}
                  </Button>
                  {editingId && (
                    <Button type="button" variant="outline" size="sm"
                      onClick={handleGenerateAllAudio} disabled={generatingAllAudio || audioSaving}
                      className="rounded-xl text-xs">
                      {(generatingAllAudio || audioSaving)
                        ? <><Spinner className="mr-1.5" />{audioStep || 'Generating…'}</>
                        : <><Volume2 className="mr-1.5 h-3.5 w-3.5" />Generate All Audio</>}
                    </Button>
                  )}
                </div>

                {/* Voice controls */}
                <AnimatePresence>
                  {showVoiceControls && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden rounded-xl border border-border bg-muted/40 p-4">
                      <p className="mb-3 text-xs font-semibold">Voice Settings — {LANGUAGES.find(l => l.code === activeLang)?.label}</p>
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Voice</Label>
                          <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                            <SelectTrigger className="h-9 rounded-xl bg-background text-xs"><SelectValue placeholder="Select voice…" /></SelectTrigger>
                            <SelectContent>
                              {availableVoices.map(v => (
                                <SelectItem key={v.name} value={v.name} className="text-xs">
                                  {v.description} ({v.gender}) — {v.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Speaking Speed: {speakingRate.toFixed(1)}×</Label>
                          <input type="range" min="0.5" max="2.0" step="0.1" value={speakingRate}
                            onChange={e => setSpeakingRate(parseFloat(e.target.value))}
                            className="w-full accent-foreground" />
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>Slower (0.5×)</span><span>Normal (1.0×)</span><span>Faster (2.0×)</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Language tabs */}
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map(l => (
                    <button key={l.code} type="button"
                      onClick={() => setActiveLang(l.code)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition
                        ${activeLang === l.code
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border bg-transparent text-foreground hover:border-foreground/40'}`}>
                      {l.flag} {l.label}
                      {audioStatusIcon(l.code)}
                    </button>
                  ))}
                </div>

                {/* Translated name (non-English) */}
                {activeLang !== 'en' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Translated Name ({LANGUAGES.find(l => l.code === activeLang)?.label})</Label>
                    <Input
                      value={form.translations[activeLang]?.name || ''}
                      onChange={e => setTranslationField(activeLang, 'name', e.target.value)}
                      placeholder={`Translated name in ${LANGUAGES.find(l => l.code === activeLang)?.label}…`}
                      className="h-10 rounded-xl bg-muted/40 text-sm"
                    />
                  </div>
                )}

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Description ({LANGUAGES.find(l => l.code === activeLang)?.label})</Label>
                  <Textarea
                    rows={7}
                    value={form.translations[activeLang]?.description || ''}
                    onChange={e => setTranslationField(activeLang, 'description', e.target.value)}
                    placeholder={`Enter description in ${LANGUAGES.find(l => l.code === activeLang)?.label}…`}
                    className="rounded-xl bg-muted/40"
                  />
                </div>

                {/* Per-language audio button */}
                {editingId && (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => handleSaveAudio(activeLang)}
                      disabled={audioSaving || !form.translations[activeLang]?.description?.trim()}
                      className="rounded-xl text-xs">
                      {audioSaving && audioStep.includes(activeLang.toUpperCase())
                        ? <><Spinner className="mr-1.5" />{audioStep}</>
                        : <><UploadCloud className="mr-1.5 h-3.5 w-3.5" />Generate & Save Audio ({LANGUAGES.find(l => l.code === activeLang)?.label})</>}
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {formError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive-foreground">
              {formError}
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={!!deleteItem}
        onOpenChange={o => !o && setDeleteItem(null)}
        title="Delete Artifact"
        description={`Delete "${deleteItem?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
