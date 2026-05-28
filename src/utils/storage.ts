import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  savedArtifacts: 'savedArtifacts',
  favoriteArtifacts: 'favoriteArtifacts',
  interestedEvents: 'interestedEvents',
} as const;

type Json = any;

function safeParseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function getStringArray(key: string): Promise<string[]> {
  const stored = await AsyncStorage.getItem(key);
  const parsed = safeParseJson<string[]>(stored);
  return Array.isArray(parsed) ? parsed : [];
}

export async function setStringArray(key: string, value: string[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(Array.from(new Set(value))));
}

export async function toggleInStringArray(key: string, item: string): Promise<string[]> {
  const existing = await getStringArray(key);
  const has = existing.includes(item);
  const updated = has ? existing.filter(x => x !== item) : [...existing, item];
  await setStringArray(key, updated);
  return updated;
}

