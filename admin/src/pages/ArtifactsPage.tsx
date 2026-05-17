import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Artifact } from '../types';
import QRCode from 'qrcode';
import './pages.css';

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Sacred Vessels',
  'Liturgical Books',
  'Vestments',
  'Altar Furnishings',
  'Devotional Objects',
  'Sacramentals',
  'Musical Instruments',
  'Architectural and Decorative Elements',
];

const LANGUAGES = [
  { code: 'en',  label: 'English',  flag: '🇺🇸', dbDesc: 'description_en',  dbAudio: 'audio_en',  mmLang: 'en-US', bcp47: 'en-US'  },
  { code: 'fil', label: 'Filipino', flag: '🇵🇭', dbDesc: 'description_fil', dbAudio: 'audio_fil', mmLang: 'tl-PH', bcp47: 'fil-PH' },
  { code: 'ja',  label: 'Japanese', flag: '🇯🇵', dbDesc: 'description_ja',  dbAudio: 'audio_ja',  mmLang: 'ja-JP', bcp47: 'ja-JP'  },
  { code: 'es',  label: 'Spanish',  flag: '🇪🇸', dbDesc: 'description_es',  dbAudio: 'audio_es',  mmLang: 'es-ES', bcp47: 'es-ES'  },
  { code: 'ko',  label: 'Korean',   flag: '🇰🇷', dbDesc: 'description_ko',  dbAudio: 'audio_ko',  mmLang: 'ko-KR', bcp47: 'ko-KR'  },
] as const;

type LangCode = 'en' | 'fil' | 'ja' | 'es' | 'ko';

const emptyForm = {
  name:            '',
  category:        CATEGORIES[0],
  image_url:       '',
  created_at:      '',
  description_en:  '',
  description_fil: '',
  description_ja:  '',
  description_es:  '',
  description_ko:  '',
};

type AForm = typeof emptyForm;
const PAGE_SIZE = 6;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'image/png';
  const byteChars = atob(base64);
  const byteArray = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArray[i] = byteChars.charCodeAt(i);
  return new Blob([byteArray], { type: mime });
}



function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
  const buffer    = new ArrayBuffer(44 + samples.length * 2);
  const view      = new DataView(buffer);
  const writeStr  = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };
  const write16   = (offset: number, v: number) => view.setInt16(offset, v, true);
  const write32   = (offset: number, v: number) => view.setUint32(offset, v, true);

  writeStr(0,  'RIFF');
  write32( 4,  36 + samples.length * 2);
  writeStr(8,  'WAVE');
  writeStr(12, 'fmt ');
  write32( 16, 16);            // subchunk size
  write16( 20, 1);             // PCM
  write16( 22, 1);             // mono
  write32( 24, sampleRate);
  write32( 28, sampleRate * 2); // byte rate
  write16( 32, 2);             // block align
  write16( 34, 16);            // bits per sample
  writeStr(36, 'data');
  write32( 40, samples.length * 2);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}


function waitForVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise(resolve => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) return resolve(voices);
    window.speechSynthesis.onvoiceschanged = () => {
      resolve(window.speechSynthesis.getVoices());
    };
  });
}

async function generateTTSWav(text: string, bcp47: string): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    if (!window.speechSynthesis) {
      return reject(new Error('SpeechSynthesis not available'));
    }

    // Cancel any pending speech
    window.speechSynthesis.cancel();

    const voices    = await waitForVoices();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang  = bcp47;
    utterance.rate  = 0.9;

    // Try to match exact lang, then language prefix
    const exact   = voices.find(v => v.lang === bcp47);
    const partial = voices.find(v => v.lang.startsWith(bcp47.split('-')[0]));
    if (exact)        utterance.voice = exact;
    else if (partial) utterance.voice = partial;

    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;

    try {
      // Create a silent AudioContext for timing
      const audioCtx   = new AudioCtx({ sampleRate: 22050 });
      const dest        = audioCtx.createMediaStreamDestination();
      const chunks: BlobPart[] = [];

      // Use MediaRecorder on the AudioContext stream
      const recorder   = new MediaRecorder(dest.stream, { mimeType: 'audio/webm;codecs=opus' });
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        audioCtx.close();
        const blob = new Blob(chunks, { type: 'audio/webm' });
        if (blob.size < 1000) {
          // Blob is effectively empty — SpeechSynthesis didn't route here
          reject(new Error('TTS audio not captured — see console for details'));
          return;
        }
        resolve(blob);
      };

      utterance.onend   = () => setTimeout(() => recorder.stop(), 300);
      utterance.onerror = e  => { audioCtx.close(); reject(new Error(e.error)); };

      // Add a dummy oscillator at 0 gain to keep the stream active
      const osc  = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(dest);
      osc.start();

      recorder.start(100);
      window.speechSynthesis.speak(utterance);

      // Watchdog — if speech hasn't ended in 30s, stop
      setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 30000);

    } catch (err) {
      reject(err);
    }
  });
}

// ─── Translation — MyMemory (free, no API key, CORS-open from browser) ───────

async function translateText(text: string, targetLang: string): Promise<string> {
  const url =
    `https://api.mymemory.translated.net/get` +
    `?q=${encodeURIComponent(text)}` +
    `&langpair=en|${targetLang}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MyMemory HTTP ${res.status}`);

  const data = await res.json();
  if (data.responseStatus !== 200) {
    throw new Error(data.responseDetails || `MyMemory status ${data.responseStatus}`);
  }

  return data.responseData.translatedText as string;
}

async function translateAllLanguages(englishText: string): Promise<Record<LangCode, string>> {
  const targetLangs = LANGUAGES.filter(l => l.code !== 'en');

  const settled = await Promise.allSettled(
    targetLangs.map(async lang => ({
      code: lang.code as LangCode,
      text: await translateText(englishText, lang.mmLang),
    }))
  );

  const out: Record<string, string> = { en: englishText };
  settled.forEach(r => {
    if (r.status === 'fulfilled') out[r.value.code] = r.value.text;
    else console.warn('Translation failed:', r.reason);
  });

  return {
    en:  englishText,
    fil: out.fil || '',
    ja:  out.ja  || '',
    es:  out.es  || '',
    ko:  out.ko  || '',
  };
}

// ─── Audio upload ─────────────────────────────────────────────────────────────
// Bucket: artifact-audio  (create this bucket — see SQL below)
// Path:   {artifactId}/{lang}.webm
//
// CREATE THIS BUCKET IN SUPABASE:
// Run this SQL in your Supabase SQL editor:
//
//   SELECT storage.create_bucket('artifact-audio', '{"public": true}');
//
//   CREATE POLICY "Public read" ON storage.objects
//     FOR SELECT USING (bucket_id = 'artifact-audio');
//
//   CREATE POLICY "Auth upload" ON storage.objects
//     FOR INSERT WITH CHECK (bucket_id = 'artifact-audio');
//
//   CREATE POLICY "Auth update" ON storage.objects
//     FOR UPDATE USING (bucket_id = 'artifact-audio');
//
//   CREATE POLICY "Auth delete" ON storage.objects
//     FOR DELETE USING (bucket_id = 'artifact-audio');

async function uploadAudio(artifactId: string, lang: LangCode, blob: Blob): Promise<string> {
  const ext      = blob.type.includes('webm') ? 'webm' : 'wav';
  const filePath = `${artifactId}/${lang}.${ext}`;

  const { error } = await supabase.storage
    .from('artifact-audio')               // ← new dedicated bucket
    .upload(filePath, blob, {
      contentType: blob.type || 'audio/webm',
      upsert:      true,
    });

  if (error) throw new Error(`Audio upload (${lang}): ${error.message}`);

  const { data } = supabase.storage.from('artifact-audio').getPublicUrl(filePath);
  return data.publicUrl;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArtifactsPage() {
  const [artifacts, setArtifacts]     = useState<Artifact[]>([]);
  const [form, setForm]               = useState<AForm>(emptyForm);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translationProgress, setTranslationProgress] = useState('');
  const [page, setPage]               = useState(1);
  const [total, setTotal]             = useState(0);
  const [error, setError]             = useState<string | null>(null);
  const [activeLang, setActiveLang]   = useState<LangCode>('en');
  const [saveStep, setSaveStep]       = useState('');
  const [modalStep, setModalStep]     = useState(1);

  useEffect(() => { fetchData(page); }, [page]);

  const fetchData = async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (p - 1) * PAGE_SIZE;
      const { data, count, error } = await supabase
        .from('artifacts')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;
      setArtifacts(data || []);
      setTotal(count || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setActiveLang('en');
    setModalStep(1);
    setShowModal(true);
  };

  const openEdit = (a: Artifact) => {
    setEditingId(a.id);
    setActiveLang('en');
    setModalStep(1);
    setForm({
      name:            a.name,
      category:        a.category,
      image_url:       a.image_url || '',
      created_at:      a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : '',
      description_en:  (a as any).description_en  || '',
      description_fil: (a as any).description_fil || '',
      description_ja:  (a as any).description_ja  || '',
      description_es:  (a as any).description_es  || '',
      description_ko:  (a as any).description_ko  || '',
    });
    setShowModal(true);
  };

  const handleTranslate = async () => {
    if (!form.description_en.trim()) {
      alert('Please enter an English description first.');
      return;
    }
    setTranslating(true);
    setTranslationProgress('Connecting to MyMemory...');
    try {
      setTranslationProgress('Translating to all languages...');
      const translations = await translateAllLanguages(form.description_en);
      setForm(f => ({
        ...f,
        description_fil: translations.fil,
        description_ja:  translations.ja,
        description_es:  translations.es,
        description_ko:  translations.ko,
      }));
      setTranslationProgress('Translation complete!');
      setTimeout(() => setTranslationProgress(''), 2000);
    } catch (err: any) {
      alert(`Translation failed: ${err.message}`);
    } finally {
      setTranslating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveStep('Saving artifact…');

    try {
      // 1. Upsert artifact row
      const payload = {
        name:            form.name,
        category:        form.category,
        image_url:       form.image_url || null,
        description_en:  form.description_en  || null,
        description_fil: form.description_fil || null,
        description_ja:  form.description_ja  || null,
        description_es:  form.description_es  || null,
        description_ko:  form.description_ko  || null,
        created_at:      form.created_at
          ? new Date(form.created_at).toISOString()
          : new Date().toISOString(),
      };

      let result;
      if (editingId) {
        result = await supabase.from('artifacts').update(payload).eq('id', editingId).select().single();
      } else {
        result = await supabase.from('artifacts').insert(payload).select().single();
      }
      if (result.error) throw new Error(`DB error: ${result.error.message}`);
      const artifact = result.data;

      // 2. QR code
      setSaveStep('Generating QR code…');
      const qrValue   = artifact.qr_value || `${window.location.origin}/artifact/${artifact.id}`;
      // @ts-ignore
      const qrDataUrl = await QRCode.toDataURL(qrValue, { width: 300, margin: 2 });
      const qrBlob    = dataUrlToBlob(qrDataUrl);

      const { error: qrErr } = await supabase.storage
        .from('qrcode')
        .upload(`${artifact.id}.png`, qrBlob, { contentType: 'image/png', upsert: true });
      if (qrErr) throw new Error(`QR upload: ${qrErr.message}`);

      const { data: qrUrlData } = supabase.storage.from('qrcode').getPublicUrl(`${artifact.id}.png`);

  
      const audioUrls: Record<string, string> = {};

      for (const lang of LANGUAGES) {
        const desc = form[`description_${lang.code}` as keyof AForm] as string;
        if (!desc?.trim()) continue;

        setSaveStep(`Generating ${lang.label} audio…`);
        try {
          const audioBlob = await generateTTSWav(desc, lang.bcp47);
          console.log(`[TTS] ${lang.label}: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

          if (audioBlob.size < 500) {
            console.warn(`[TTS] ${lang.label} blob too small — skipping upload`);
            continue;
          }

          const url = await uploadAudio(artifact.id, lang.code as LangCode, audioBlob);
          audioUrls[lang.dbAudio] = url;
          console.log(`[TTS] ${lang.label} uploaded → ${url}`);
        } catch (ttsErr: any) {
          console.warn(`TTS skipped (${lang.label}):`, ttsErr.message);
        }
      }

      // 4. Final update — QR + audio URLs
      setSaveStep('Finishing up…');
      const { error: finalErr } = await supabase
        .from('artifacts')
        .update({ qr_value: qrValue, qr_code: qrUrlData.publicUrl, ...audioUrls })
        .eq('id', artifact.id);
      if (finalErr) throw new Error(`Final update: ${finalErr.message}`);

      setShowModal(false);
      fetchData(page);
    } catch (err: any) {
      console.error('[ArtifactsPage]', err);
      alert(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
      setSaveStep('');
    }
  };

  const totalPages    = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeDescKey = `description_${activeLang}` as keyof AForm;

  return (
    <div className="page-shell">

      <div className="top-bar">
        <div>
          <div className="page-eyebrow">— Sacred Collection</div>
          <h1 className="page-title">Artifacts</h1>
          <div className="page-gold-line" />
          <p className="page-subtitle">
            Manage sacred vessels, vestments, books, and devotional objects.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Artifact</button>
      </div>

      <div className="panel">
        {error && (
          <div className="alert-box">
            <span className="alert-ico">!</span>
            <span>{error}</span>
          </div>
        )}

        <div className="table-wrap">
          {loading ? (
            <div className="skeleton-table">
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="skeleton-row">
                  <span className="skeleton skeleton-row-index" />
                  <span className="skeleton skeleton-row-line" />
                  <span className="skeleton skeleton-row-line short" />
                  <span className="skeleton skeleton-row-line short" />
                  <span className="skeleton skeleton-row-actions" />
                </div>
              ))}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Category</th>
                  <th>QR</th><th>Languages</th><th>Audio</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((a, idx) => {
                  const art       = a as any;
                  const withDesc  = LANGUAGES.filter(l => art[l.dbDesc]);
                  const withAudio = LANGUAGES.filter(l => art[l.dbAudio] && art[l.dbAudio] !== 'No audio yet');

                  return (
                    <tr key={a.id}>
                      <td className="td-muted">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td><strong>{a.name}</strong></td>
                      <td><span className="category-badge">{a.category}</span></td>
                      <td>
                        {a.qr_code
                          ? <img src={a.qr_code} className="qr-thumb" alt={`QR for ${a.name}`} />
                          : <span className="td-muted">—</span>}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {withDesc.length > 0
                            ? withDesc.map(l => (
                                <span key={l.code} className="lang-chip" title={l.label}>
                                  {l.flag} {l.code.toUpperCase()}
                                </span>
                              ))
                            : <span className="td-muted">—</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          {withAudio.length > 0
                            ? withAudio.map(l => (
                                <a key={l.code} href={art[l.dbAudio]}
                                  target="_blank" rel="noreferrer"
                                  className="lang-chip lang-chip-audio"
                                  title={`Play ${l.label} audio`}>
                                  {l.flag} ▶
                                </a>
                              ))
                            : <span className="td-muted">—</span>}
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)}>Edit</button>
                      </td>
                    </tr>
                  );
                })}
                {artifacts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-cell">
                      No artifacts found. Create your first sacred artifact above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div className="pagination-row">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            ← Previous
          </button>
          <span className="td-muted">Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next →
          </button>
        </div>
      </div>

      {showModal && (
        <div
          className="modal-backdrop"
          onClick={(e) => e.target === e.currentTarget && !saving && setShowModal(false)}
        >
          <div className="modal-panel modal-md" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <div>
                <div className="modal-eyebrow">— Sacred Collection</div>
                <h3>{editingId ? 'Edit Artifact' : 'New Artifact'}</h3>
                <div className="modal-goldline" />
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)} disabled={saving}>✕</button>
            </div>

            <div className="modal-step-indicator">
              <div className={`step ${modalStep === 1 ? 'step-active' : 'step-completed'}`}>
                <span className="step-number">1</span>
                <span className="step-label">Basic Info</span>
              </div>
              <div className="step-line" />
              <div className={`step ${modalStep === 2 ? 'step-active' : ''}`}>
                <span className="step-number">2</span>
                <span className="step-label">Descriptions</span>
              </div>
            </div>

            <div className="modal-body">
              <form
                onSubmit={modalStep === 2 ? handleSubmit : (e) => { e.preventDefault(); setModalStep(2); }}
                className="form-stack"
              >
                {modalStep === 1 && (
                  <>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label htmlFor="name">Name *</label>
                        <input id="name" type="text" placeholder="e.g. Chalice of St. John"
                          value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                      </div>
                      <div className="form-group">
                        <label htmlFor="category">Category</label>
                        <select id="category" value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-row-2">
                      <div className="form-group">
                        <label htmlFor="image_url">Image URL</label>
                        <input id="image_url" type="url" placeholder="https://example.com/image.jpg"
                          value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label htmlFor="created_at">Date Created</label>
                        <input id="created_at" type="date" value={form.created_at}
                          onChange={(e) => setForm({ ...form, created_at: e.target.value })} />
                      </div>
                    </div>
                    {form.image_url && (
                      <div className="form-group">
                        <label>Image Preview</label>
                        <div style={{ width: '50%', maxHeight: '100px', borderRadius: '8px', overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                          <img src={form.image_url} alt="Preview" style={{ width: '50%', height: '50%', objectFit: 'cover' }} />
                        </div>
                      </div>
                    )}
                  </>
                )}

                {modalStep === 2 && (
                  <>
                    <div className="form-group">
                      <div className="lang-section-header">
                        <label>Description</label>
                        <div className="lang-tabs">
                          {LANGUAGES.map(l => (
                            <button key={l.code} type="button"
                              className={`lang-tab ${activeLang === l.code ? 'lang-tab-active' : ''}`}
                              onClick={() => setActiveLang(l.code as LangCode)}>
                              {l.flag} {l.label}
                              {(form[`description_${l.code}` as keyof AForm] as string)?.trim() && (
                                <span className="lang-filled-dot" />
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="lang-desc-wrap">
                        <textarea
                          key={activeLang}
                          placeholder={
                            activeLang === 'en'
                              ? 'Describe the artifact in English. Use "Auto-translate" to fill other languages.'
                              : translating ? 'Translating…'
                              : `${LANGUAGES.find(l => l.code === activeLang)?.label} — edit manually or auto-translate.`
                          }
                          value={form[activeDescKey] as string}
                          onChange={(e) => setForm({ ...form, [activeDescKey]: e.target.value })}
                          rows={5}
                        />
                        {activeLang === 'en' && (
                          <button type="button" className="btn btn-translate"
                            onClick={handleTranslate}
                            disabled={translating || !form.description_en.trim()}>
                            {translating
                              ? <><span className="spinner" /> {translationProgress || 'Translating…'}</>
                              : <>🌐 Auto-translate (MyMemory — free)</>
                            }
                          </button>
                        )}
                      </div>

                      {translationProgress && !translating && (
                        <div className="translation-success">✓ {translationProgress}</div>
                      )}

                      {activeLang === 'en' && LANGUAGES.some(l =>
                        l.code !== 'en' && (form[`description_${l.code}` as keyof AForm] as string)?.trim()
                      ) && (
                        <div className="translation-preview">
                          {LANGUAGES.filter(l => l.code !== 'en').map(l => {
                            const val = (form[`description_${l.code}` as keyof AForm] as string)?.trim();
                            return val ? (
                              <div key={l.code} className="translation-preview-item">
                                <span className="translation-preview-flag">{l.flag}</span>
                                <span className="translation-preview-text">
                                  {val.length > 70 ? val.slice(0, 70) + '…' : val}
                                </span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                    </div>

                    <div className="audio-notice">
                      <span className="audio-notice-ico">🔊</span>
                      <span>
                        Audio saved to <code>audio/{'{id}'}/{'{lang}'}.webm</code> — one folder per artifact.
                      </span>
                    </div>
                  </>
                )}

                <div className="modal-actions">
                  {modalStep === 2 && (
                    <button type="button" className="btn btn-ghost" onClick={() => setModalStep(1)} disabled={saving}>
                      ← Back
                    </button>
                  )}
                  {modalStep === 1 && (
                    <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={saving}>
                      Cancel
                    </button>
                  )}
                  <div style={{ flex: 1 }} />
                  {modalStep === 1 && (
                    <button type="submit" className="btn btn-primary" disabled={!form.name.trim()}>
                      Next →
                    </button>
                  )}
                  {modalStep === 2 && (
                    <button type="submit" className="btn btn-primary" disabled={saving}>
                      {saving
                        ? <><span className="spinner spinner-white" /> {saveStep || 'Processing…'}</>
                        : editingId ? 'Update Artifact' : 'Create Artifact'
                      }
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}