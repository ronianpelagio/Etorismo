// ─────────────────────────────────────────────────────────────────────────────
//  ArtifactUtil.ts  –  Translation · TTS Audio · Supabase Upload
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '../services/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranslationResult {
  en: { name: string; description: string };
  fil: { name: string; description: string };
  ja: { name: string; description: string };
  es: { name: string; description: string };
  ko: { name: string; description: string };
}

export interface AudioUploadResult {
  lang: string;
  url: string;
}

// ─── Language config ──────────────────────────────────────────────────────────

export const LANG_CONFIG = [
  { code: 'en'  as const, label: 'English',  googleCode: 'en', mmCode: 'en-US' },
  { code: 'fil' as const, label: 'Filipino', googleCode: 'tl', mmCode: 'tl-PH' },
  { code: 'ja'  as const, label: 'Japanese', googleCode: 'ja', mmCode: 'ja-JP' },
  { code: 'es'  as const, label: 'Spanish',  googleCode: 'es', mmCode: 'es-ES' },
  { code: 'ko'  as const, label: 'Korean',   googleCode: 'ko', mmCode: 'ko-KR' },
] as const;

export type LangCode = 'en' | 'fil' | 'ja' | 'es' | 'ko';

// ─── Helper: upsert a single artifact_translation row ─────────────────────────

async function upsertTranslation(
  artifactId: string,
  languageCode: LangCode,
  fields: { name?: string; description?: string; audio_url?: string },
) {
  // Read existing row first so we don't overwrite fields we aren't touching
  const { data: existing } = await supabase
    .from('artifact_translations')
    .select('name, description, audio_url')
    .eq('artifact_id', artifactId)
    .eq('language_code', languageCode)
    .maybeSingle();

  const row = {
    artifact_id: artifactId,
    language_code: languageCode,
    name: fields.name ?? existing?.name ?? '',
    description: fields.description ?? existing?.description ?? null,
    audio_url: fields.audio_url !== undefined ? fields.audio_url : (existing?.audio_url ?? null),
  };

  const { error } = await supabase
    .from('artifact_translations')
    .upsert(row, { onConflict: 'artifact_id,language_code' });

  if (error) throw error;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION 1 — translateAllLanguages
// ─────────────────────────────────────────────────────────────────────────────

export async function translateAllLanguages(
  sourceName: string,
  sourceDesc: string,
  onStep?: (msg: string) => void,
  email?: string,
): Promise<TranslationResult> {
  if (!sourceName.trim()) throw new Error('Source name is empty.');
  if (!sourceDesc.trim()) throw new Error('Source description is empty.');

  function chunkText(text: string, maxLen = 300): string[] {
    if (text.length <= maxLen) return [text];
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      let end = start + maxLen;
      if (end < text.length) {
        const lastSpace = text.lastIndexOf(' ', end);
        if (lastSpace > start) end = lastSpace;
      }
      chunks.push(text.slice(start, end).trim());
      start = end;
    }
    return chunks;
  }

  async function translateWithGoogle(text: string, targetCode: string): Promise<string> {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetCode}&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data?.[0]?.map((p: any) => p[0]).join('') || text;
    } catch {
      return text;
    }
  }

  async function translateWithMyMemory(text: string, mmCode: string): Promise<string> {
    try {
      const emailParam = email ? `&de=${encodeURIComponent(email)}` : '';
      const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${mmCode}${emailParam}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.responseStatus !== 200 && json.responseStatus !== '200') throw new Error(json.responseDetails);
      return ((json.responseData?.translatedText as string) ?? text).replace(/\[[^\]]+\]$/, '').trim();
    } catch {
      return text;
    }
  }

  async function translateFull(text: string, lang: typeof LANG_CONFIG[number]): Promise<string> {
    const chunks = chunkText(text);
    const translated = await Promise.all(
      chunks.map(async chunk => {
        const g = await translateWithGoogle(chunk, lang.googleCode);
        return g !== chunk ? g : translateWithMyMemory(chunk, lang.mmCode);
      })
    );
    return translated.join(' ');
  }

  const result: TranslationResult = {
    en:  { name: sourceName, description: sourceDesc },
    fil: { name: sourceName, description: sourceDesc },
    ja:  { name: sourceName, description: sourceDesc },
    es:  { name: sourceName, description: sourceDesc },
    ko:  { name: sourceName, description: sourceDesc },
  };

  for (const lang of LANG_CONFIG.filter(l => l.code !== 'en')) {
    onStep?.(`Translating ${lang.label}…`);
    const [name, description] = await Promise.all([
      translateFull(sourceName, lang),
      translateFull(sourceDesc, lang),
    ]);
    result[lang.code] = { name, description };
  }

  onStep?.('Translation complete ✓');
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION 2 — saveAudioToSupabase
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAudioToSupabase(
  artifactId: string,
  _audioBlob: Blob,
  langCode: LangCode,
  _extension = 'mp3',
  onStep?: (msg: string) => void,
): Promise<AudioUploadResult> {
  const lang = LANG_CONFIG.find(l => l.code === langCode);
  if (!lang) throw new Error(`Unknown language code: ${langCode}`);

  onStep?.(`Saving ${lang.label} audio reference…`);
  const audioMarker = `tts://${langCode}/${encodeURIComponent(artifactId)}`;
  await upsertTranslation(artifactId, langCode, { audio_url: audioMarker });
  onStep?.(`${lang.label} audio reference saved ✓`);
  return { lang: langCode, url: audioMarker };
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION 3 — generateAndSaveAllAudio
// ─────────────────────────────────────────────────────────────────────────────

export async function generateAndSaveAllAudio(
  artifactId: string,
  descriptions: Partial<Record<LangCode, string>>,
  onStep?: (msg: string) => void,
): Promise<AudioUploadResult[]> {
  const results: AudioUploadResult[] = [];

  for (const lang of LANG_CONFIG) {
    const text = descriptions[lang.code];
    if (!text?.trim()) continue;
    try {
      const audioMarker = `tts://${lang.code}/${encodeURIComponent(artifactId)}`;
      await upsertTranslation(artifactId, lang.code, { audio_url: audioMarker });
      results.push({ lang: lang.code, url: audioMarker });
      onStep?.(`✓ ${lang.label} audio ready`);
    } catch (err: any) {
      console.warn(`[generateAndSaveAllAudio] ${lang.label} skipped:`, err.message);
    }
  }

  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION 4 — saveAudioDirect
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAudioDirect(
  artifactId: string,
  audioUrl: string,
  langCode: LangCode,
  onStep?: (msg: string) => void,
): Promise<AudioUploadResult> {
  const lang = LANG_CONFIG.find(l => l.code === langCode);
  if (!lang) throw new Error(`Unknown language code: ${langCode}`);

  onStep?.(`Saving ${lang.label} audio URL…`);
  await upsertTranslation(artifactId, langCode, { audio_url: audioUrl });
  onStep?.(`${lang.label} audio URL saved ✓`);
  return { lang: langCode, url: audioUrl };
}

// ─────────────────────────────────────────────────────────────────────────────
//  FUNCTION 5 — saveAllTranslations
//  Call after translateAllLanguages to persist names + descriptions to DB
// ─────────────────────────────────────────────────────────────────────────────

export async function saveAllTranslations(
  artifactId: string,
  translations: TranslationResult,
  onStep?: (msg: string) => void,
): Promise<void> {
  for (const lang of LANG_CONFIG) {
    const t = translations[lang.code];
    if (!t) continue;
    onStep?.(`Saving ${lang.label} translation…`);
    await upsertTranslation(artifactId, lang.code, { name: t.name, description: t.description });
  }
  onStep?.('All translations saved ✓');
}
