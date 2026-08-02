import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Modal, ScrollView, Image,
  Dimensions, Platform, StatusBar, FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { STORAGE_KEYS, toggleInStringArray, getStringArray } from '../../utils/storage';
import { useAppTheme } from '../../context/ThemeContext';
import { THEMES } from '../../constants/themes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── SACRED HERITAGE THEME TOKENS ──────────────────────────────────────────────
function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg, surface: t.surface,
    ink: t.ink, inkMid: t.inkMid, inkLight: t.inkDim,
    gold: t.gold, goldWarm: t.goldBright, goldSoft: t.goldSoft,
    goldLight: t.goldGlow,
    border: t.border, borderGold: t.borderGold,
    error: t.crimson, success: t.teal,
    overlay: 'rgba(30,27,23,0.75)',
    vignette: 'rgba(30,27,23,0.35)',
  };
}
let C = buildC(THEMES.light);
let sf = getSfStyles(C);
let ams = getAmsStyles(C);
function getStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 32,
  },

  // ── Header with Collection Icon ──
  headerSafe: {
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 9.5,
    letterSpacing: 3.5,
    color: C.gold,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.8,
  },
  goldLine: {
    width: 40,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginTop: 8,
  },
  
  // Collection Icon Button
  collectionIconBtn: {
    marginTop: 4,
  },
  collectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderGold,
    position: 'relative',
  },
  collectionBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.gold,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: C.bg,
  },
  collectionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.ink,
  },

  // ── Camera Container ──
  cameraContainer: {
    height: SCREEN_HEIGHT * 0.45,
    marginHorizontal: 20,
    marginVertical: 12,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: C.ink,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 8,
  },
  cameraWrap: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  vignetteTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: C.vignette,
  },
  vignetteBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '20%',
    backgroundColor: C.vignette,
  },
  vignetteLeft: {
    position: 'absolute',
    top: '20%',
    left: 0,
    width: '12%',
    height: '60%',
    backgroundColor: C.vignette,
  },
  vignetteRight: {
    position: 'absolute',
    top: '20%',
    right: 0,
    width: '12%',
    height: '60%',
    backgroundColor: C.vignette,
  },
  frameContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanHintOverlay: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  scanHintText: {
    backgroundColor: 'rgba(30,27,23,0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 12,
    color: C.gold,
    fontWeight: '600',
    letterSpacing: 0.5,
    borderWidth: 1,
    borderColor: C.borderGold,
  },

  // ── Torch Button ──
  torchBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(30,27,23,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  torchBtnActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },

  // ── Toast ──
  toast: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 50,
    shadowColor: C.ink,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Post-Scan View ──
  postScanBg: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // ── Status Area ──
  statusSafe: {
    backgroundColor: C.bg,
  },
  statusArea: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
    minHeight: 100,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusTxt: {
    fontSize: 14,
    color: C.inkMid,
    fontWeight: '500',
  },

  // ── Error ──
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.goldSoft,
    borderWidth: 1.5,
    borderColor: C.borderGold,
    borderRadius: 16,
    padding: 14,
  },
  errorIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconTxt: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  errorTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.error,
    marginBottom: 2,
  },
  errorSub: {
    fontSize: 12,
    color: C.inkMid,
  },
  errorAutoReset: {
    fontSize: 11,
    color: C.inkLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  retryBtn: {
    backgroundColor: C.ink,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  retryBtnTxt: {
    fontSize: 13,
    color: '#FFF',
    fontWeight: '700',
  },

  // ── Hint ──
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  hintIco: {
    fontSize: 18,
    color: C.gold,
    marginTop: 1,
  },
  hintTxt: {
    flex: 1,
    fontSize: 14,
    color: C.inkMid,
    lineHeight: 22,
  },

  // ── Permission Screen ──
  permIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  permTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  permSub: {
    fontSize: 15,
    color: C.inkMid,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  permBtn: {
    backgroundColor: C.ink,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 50,
    width: '100%',
    alignItems: 'center',
  },
  permBtnTxt: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
}

let styles = getStyles(C);

type ArtifactTranslation = {
  language_code: string;
  name: string;
  description: string | null;
  audio_url: string | null;
};

type Artifact = {
  id: string;
  name: string;
  category: string;
  qr_code: string;
  qr_value: string;
  created_at: string;
  description?: string;
  image_url?: string;
  creator?: string;
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Liturgical Books':   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
};

// ─── Corner Frame (with gold accent) ────────────────────────────────────────────
function ScanFrame({ pulse }: { pulse: Animated.Value }) {
  const corners = [
    { top: 0,    left: 0,    borderTopWidth: 2.5,    borderLeftWidth: 2.5  },
    { top: 0,    right: 0,   borderTopWidth: 2.5,    borderRightWidth: 2.5 },
    { bottom: 0, left: 0,    borderBottomWidth: 2.5, borderLeftWidth: 2.5  },
    { bottom: 0, right: 0,   borderBottomWidth: 2.5, borderRightWidth: 2.5 },
  ];

  const borderColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [C.gold, '#FFFFFF'],
  });

  return (
    <View style={sf.frame}>
      {corners.map((corner, i) => (
        <Animated.View key={i} style={[sf.corner, corner, { borderColor }]} />
      ))}
      <Animated.View
        style={[sf.scanLine, {
          opacity: pulse.interpolate({ inputRange: [0, 40/180, 45/180, 1], outputRange: [0, 0, 0.9, 0.9] }),
          transform: [{
            translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 220] }),
          }],
        }]}
      />
    </View>
  );
}

function getSfStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  frame:    { width: 240, height: 240, position: 'relative' },
  corner:   { position: 'absolute', width: 28, height: 28, borderColor: C.gold },
  scanLine: {
    position: 'absolute', left: 10, right: 10, height: 2,
    backgroundColor: C.gold, borderRadius: 1,
  },
});
}

// ─── Artifact Detail Modal (Sacred Heritage Styled) ─────────────────────────────
function ArtifactModal({
  artifact, onClose,
}: { artifact: Artifact | null; onClose: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const [playingLang, setPlayingLang] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [translations, setTranslations] = useState<ArtifactTranslation[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (artifact) {
      setupAudioModal();
      checkSaveAndFavorite();
      fetchTranslations(artifact.id);
      
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 100, friction: 10 }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [artifact]);

  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  async function setupAudioModal() {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: 'duckOthers'
      });
    } catch (e: any) {
      console.error('Error setting audio mode:', e.message);
    }
  }

  async function fetchTranslations(artifactId: string) {
    try {
      const { data, error } = await supabase
        .from('artifact_translations')
        .select('language_code, name, description, audio_url')
        .eq('artifact_id', artifactId);
      if (error) throw error;
      setTranslations(data || []);
      if (data && data.length > 0) setSelectedLanguage(data[0].language_code);
    } catch (e: any) {
      console.error('Error fetching translations:', e.message);
      setTranslations([]);
    }
  }

  async function checkSaveAndFavorite() {
    if (!artifact) return;
    const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
    setIsSaved(saved.includes(artifact.id));
  }

  async function toggleSave() {
    if (!artifact) return;
    const updated = await toggleInStringArray(STORAGE_KEYS.savedArtifacts, artifact.id);
    setIsSaved(updated.includes(artifact.id));
  }

  function getDescriptionByLanguage(lang: string): string {
    const t = translations.find(t => t.language_code === lang);
    return t?.description || artifact?.description || `This sacred artifact is part of the Sacred Heritage Collection, preserved as a testament to centuries of liturgical tradition and craftsmanship.`;
  }

  async function playAudio(audioUrl: string, lang: string) {
    try {
      await stopAudio();
      setPlayingLang(lang);
      
      const player = createAudioPlayer({ uri: audioUrl }) as any;
      playerRef.current = player;

      const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          handleAudioFinished();
        }
      });
      playbackSubscriptionRef.current = subscription;

      player.play();
    } catch (e: any) {
      console.error('Error playing audio:', e.message);
      setPlayingLang(null);
    }
  }

  async function stopAudio() {
    try {
      if (playerRef.current) {
        await playerRef.current.pause();
        playbackSubscriptionRef.current?.remove();
        playbackSubscriptionRef.current = null;
        playerRef.current.remove?.();
        playerRef.current = null;
      }
      setPlayingLang(null);
    } catch (e: any) {
      console.error('Error stopping audio:', e.message);
    }
  }

  function handleAudioFinished() {
    setPlayingLang(null);
    playbackSubscriptionRef.current?.remove();
    playbackSubscriptionRef.current = null;
    playerRef.current?.remove?.();
    playerRef.current = null;
  }

  const handleClose = () => {
    stopAudio();
    Animated.parallel([
      Animated.timing(scaleAnim, { toValue: 0.95, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setSelectedLanguage('en');
      setTranslations([]);
      onClose();
    });
  };

  if (!artifact) return null;

  const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category]
    ?? 'https://via.placeholder.com/600?text=Artifact';
  
  const langMeta: Record<string, { label: string; flag: string }> = {
    en:  { label: 'English',  flag: '🇺🇸' },
    fil: { label: 'Filipino', flag: '🇵🇭' },
    ja:  { label: 'Japanese', flag: '🇯🇵' },
    es:  { label: 'Spanish',  flag: '🇪🇸' },
    ko:  { label: 'Korean',   flag: '🇰🇷' },
  };
  // All translations for language/description switching
  const availableLangs = translations.filter(t => t.description || t.audio_url);
  // Only those with audio for the player
  const availableAudio = translations.filter(t => t.audio_url);

  return (
    <Modal
      transparent
      animationType="none"
      visible={!!artifact}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={ams.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1}>
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, backgroundColor: C.overlay }]} />
        </TouchableOpacity>

        <Animated.View style={[
          ams.modal,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
          {/* Close button - Gold ring style */}
          <TouchableOpacity style={ams.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <View style={ams.closeBtnCircle}>
              <Ionicons name="close" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Image Section */}
            <View style={ams.imageSection}>
              <Image source={{ uri: imgUrl }} style={ams.image} resizeMode="cover" />
              <View style={ams.categoryPill}>
                <Text style={ams.categoryPillText}>{artifact.category}</Text>
              </View>
            </View>

            {/* Content Section */}
            <View style={ams.content}>
              <View style={ams.goldAccent} />
              <Text style={ams.name}>{artifact.name}</Text>
              <Text style={ams.period}>
                Circa {new Date(artifact.created_at).getFullYear()}
              </Text>

              <View style={ams.section}>
                <Text style={ams.sectionLabel}>ABOUT THIS PIECE</Text>
                <Text style={ams.description}>
                  {getDescriptionByLanguage(selectedLanguage)}
                </Text>
              </View>

              {/* Language Selection & Audio Controls */}
              {availableLangs.length > 1 && (
                <View style={ams.section}>
                  <Text style={ams.sectionLabel}>LANGUAGE</Text>

                  {/* Language Tabs — switch description + audio */}
                  <View style={ams.audioLangTabs}>
                    {availableLangs.map(t => {
                      const meta = langMeta[t.language_code] || { label: t.language_code.toUpperCase(), flag: '🌐' };
                      return (
                        <TouchableOpacity
                          key={t.language_code}
                          style={[ams.audioLangTab, selectedLanguage === t.language_code && ams.audioLangTabActive]}
                          onPress={() => { setSelectedLanguage(t.language_code); stopAudio(); }}
                          activeOpacity={0.7}
                        >
                          <Text style={ams.audioLangTabFlag}>{meta.flag}</Text>
                          <Text style={[ams.audioLangTabText, selectedLanguage === t.language_code && ams.audioLangTabTextActive]}>
                            {meta.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Audio Player — only if selected lang has audio */}
                  {(() => {
                    const cur = availableAudio.find(t => t.language_code === selectedLanguage);
                    if (!cur?.audio_url) return null;
                    const meta = langMeta[cur.language_code] || { label: cur.language_code.toUpperCase(), flag: '🌐' };
                    return (
                      <TouchableOpacity
                        style={[ams.audioPlayButton, playingLang === cur.language_code && ams.audioPlayButtonActive]}
                        onPress={() => playingLang === cur.language_code ? stopAudio() : playAudio(cur.audio_url!, cur.language_code)}
                        activeOpacity={0.8}
                      >
                        <View style={[ams.audioPlayIcon, playingLang === cur.language_code && ams.audioPlayIconActive]}>
                          <Ionicons name={playingLang === cur.language_code ? 'pause' : 'play'} size={20} color={playingLang === cur.language_code ? C.ink : C.gold} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={ams.audioPlayLabel}>{playingLang === cur.language_code ? 'Now playing' : 'Tap to listen'}</Text>
                          <Text style={ams.audioPlaySub}>{meta.flag} {meta.label} narration</Text>
                        </View>
                        <Ionicons name={playingLang === cur.language_code ? 'volume-high' : 'volume-medium-outline'} size={20} color={playingLang === cur.language_code ? C.gold : C.inkLight} />
                      </TouchableOpacity>
                    );
                  })()}
                </View>
              )}

              {/* Save Button */}
              <View style={ams.actionButtonsRow}>
                <TouchableOpacity 
                  style={[ams.actionBtn, isSaved && ams.actionBtnGold]} 
                  onPress={toggleSave}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isSaved ? 'bookmark' : 'bookmark-outline'} 
                    size={18} 
                    color={isSaved ? C.gold : C.inkMid}
                  />
                  <Text style={[ams.actionBtnText, isSaved && ams.actionBtnTextGold]}>
                    {isSaved ? 'Saved' : 'Save'}
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={ams.doneBtn} onPress={handleClose} activeOpacity={0.85}>
                <Text style={ams.doneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function getAmsStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    width: '100%',
    maxWidth: 420,
    maxHeight: SCREEN_HEIGHT * 0.85,
    backgroundColor: C.surface,
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: C.ink,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 28,
    elevation: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  closeBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30,27,23,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  imageSection: {
    width: '100%',
    height: 280,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  categoryPill: {
    position: 'absolute',
    bottom: 16,
    left: 20,
    backgroundColor: 'rgba(30,27,23,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  categoryPillText: {
    fontSize: 9,
    letterSpacing: 2.5,
    color: C.gold,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  content: {
    padding: 24,
  },
  goldAccent: {
    width: 40,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginBottom: 16,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.8,
    marginBottom: 6,
  },
  period: {
    fontSize: 13,
    color: C.inkLight,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: C.inkMid,
    lineHeight: 24,
  },
  audioLangTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  audioLangTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 50,
    backgroundColor: C.goldLight,
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  audioLangTabActive: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
  },
  audioLangTabFlag: {
    fontSize: 12,
  },
  audioLangTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.inkMid,
  },
  audioLangTabTextActive: {
    color: C.gold,
  },
  audioPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 14,
  },
  audioPlayButtonActive: {
    borderColor: C.borderGold,
    backgroundColor: C.goldSoft,
  },
  audioPlayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  audioPlayIconActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  audioPlayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 2,
  },
  audioPlaySub: {
    fontSize: 11,
    color: C.inkLight,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  actionBtnGold: {
    borderColor: C.gold,
    backgroundColor: C.goldSoft,
  },
  actionBtnCrimson: {
    borderColor: C.error,
    backgroundColor: C.error,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMid,
  },
  actionBtnTextGold: {
    color: C.gold,
  },
  doneBtn: {
    backgroundColor: C.ink,
    borderRadius: 50,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: C.ink,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 4,
  },
  doneBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
}

// ─── Main QRScanner Component ──────────────────────────────────────────────────
export default function QRScanner({ setNavbarVisible }: { setNavbarVisible?: (v: boolean) => void }) {
  const { theme } = useAppTheme(); C = buildC(theme); sf = getSfStyles(C); ams = getAmsStyles(C); styles = getStyles(C);
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(true);
  const [torchOn, setTorchOn]           = useState(false);
  const [scanned, setScanned]           = useState(false);
  const [scanning, setScanning]         = useState(false);
  const [artifact, setArtifact]         = useState<Artifact | null>(null);
  const [scanError, setScanError]       = useState<string | null>(null);
  const [scannedArtifacts, setScannedArtifacts] = useState<Artifact[]>([]);
  const [toast, setToast]               = useState<string | null>(null);
  const toastTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pulse = useRef(new Animated.Value(0)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;

  // Hide navbar when modal is open
  useEffect(() => {
    setNavbarVisible?.(!artifact);
  }, [artifact]);

  // Load scanned artifacts from storage
  useEffect(() => {
    AsyncStorage.getItem('scannedArtifacts')
      .then(stored => stored && setScannedArtifacts(JSON.parse(stored)))
      .catch(() => {});
  }, []);

  // Pulse animation loop
  useEffect(() => {
    if (!cameraActive) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1500, useNativeDriver: false }),
        Animated.delay(200),
        Animated.timing(pulse, { toValue: 0, duration: 1500, useNativeDriver: false }),
        Animated.delay(200),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [cameraActive]);

  // Cleanup timers on unmount
  useEffect(() => () => {
    toastTimer.current && clearTimeout(toastTimer.current);
    errorTimer.current && clearTimeout(errorTimer.current);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const playScanSound = async () => {
    // Drop in a sound file at assets/sounds/scan_success.mp3 to enable audio feedback.
    // Using a try/catch ensures silence if the asset is missing or fails to load.
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'duckOthers' });
      // NOTE: Place scan_success.mp3 in assets/sounds/ and uncomment the line below.
      // const player = createAudioPlayer(require('../../../assets/sounds/scan_success.mp3')) as any;
      // player.play();
      // setTimeout(() => player.remove?.(), 3000);
    } catch (_) {}
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setScanning(true);
    setScanError(null);

    // Haptic + sound feedback immediately on detection
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    playScanSound();

    try {
      const { data: result, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('qr_value', data)
        .maybeSingle();

      if (error) throw error;
      if (!result) {
        setScanError('QR code not recognised. Make sure you\'re scanning an official Sacred Heritage QR tag.');
        // Auto-reset after 3 s
        errorTimer.current = setTimeout(() => startScanning(), 3000);
        return;
      }

      setCameraActive(false);
      setArtifact(result); // ← modal opens immediately

      // Persist to scan history
      setScannedArtifacts(prev => {
        if (prev.find(a => a.id === result.id)) return prev;
        const updated = [...prev, result];
        AsyncStorage.setItem('scannedArtifacts', JSON.stringify(updated)).catch(() => {});
        return updated;
      });
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setScanError(e.message ?? 'Something went wrong. Please try again.');
      errorTimer.current = setTimeout(() => startScanning(), 3000);
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setArtifact(null);
    setScanned(false);
    setScanError(null);
    setCameraActive(true);
    showToast('Ready to scan');
  };

  const startScanning = () => {
    errorTimer.current && clearTimeout(errorTimer.current);
    setScanned(false);
    setScanError(null);
    setCameraActive(true);
  };

  // ── Permission states ────────────────────────────────────────────────────────
  if (!permission) return (
    <SafeAreaView style={styles.centered}>
      <ActivityIndicator size="large" color={C.gold} />
    </SafeAreaView>
  );

  if (!permission.granted) return (
    <SafeAreaView style={styles.centered}>
      <View style={styles.permIconWrap}>
        <Ionicons name="camera-outline" size={48} color={C.gold} />
      </View>
      <Text style={styles.permTitle}>Camera Access Needed</Text>
      <Text style={styles.permSub}>Allow camera access to scan artifact QR codes and discover their sacred history</Text>
      <TouchableOpacity style={styles.permBtn} onPress={requestPermission} activeOpacity={0.85}>
        <Text style={styles.permBtnTxt}>Grant Permission</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  return (
    <View style={styles.container}>
      {/* ── Header ── */}
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.eyebrow}>✦ SACRED HERITAGE</Text>
            <Text style={styles.title}>QR Scanner</Text>
            <View style={styles.goldLine} />
          </View>
          {/* Scan history badge */}
          {scannedArtifacts.length > 0 && (
            <View style={styles.collectionIconCircle}>
              <Ionicons name="scan-outline" size={20} color={C.gold} />
              <View style={styles.collectionBadge}>
                <Text style={styles.collectionBadgeText}>{scannedArtifacts.length}</Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* ── Camera View (unmounted when modal is open) ── */}
      <View style={styles.cameraContainer}>
        {cameraActive ? (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              enableTorch={torchOn}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />

            {/* Dark vignette overlay */}
            <View style={styles.vignetteTop} />
            <View style={styles.vignetteBottom} />
            <View style={styles.vignetteLeft} />
            <View style={styles.vignetteRight} />

            {/* Scan frame centered */}
            <View style={styles.frameContainer}>
              <ScanFrame pulse={pulse} />
            </View>

            {/* Torch toggle */}
            <TouchableOpacity
              style={[styles.torchBtn, torchOn && styles.torchBtnActive]}
              onPress={() => setTorchOn(v => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name={torchOn ? 'flashlight' : 'flashlight-outline'} size={20} color={torchOn ? C.ink : C.gold} />
            </TouchableOpacity>

            {/* Scanning hint overlay */}
            <View style={styles.scanHintOverlay}>
              <Text style={styles.scanHintText}>Position QR code inside the gold frame</Text>
            </View>
          </View>
        ) : (
          /* Blank placeholder — camera is unmounted while modal is open */
          <View style={styles.postScanBg} />
        )}
      </View>

      {/* ── Status Area ── */}
      <SafeAreaView edges={['bottom']} style={styles.statusSafe}>
        <View style={styles.statusArea}>
          {scanning ? (
            <View style={styles.statusRow}>
              <ActivityIndicator size="small" color={C.gold} />
              <Text style={styles.statusTxt}>Looking up artifact…</Text>
            </View>
          ) : scanError ? (
            <View style={styles.errorBox}>
              <View style={styles.errorIcon}>
                <Text style={styles.errorIconTxt}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.errorTitle}>Not Recognised</Text>
                <Text style={styles.errorSub}>{scanError}</Text>
                <Text style={styles.errorAutoReset}>Retrying automatically…</Text>
              </View>
              <TouchableOpacity onPress={startScanning} style={styles.retryBtn} activeOpacity={0.85}>
                <Text style={styles.retryBtnTxt}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : cameraActive && !scanned ? (
            <View style={styles.hintBox}>
              <Text style={styles.hintIco}>◈</Text>
              <Text style={styles.hintTxt}>
                Point your camera at an artifact's QR code to reveal its sacred history and liturgical significance
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      {/* ── Toast ── */}
      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Ionicons name="checkmark-circle" size={16} color={C.gold} />
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {/* ─── Artifact Detail Modal (camera already unmounted above) ── */}
      <ArtifactModal artifact={artifact} onClose={reset} />
    </View>
  );
}

// ─── Styles (Sacred Heritage Theme) ────────────────────────────────────────────