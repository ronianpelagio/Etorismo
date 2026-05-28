import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Artifact } from '../types';
import QRCode from 'qrcode';

import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiVolume2,
  FiImage,
  FiCalendar,
  FiFolder,
  FiGlobe,
  FiChevronLeft,
  FiChevronRight,
  FiCheck,
  FiX,
  FiUploadCloud,
  FiMic,
} from 'react-icons/fi';

// Import the artifact utilities
import {
  translateAllLanguages,
  type AudioUploadResult,
} from '../utils/ArtifactUtil';



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
  { code: 'en',  label: 'English',  flag: '🇺🇸', dbDesc: 'description_en',  dbAudio: 'audio_en',  dbName: 'name', mmLang: 'en-US', ttsLang: 'en' },
  { code: 'fil', label: 'Filipino', flag: '🇵🇭', dbDesc: 'description_fil', dbAudio: 'audio_fil', dbName: 'name_fil', mmLang: 'tl-PH', ttsLang: 'tl' },
  { code: 'ja',  label: 'Japanese', flag: '🇯🇵', dbDesc: 'description_ja',  dbAudio: 'audio_ja',  dbName: 'name_ja', mmLang: 'ja-JP', ttsLang: 'ja' },
  { code: 'es',  label: 'Spanish',  flag: '🇪🇸', dbDesc: 'description_es',  dbAudio: 'audio_es',  dbName: 'name_es', mmLang: 'es-ES', ttsLang: 'es' },
  { code: 'ko',  label: 'Korean',   flag: '🇰🇷', dbDesc: 'description_ko',  dbAudio: 'audio_ko',  dbName: 'name_ko', mmLang: 'ko-KR', ttsLang: 'ko' },
] as const;

type LangCode = 'en' | 'fil' | 'ja' | 'es' | 'ko';

const emptyForm = {
  name:            '',
  category:        CATEGORIES[0],
  image_url:       '',
  image_file:      null as File | null,
  created_at:      '',
  description_en:  '',
  description_fil: '',
  description_ja:  '',
  description_es:  '',
  description_ko:  '',
  // Translated name fields
  name_fil: '',
  name_ja: '',
  name_es: '',
  name_ko: '',
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

// ─── Upload Functions ───────────────────────────────────────────────────────

async function uploadImage(artifactId: string, file: File): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const filePath = `artifacts/${artifactId}.${fileExt}`;

  const { error } = await supabase.storage
    .from('artifact-images')
    .upload(filePath, file, { contentType: file.type, upsert: true });

  if (error) throw new Error(`Image upload failed: ${error.message}`);
  return supabase.storage.from('artifact-images').getPublicUrl(filePath).data.publicUrl;
}

async function generateAudioViaAPI(
  artifactId: string,
  text: string,
  langCode: LangCode,
  voiceName?: string,
  speakingRate?: number
): Promise<{ success: boolean; audioUrl: string; voiceUsed?: string }> {
  const response = await fetch('http://localhost:5000/generate-audio', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      artifactId,
      text,
      lang: langCode,        
      voiceName: voiceName,  
      speakingRate: speakingRate || 1.0
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate audio');
  }

  return await response.json();
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ArtifactsPage() {
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [form, setForm] = useState<AForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeLang, setActiveLang] = useState<LangCode>('en');
  const [saveStep, setSaveStep] = useState('');
  const [modalStep, setModalStep] = useState(1);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Voice selection states
  const [availableVoices, setAvailableVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [speakingRate, setSpeakingRate] = useState<number>(1.0);
  const [showVoiceControls, setShowVoiceControls] = useState<boolean>(false);
  
  // Translation and audio states
  const [translating, setTranslating] = useState(false);
  const [translateStep, setTranslateStep] = useState('');
  const [audioSaving, setAudioSaving] = useState(false);
  const [audioStep, setAudioStep] = useState('');
  const [generatingAllAudio, setGeneratingAllAudio] = useState(false);
  const [audioStatus, setAudioStatus] = useState<Record<string, string>>({});

  useEffect(() => { fetchData(page); }, [page]);

  useEffect(() => {
    if ('speechSynthesis' in window) speechSynthesis.getVoices();
  }, []);

  // Fetch available voices when language changes
  useEffect(() => {
    if (activeLang) {
      fetch(`http://localhost:5000/available-voices/${activeLang}`)
        .then(res => res.json())
        .then(data => {
          setAvailableVoices(data.voices || []);
          setSelectedVoice(data.defaultVoice || '');
        })
        .catch(err => console.error('Failed to fetch voices:', err));
    }
  }, [activeLang]);

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
    setImagePreview('');
    setActiveLang('en');
    setModalStep(1);
    setShowModal(true);
  };

  const openEdit = (a: Artifact) => {
    setEditingId(a.id);
    setActiveLang('en');
    setModalStep(1);
    setImagePreview((a as any).image_url || '');
    setForm({
      name:            a.name,
      category:        a.category,
      image_url:       (a as any).image_url || '',
      image_file:      null,
      created_at:      a.created_at ? new Date(a.created_at).toISOString().slice(0, 10) : '',
      description_en:  (a as any).description_en  || '',
      description_fil: (a as any).description_fil || '',
      description_ja:  (a as any).description_ja  || '',
      description_es:  (a as any).description_es  || '',
      description_ko:  (a as any).description_ko  || '',
      name_fil: (a as any).name_fil || '',
      name_ja: (a as any).name_ja || '',
      name_es: (a as any).name_es || '',
      name_ko: (a as any).name_ko || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('artifacts').delete().eq('id', id);
      if (error) throw error;
      setDeleteConfirmId(null);
      const newTotal = total - 1;
      const newTotalPages = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      const safePage = Math.min(page, newTotalPages);
      if (safePage !== page) setPage(safePage);
      else fetchData(page);
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, image_file: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const handleTranslate = async () => {
    if (!form.name.trim()) {
      alert('Enter an English name first.');
      return;
    }
    if (!form.description_en.trim()) {
      alert('Enter an English description first.');
      return;
    }
    
    setTranslating(true);
    setTranslateStep('Starting translation...');
    
    try {
      const result = await translateAllLanguages(
        form.name,
        form.description_en,
        setTranslateStep,
        'user@example.com'
      );
      
      console.log('Translation result:', result);
      
      setForm(f => ({ 
        ...f, 
        name_fil: result.name_fil || f.name_fil,
        name_ja: result.name_ja || f.name_ja,
        name_es: result.name_es || f.name_es,
        name_ko: result.name_ko || f.name_ko,
        description_fil: result.description_fil || f.description_fil,
        description_ja: result.description_ja || f.description_ja,
        description_es: result.description_es || f.description_es,
        description_ko: result.description_ko || f.description_ko,
      }));
      
      alert('✅ Translations completed successfully!');
    } catch (err: any) {
      console.error('[Translation error]', err);
      alert(`Translation error: ${err.message}`);
    } finally {
      setTranslating(false);
      setTranslateStep('');
    }
  };

  // Updated audio handler with voice selection
  const handleSaveAudio = async (langCode: LangCode) => {
    if (!editingId) {
      alert('Please save the artifact first before generating audio.');
      return;
    }
    
    const text = form[`description_${langCode}` as keyof AForm] as string;
    if (!text?.trim()) {
      alert(`No description for ${LANGUAGES.find(l => l.code === langCode)?.label} yet.`);
      return;
    }
    
    setAudioSaving(true);
    setAudioStep(`Generating audio for ${langCode.toUpperCase()}...`);
    setAudioStatus(prev => ({ ...prev, [langCode]: 'generating' }));
    
    try {
      // Pass the selected voice and speaking rate
      const result = await generateAudioViaAPI(
        editingId, 
        text, 
        langCode, 
        selectedVoice, 
        speakingRate
      );
      
      if (result.success) {
        setAudioStatus(prev => ({ ...prev, [langCode]: 'success' }));
        alert(`✅ Audio for ${LANGUAGES.find(l => l.code === langCode)?.label} saved! Voice: ${result.voiceUsed || selectedVoice}`);
        
        await fetchData(page);
        
        setTimeout(() => {
          setAudioStatus(prev => {
            const newStatus = { ...prev };
            delete newStatus[langCode];
            return newStatus;
          });
        }, 3000);
      }
    } catch (err: any) {
      console.error('[Audio generation error]', err);
      setAudioStatus(prev => ({ ...prev, [langCode]: 'error' }));
      alert(`Audio error: ${err.message}`);
      
      setTimeout(() => {
        setAudioStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[langCode];
          return newStatus;
        });
      }, 3000);
    } finally {
      setAudioSaving(false);
      setAudioStep('');
    }
  };

  const handleGenerateAllAudio = async () => {
    if (!editingId) {
      alert('Please save the artifact first before generating audio.');
      return;
    }
    
    const descriptions: Partial<Record<LangCode, string>> = {
      en: form.description_en,
      fil: form.description_fil,
      ja: form.description_ja,
      es: form.description_es,
      ko: form.description_ko,
    };
    
    const hasAnyDesc = Object.values(descriptions).some(text => text?.trim());
    if (!hasAnyDesc) {
      alert('No descriptions available to generate audio from.');
      return;
    }
    
    setGeneratingAllAudio(true);
    let successCount = 0;
    let errorCount = 0;
    
    for (const [langCode, text] of Object.entries(descriptions)) {
      if (text?.trim()) {
        try {
          setAudioStep(`Generating audio for ${langCode.toUpperCase()}...`);
          setAudioStatus(prev => ({ ...prev, [langCode]: 'generating' }));
          
          await generateAudioViaAPI(editingId, text, langCode as LangCode, selectedVoice, speakingRate);
          
          setAudioStatus(prev => ({ ...prev, [langCode]: 'success' }));
          successCount++;
          
          setTimeout(() => {
            setAudioStatus(prev => {
              const newStatus = { ...prev };
              delete newStatus[langCode];
              return newStatus;
            });
          }, 3000);
        } catch (err: any) {
          console.error(`[Audio generation error for ${langCode}]`, err);
          setAudioStatus(prev => ({ ...prev, [langCode]: 'error' }));
          errorCount++;
          
          setTimeout(() => {
            setAudioStatus(prev => {
              const newStatus = { ...prev };
              delete newStatus[langCode];
              return newStatus;
            });
          }, 3000);
        }
      }
    }
    
    setGeneratingAllAudio(false);
    setAudioStep('');
    
    if (successCount > 0) {
      alert(` Generated ${successCount} audio files successfully!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
      await fetchData(page);
    } else if (errorCount > 0) {
      alert(` Failed to generate ${errorCount} audio files. Please check the server.`);
    }
  };

  const handleSaveArtifact = async () => {
    if (!form.name.trim()) return alert('Please enter a name for the artifact.');
    
    setSaving(true);
    setSaveStep('Saving artifact...');

    try {
      const payload = {
        name: form.name,
        category: form.category,
        image_url: form.image_url || null,
        description_en: form.description_en || null,
        description_fil: form.description_fil || null,
        description_ja: form.description_ja || null,
        description_es: form.description_es || null,
        description_ko: form.description_ko || null,
        name_fil: form.name_fil || null,
        name_ja: form.name_ja || null,
        name_es: form.name_es || null,
        name_ko: form.name_ko || null,
        created_at: form.created_at ? new Date(form.created_at).toISOString() : new Date().toISOString(),
      };

      console.log('Saving payload:', payload);

      let result;
      if (editingId) {
        result = await supabase.from('artifacts').update(payload).eq('id', editingId).select().single();
      } else {
        result = await supabase.from('artifacts').insert(payload).select().single();
      }
      
      if (result.error) throw result.error;
      const artifact = result.data;

      let imageUrl = form.image_url;
      if (form.image_file) {
        setSaveStep('Uploading image...');
        imageUrl = await uploadImage(artifact.id, form.image_file);
        await supabase.from('artifacts').update({ image_url: imageUrl }).eq('id', artifact.id);
      }

      setSaveStep('Generating QR code...');
      const qrValue = artifact.qr_value || `${window.location.origin}/artifact/${artifact.id}`;
      const qrDataUrl = await QRCode.toDataURL(qrValue);
      const qrBlob = dataUrlToBlob(qrDataUrl);

      const { error: qrErr } = await supabase.storage
        .from('qrcode')
        .upload(`${artifact.id}.png`, qrBlob, { contentType: 'image/png', upsert: true });
      
      if (!qrErr) {
        const { data: qrUrlData } = supabase.storage.from('qrcode').getPublicUrl(`${artifact.id}.png`);
        await supabase.from('artifacts').update({ qr_code: qrUrlData.publicUrl }).eq('id', artifact.id);
      }

      setSaveStep('Generating audio files...');
      try {
        const descriptions: Partial<Record<LangCode, string>> = {
          en: form.description_en,
          fil: form.description_fil,
          ja: form.description_ja,
          es: form.description_es,
          ko: form.description_ko,
        };
        
        for (const [langCode, text] of Object.entries(descriptions)) {
          if (text?.trim()) {
            await generateAudioViaAPI(artifact.id, text, langCode as LangCode, selectedVoice, speakingRate);
          }
        }
      } catch (audioErr: any) {
        console.warn('[Audio generation warning]', audioErr.message);
      }

      setShowModal(false);
      await fetchData(page);
      alert('✅ Artifact saved successfully!');
    } catch (err: any) {
      console.error('[ArtifactsPage] Save error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setSaving(false);
      setSaveStep('');
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeDescKey = `description_${activeLang}` as keyof AForm;
  const activeNameKey = `name_${activeLang}` as keyof AForm;

  const getAudioStatusIcon = (langCode: string) => {
    const status = audioStatus[langCode];
    if (status === 'generating') return <span className="spinner" style={{ marginLeft: '4px' }} />;
    if (status === 'success') return <span style={{ marginLeft: '4px', color: '#16A34A' }}>✓</span>;
    if (status === 'error') return <span style={{ marginLeft: '4px', color: '#EF4444' }}>✗</span>;
    return null;
  };

  return (
    <div className="page-shell" style={{ backgroundColor: '#F0FDF4', minHeight: '100vh' }}>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinner {
          display: inline-block;
          width: 14px;
          height: 14px;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
      `}</style>
      
      <div className="top-bar" style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#FFFFFF', borderBottom: '1px solid #DCFCE7' }}>
        <div>
          <div className="page-eyebrow" style={{ color: '#16A34A', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>— Sacred Collection</div>
          <h1 className="page-title" style={{ color: '#1F2937', fontSize: '2rem', fontWeight: '700', marginTop: '8px', marginBottom: 0 }}>Artifacts</h1>
          <div className="page-gold-line" style={{ height: '3px', width: '60px', backgroundColor: '#16A34A', margin: '12px 0 16px 0' }} />
          <p className="page-subtitle" style={{ color: '#4B5563', marginTop: '8px' }}>Manage sacred vessels, vestments, books, and devotional objects.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} style={{ backgroundColor: '#16A34A', border: 'none', padding: '10px 20px', borderRadius: '12px', color: '#FFFFFF', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiPlus size={18} /> Add Artifact
        </button>
      </div>

      <div className="panel" style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', margin: '24px 32px 32px 32px', overflow: 'hidden' }}>
        {error && (
          <div className="alert-box" style={{ margin: '16px', backgroundColor: '#FEE2E2', borderLeft: '4px solid #EF4444', padding: '12px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span className="alert-ico" style={{ color: '#EF4444' }}>!</span>
            <span style={{ color: '#991B1B' }}>{error}</span>
          </div>
        )}

        <div className="table-wrap" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div className="skeleton-table" style={{ padding: '20px' }}>
              {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                <div key={i} className="skeleton-row" style={{ height: '60px', backgroundColor: '#F3F4F6', marginBottom: '8px', borderRadius: '8px' }} />
              ))}
            </div>
          ) : (
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '16px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: '600' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '16px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: '600' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '16px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: '600' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '16px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: '600' }}>Image</th>
                  <th style={{ textAlign: 'left', padding: '16px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: '600' }}>QR</th>
                  <th style={{ textAlign: 'left', padding: '16px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: '600' }}>Languages</th>
                  <th style={{ textAlign: 'left', padding: '16px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: '600' }}>Read</th>
                  <th style={{ textAlign: 'left', padding: '16px', backgroundColor: '#F0FDF4', color: '#15803D', fontWeight: '600' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((a, idx) => {
                  const art = a as any;
                  const withDesc = LANGUAGES.filter(l => art[l.dbDesc]);
                  const withAudio = LANGUAGES.filter(l => art[l.dbAudio]);

                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #F0FDF4', transition: 'background-color 0.2s' }}>
                      <td className="td-muted" style={{ padding: '16px', color: '#6B7280' }}>{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td style={{ padding: '16px', fontWeight: 600, color: '#1F2937' }}><strong>{a.name}</strong></td>
                      <td style={{ padding: '16px' }}><span className="category-badge" style={{ backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: '9999px', padding: '4px 12px', fontSize: '0.75rem', fontWeight: '500', display: 'inline-block' }}>{a.category}</span></td>
                      <td style={{ padding: '16px' }}>
                        {art.image_url ? <img src={art.image_url} className="image-thumb" alt={a.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }} /> : <span className="td-muted" style={{ color: '#9CA3AF' }}>—</span>}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {a.qr_code ? <img src={a.qr_code} className="qr-thumb" alt={`QR for ${a.name}`} style={{ width: 40, height: 40 }} /> : <span className="td-muted" style={{ color: '#9CA3AF' }}>—</span>}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {withDesc.length > 0 ? withDesc.map(l => (
                            <span key={l.code} className="lang-chip" title={`${l.label}${withAudio.find(audio => audio.code === l.code) ? ' (Audio available)' : ''}`} style={{ backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', padding: '4px 10px', borderRadius: '20px', fontSize: '0.7rem', color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {l.flag} {l.code.toUpperCase()}
                              {withAudio.find(audio => audio.code === l.code) && <span style={{ fontSize: '0.65rem' }}>🔊</span>}
                            </span>
                          )) : <span className="td-muted" style={{ color: '#9CA3AF' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {withDesc.length > 0 ? withDesc.map(l => (
                            <button
                              key={l.code}
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#16A34A', background: 'transparent', border: 'none', fontSize: '0.75rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              onClick={() => {
                                if (art[l.dbAudio] && art[l.dbAudio] !== 'No audio yet') {
                                  const audio = new Audio(art[l.dbAudio]);
                                  audio.play().catch(err => console.warn('Audio playback failed:', err));
                                } else {
                                  const desc = art[l.dbDesc] as string;
                                  if (!desc) return;
                                  if (!('speechSynthesis' in window)) return alert('Speech synthesis is not supported in this browser.');
                                  window.speechSynthesis.cancel();
                                  const utter = new SpeechSynthesisUtterance(desc);
                                  utter.lang = l.mmLang;
                                  window.speechSynthesis.speak(utter);
                                }
                              }}
                            >
                              <FiVolume2 size={12} /> {l.code.toUpperCase()}
                            </button>
                          )) : <span className="td-muted" style={{ color: '#9CA3AF' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)} style={{ color: '#16A34A', background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <FiEdit2 size={14} /> Edit
                          </button>
                          {deleteConfirmId === a.id ? (
                            <>
                              <button className="btn btn-sm" style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => handleDelete(a.id)}>
                                <FiCheck size={12} /> Confirm
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirmId(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <FiX size={12} /> Cancel
                              </button>
                            </>
                          ) : (
                            <button className="btn btn-ghost btn-sm" style={{ color: '#dc2626', background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }} onClick={() => setDeleteConfirmId(a.id)}>
                              <FiTrash2 size={14} /> Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="pagination-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderTop: '1px solid #F0FDF4', backgroundColor: '#F9FAFB' }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '10px', cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <FiChevronLeft size={14} /> Previous
          </button>
          <span className="td-muted" style={{ color: '#6B7280' }}>Page {page} of {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: '10px', cursor: page >= totalPages ? 'not-allowed' : 'pointer', opacity: page >= totalPages ? 0.5 : 1, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Next <FiChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && !saving && setShowModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div className="modal-panel modal-lg" onClick={e => e.stopPropagation()} style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 35px -10px rgba(0,0,0,0.2)', borderTop: '4px solid #16A34A' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 28px 12px 28px', borderBottom: '1px solid #F0FDF4' }}>
              <div>
                <div className="modal-eyebrow" style={{ color: '#16A34A', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1px' }}>— Sacred Collection</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '4px', marginBottom: '4px', color: '#1F2937' }}>{editingId ? 'Edit Artifact' : 'New Artifact'}</h3>
                <div className="modal-goldline" style={{ height: '2px', width: '50px', backgroundColor: '#16A34A', marginTop: '8px' }} />
              </div>
              <button className="modal-close" onClick={() => !saving && setShowModal(false)} disabled={saving} style={{ background: 'transparent', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6B7280' }}>
                <FiX size={20} />
              </button>
            </div>

            <div className="modal-step-indicator" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '20px 28px', backgroundColor: '#F9FAFB', borderBottom: '1px solid #F0FDF4' }}>
              <div className={`step ${modalStep === 1 ? 'step-active' : 'step-completed'}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="step-number" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '9999px', backgroundColor: modalStep === 1 ? '#16A34A' : '#DCFCE7', color: modalStep === 1 ? '#FFF' : '#15803D', fontWeight: 'bold' }}>1</span>
                <span className="step-label" style={{ fontWeight: 500, color: '#1F2937' }}>Basic Info</span>
              </div>
              <div className="step-line" style={{ width: '40px', height: '1px', backgroundColor: '#D1D5DB' }} />
              <div className={`step ${modalStep === 2 ? 'step-active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="step-number" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '9999px', backgroundColor: modalStep === 2 ? '#16A34A' : '#E5E7EB', color: modalStep === 2 ? '#FFF' : '#6B7280', fontWeight: 'bold' }}>2</span>
                <span className="step-label" style={{ fontWeight: 500, color: modalStep === 2 ? '#1F2937' : '#6B7280' }}>Descriptions</span>
              </div>
            </div>

            <div className="modal-body" style={{ padding: '28px' }}>
              <div className="form-stack" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {modalStep === 1 && (
                  <>
                    <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="form-group">
                        <label htmlFor="name" style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1F2937' }}>Name (English) *</label>
                        <input id="name" type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chalice of St. John" style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px', transition: 'all 0.2s' }} />
                      </div>
                      <div className="form-group">
                        <label htmlFor="category" style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1F2937' }}>Category</label>
                        <select id="category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px', backgroundColor: '#FFF' }}>
                          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="form-row-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1F2937' }}>Upload Image</label>
                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ width: '100%', padding: '8px' }} />
                      </div>
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1F2937' }}>Image URL (optional)</label>
                        <input type="url" value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px' }} />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1F2937' }}>Date Created (optional)</label>
                      <input type="date" value={form.created_at} onChange={e => setForm(f => ({ ...f, created_at: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '1px solid #D1D5DB', borderRadius: '12px' }} />
                    </div>

                    {(imagePreview || form.image_url) && (
                      <div className="form-group">
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1F2937' }}>Image Preview</label>
                        <img src={imagePreview || form.image_url} alt="preview" style={{ maxWidth: '220px', borderRadius: '12px', border: '1px solid #E5E7EB' }} />
                      </div>
                    )}
                  </>
                )}

                {modalStep === 2 && (
                  <>
                    <div className="form-group">
                      <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1F2937' }}>Descriptions (Multi-language)</label>
                      
                      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={handleTranslate}
                          disabled={translating || !form.description_en.trim()}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#16A34A',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: (translating || !form.description_en.trim()) ? 'not-allowed' : 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            opacity: (translating || !form.description_en.trim()) ? 0.6 : 1,
                          }}
                        >
                          {translating ? (
                            <>
                              <span className="spinner" style={{ borderColor: '#FFF', borderTopColor: 'transparent' }} />
                              {translateStep || 'Translating...'}
                            </>
                          ) : (
                            <>
                              <FiGlobe size={14} />
                              Auto-translate from English
                            </>
                          )}
                        </button>
                        
                        {/* Voice Settings Button */}
                        <button
                          type="button"
                          onClick={() => setShowVoiceControls(!showVoiceControls)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: showVoiceControls ? '#16A34A' : '#6B7280',
                            color: '#FFF',
                            border: 'none',
                            borderRadius: '10px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                          }}
                        >
                          <FiMic size={14} />
                          {showVoiceControls ? 'Hide Voice Settings' : 'Voice Settings'}
                        </button>
                        
                        {editingId && (
                          <button
                            type="button"
                            onClick={handleGenerateAllAudio}
                            disabled={generatingAllAudio || audioSaving}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: '#6B7280',
                              color: '#FFF',
                              border: 'none',
                              borderRadius: '10px',
                              cursor: (generatingAllAudio || audioSaving) ? 'not-allowed' : 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontSize: '0.875rem',
                              fontWeight: 500,
                              opacity: (generatingAllAudio || audioSaving) ? 0.6 : 1,
                            }}
                          >
                            {(generatingAllAudio || audioSaving) ? (
                              <>
                                <span className="spinner" style={{ borderColor: '#FFF', borderTopColor: 'transparent' }} />
                                {audioStep || 'Generating Audio...'}
                              </>
                            ) : (
                              <>
                                <FiVolume2 size={14} />
                                Generate All Audio
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      
                      {/* Voice Controls Panel */}
                      {showVoiceControls && (
                        <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #DCFCE7' }}>
                          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600, color: '#1F2937' }}>Voice Settings</h4>
                          
                          {/* Voice Selection */}
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 500, color: '#15803D' }}>
                              Voice for {LANGUAGES.find(l => l.code === activeLang)?.label}
                            </label>
                            <select
                              value={selectedVoice}
                              onChange={(e) => setSelectedVoice(e.target.value)}
                              style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: '#FFF' }}
                            >
                              {availableVoices.map((voice) => (
                                <option key={voice.name} value={voice.name}>
                                  {voice.description} ({voice.gender}) - {voice.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          {/* Speaking Speed */}
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.8rem', fontWeight: 500, color: '#15803D' }}>
                              Speaking Speed: {speakingRate.toFixed(1)}x
                            </label>
                            <input
                              type="range"
                              min="0.5"
                              max="2.0"
                              step="0.1"
                              value={speakingRate}
                              onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
                              style={{ width: '100%' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#6B7280', marginTop: '4px' }}>
                              <span>Slower (0.5x)</span>
                              <span>Normal (1.0x)</span>
                              <span>Faster (2.0x)</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Language Tabs */}
                      <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {LANGUAGES.map(l => (
                          <button
                            key={l.code}
                            type="button"
                            className={`lang-tab ${activeLang === l.code ? 'lang-tab-active' : ''}`}
                            onClick={() => setActiveLang(l.code as LangCode)}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '9999px',
                              border: '1px solid #D1D5DB',
                              backgroundColor: activeLang === l.code ? '#16A34A' : 'transparent',
                              color: activeLang === l.code ? '#FFF' : '#1F2937',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {l.flag} {l.label}
                            {getAudioStatusIcon(l.code)}
                          </button>
                        ))}
                      </div>
                      
                      {activeLang !== 'en' && (
                        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#F0FDF4', borderRadius: '12px' }}>
                          <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, color: '#1F2937', fontSize: '0.8rem' }}>
                            Translated Name ({LANGUAGES.find(l => l.code === activeLang)?.label})
                          </label>
                          <input
                            type="text"
                            value={form[activeNameKey] as string || ''}
                            onChange={e => setForm(f => ({ ...f, [activeNameKey]: e.target.value }))}
                            placeholder={`Translated name in ${LANGUAGES.find(l => l.code === activeLang)?.label}...`}
                            style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: '12px', fontSize: '0.9rem' }}
                          />
                        </div>
                      )}
                      
                      <textarea
                        rows={8}
                        value={form[activeDescKey] as string}
                        onChange={e => setForm(f => ({ ...f, [activeDescKey]: e.target.value }))}
                        placeholder={`Enter description in ${LANGUAGES.find(l => l.code === activeLang)?.label}...`}
                        style={{ width: '100%', padding: '12px', border: '1px solid #D1D5DB', borderRadius: '16px', fontFamily: 'inherit', transition: 'all 0.2s' }}
                      />
                      
                      {editingId && (
                        <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveAudio(activeLang)}
                            disabled={audioSaving || !form[activeDescKey]}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: 'transparent',
                              border: '1px solid #DCFCE7',
                              borderRadius: '9999px',
                              color: '#16A34A',
                              cursor: (audioSaving || !form[activeDescKey]) ? 'not-allowed' : 'pointer',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              opacity: (audioSaving || !form[activeDescKey]) ? 0.5 : 1,
                            }}
                          >
                            {audioSaving && audioStep.includes(activeLang.toUpperCase()) ? (
                              <>
                                <span className="spinner" />
                                {audioStep}
                              </>
                            ) : (
                              <>
                                <FiUploadCloud size={12} />
                                Generate & Save Audio for {LANGUAGES.find(l => l.code === activeLang)?.label}
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div className="modal-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #F0FDF4' }}>
                  {modalStep === 2 ? (
                    <button className="btn btn-ghost" onClick={() => setModalStep(1)} disabled={saving} style={{ padding: '8px 20px', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <FiChevronLeft size={14} /> Back
                    </button>
                  ) : (
                    <button className="btn btn-ghost" onClick={() => !saving && setShowModal(false)} style={{ padding: '8px 20px', backgroundColor: '#F3F4F6', border: 'none', borderRadius: '12px', cursor: 'pointer' }}>
                      Cancel
                    </button>
                  )}
                  <div style={{ flex: 1 }} />
                  {modalStep === 1 && (
                    <button className="btn btn-primary" onClick={() => setModalStep(2)} disabled={!form.name.trim()} style={{ backgroundColor: '#16A34A', border: 'none', padding: '8px 24px', borderRadius: '12px', color: '#FFF', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      Next <FiChevronRight size={14} />
                    </button>
                  )}
                  {modalStep === 2 && (
                    <button className="btn btn-success" onClick={handleSaveArtifact} disabled={saving} style={{ backgroundColor: '#16A34A', border: 'none', padding: '8px 24px', borderRadius: '12px', color: '#FFF', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {saving ? <><span className="spinner" style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #FFF', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} /> {saveStep}</> : editingId ? 'Update Artifact' : 'Create Artifact'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}