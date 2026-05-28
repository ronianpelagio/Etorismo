import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Modal, ScrollView, Image,
  Dimensions, Platform, StatusBar, FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import CollectionPage from './CollectionPage';
import { STORAGE_KEYS, toggleInStringArray, getStringArray } from '../../utils/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── SACRED HERITAGE THEME TOKENS ──────────────────────────────────────────────
const C = {
  // Warm, creamy background (from HomeScreen)
  bg:       '#FFFCF8',  // Creamy off-white
  surface:  '#FFFFFF',
  
  // Text colors (warm neutrals)
  ink:      '#1E1B17',  // Deep warm black
  inkMid:   '#5C564B',  // Warm taupe
  inkLight: '#9B948A',  // Soft warm gray
  
  // Brand accent - Gold
  gold:     '#C7A84B',
  goldWarm: '#D4B86A',
  goldSoft: '#FDF8F0',
  goldLight: 'rgba(199,168,75,0.1)',
  
  // Borders and dividers
  border:   '#EAE5DF',
  borderGold: 'rgba(199,168,75,0.3)',
  
  // Status colors
  error:    '#E74C3C',  // Crimson (from HomeScreen)
  success:  '#2ECC71',  // Teal (from HomeScreen)
  
  // Overlays
  overlay:  'rgba(30,27,23,0.75)', // Ink color as overlay
  vignette: 'rgba(30,27,23,0.35)',
};

type Artifact = {
  id: string;
  name: string;
  category: string;
  qr_code: string;
  scanned_artifacts: string[];
  qr_value: string;
  created_at: string;
  description?: string;
  description_en?: string;
  description_fil?: string;
  description_ja?: string;
  description_es?: string;
  description_ko?: string;
  audio_en?: string;
  audio_fil?: string;
  audio_ja?: string;
  audio_es?: string;
  audio_ko?: string;
  image_url?: string;
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
            translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, 160] }),
          }],
        }]}
      />
    </View>
  );
}

const sf = StyleSheet.create({
  frame:    { width: 180, height: 180, position: 'relative' },
  corner:   { position: 'absolute', width: 24, height: 24, borderColor: C.gold },
  scanLine: {
    position: 'absolute', left: 10, right: 10, height: 2,
    backgroundColor: C.gold, borderRadius: 1,
  },
});

// ─── Artifact Detail Modal (Sacred Heritage Styled) ─────────────────────────────
function ArtifactModal({
  artifact, onClose,
}: { artifact: Artifact | null; onClose: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const [playingLang, setPlayingLang] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'fil' | 'ja' | 'es' | 'ko'>('en');
  const [isSaved, setIsSaved] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);

  const AUDIO_LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸', dbKey: 'audio_en' },
    { code: 'fil', label: 'Filipino', flag: '🇵🇭', dbKey: 'audio_fil' },
    { code: 'ja', label: 'Japanese', flag: '🇯🇵', dbKey: 'audio_ja' },
    { code: 'es', label: 'Spanish', flag: '🇪🇸', dbKey: 'audio_es' },
    { code: 'ko', label: 'Korean', flag: '🇰🇷', dbKey: 'audio_ko' },
  ];

  useEffect(() => {
    if (artifact) {
      setupAudioModal();
      checkSaveAndFavorite();
      
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

  async function checkSaveAndFavorite() {
    if (!artifact) return;
    const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
    const favorited = await getStringArray(STORAGE_KEYS.favoriteArtifacts);
    setIsSaved(saved.includes(artifact.id));
    setIsFavorited(favorited.includes(artifact.id));
  }

  async function toggleSave() {
    if (!artifact) return;
    const updated = await toggleInStringArray(STORAGE_KEYS.savedArtifacts, artifact.id);
    setIsSaved(updated.includes(artifact.id));
  }

  async function toggleFavorite() {
    if (!artifact) return;
    const updated = await toggleInStringArray(STORAGE_KEYS.favoriteArtifacts, artifact.id);
    setIsFavorited(updated.includes(artifact.id));
  }

  function getDescriptionByLanguage(lang: string): string {
    const art = artifact as any;
    switch (lang) {
      case 'fil':
        return art?.description_fil || art?.description_en || `Sacred artifact from the Sacred Heritage Collection.`;
      case 'ja':
        return art?.description_ja || art?.description_en || `神聖な遺産コレクションの聖遺物。`;
      case 'es':
        return art?.description_es || art?.description_en || `Artefacto sagrado de la Colección de Patrimonio Sagrado.`;
      case 'ko':
        return art?.description_ko || art?.description_en || `신성한 유산 컬렉션의 성물.`;
      case 'en':
      default:
        return art?.description_en || art?.description || `This sacred artifact is part of the Sacred Heritage Collection, preserved as a testament to centuries of liturgical tradition and craftsmanship.`;
    }
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
      onClose();
    });
  };

  if (!artifact) return null;

  const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category]
    ?? 'https://via.placeholder.com/600?text=Artifact';
  
  const art = artifact as any;
  const availableAudio = AUDIO_LANGUAGES.filter(lang => art[lang.dbKey]);

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
              {availableAudio.length > 0 && (
                <View style={ams.section}>
                  <Text style={ams.sectionLabel}>AUDIO GUIDE</Text>
                  
                  {/* Language Tabs - Gold themed */}
                  <View style={ams.audioLangTabs}>
                    {availableAudio.map(lang => (
                      <TouchableOpacity
                        key={lang.code}
                        style={[
                          ams.audioLangTab,
                          selectedLanguage === lang.code && ams.audioLangTabActive
                        ]}
                        onPress={() => {
                          setSelectedLanguage(lang.code as 'en' | 'fil' | 'ja' | 'es' | 'ko');
                          stopAudio();
                        }}
                        activeOpacity={0.7}
                      >
                        <Text style={ams.audioLangTabFlag}>{lang.flag}</Text>
                        <Text style={[
                          ams.audioLangTabText,
                          selectedLanguage === lang.code && ams.audioLangTabTextActive
                        ]}>
                          {lang.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Audio Player - Gold accent */}
                  {(() => {
                    const langObj = AUDIO_LANGUAGES.find(l => l.code === selectedLanguage);
                    return langObj && art[langObj.dbKey as keyof typeof art] ? (
                      <TouchableOpacity
                        style={[ams.audioPlayButton, playingLang === selectedLanguage && ams.audioPlayButtonActive]}
                        onPress={() => {
                          const lang = AUDIO_LANGUAGES.find(l => l.code === selectedLanguage);
                          if (lang) {
                            const audioUrl = art[lang.dbKey as keyof typeof art];
                            if (audioUrl) {
                              playingLang === selectedLanguage
                                ? stopAudio()
                                : playAudio(audioUrl as string, selectedLanguage);
                            }
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={[ams.audioPlayIcon, playingLang === selectedLanguage && ams.audioPlayIconActive]}>
                          <Ionicons
                            name={playingLang === selectedLanguage ? 'pause' : 'play'}
                            size={20}
                            color={playingLang === selectedLanguage ? C.ink : C.gold}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={ams.audioPlayLabel}>
                            {playingLang === selectedLanguage ? 'Now playing' : 'Tap to listen'}
                          </Text>
                          <Text style={ams.audioPlaySub}>
                            {langObj.flag} {langObj.label} narration
                          </Text>
                        </View>
                        <Ionicons
                          name={playingLang === selectedLanguage ? 'volume-high' : 'volume-medium-outline'}
                          size={20}
                          color={playingLang === selectedLanguage ? C.gold : C.inkLight}
                        />
                      </TouchableOpacity>
                    ) : null;
                  })()}
                </View>
              )}

              {/* Save & Favorite Buttons */}
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

                <TouchableOpacity 
                  style={[ams.actionBtn, isFavorited && ams.actionBtnCrimson]} 
                  onPress={toggleFavorite}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={isFavorited ? 'heart' : 'heart-outline'} 
                    size={18} 
                    color={isFavorited ? C.error : C.inkMid}
                  />
                  <Text style={[ams.actionBtnText, isFavorited && { color: '#fff' }]}>
                    {isFavorited ? 'Liked' : 'Like'}
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

const ams = StyleSheet.create({
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

// ─── Main QRScanner Component ──────────────────────────────────────────────────
export default function QRScanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraActive, setCameraActive] = useState(true);
  const [scanned, setScanned]           = useState(false);
  const [scanning, setScanning]         = useState(false);
  const [artifact, setArtifact]         = useState<Artifact | null>(null);
  const [scanError, setScanError]       = useState<string | null>(null);
  const [scannedArtifacts, setScannedArtifacts] = useState<Artifact[]>([]);
  const [showCollection, setShowCollection] = useState(false);
  const pulse = useRef(new Animated.Value(0)).current;

  // Load scanned artifacts from storage
  useEffect(() => {
    const loadScannedArtifacts = async () => {
      try {
        const stored = await AsyncStorage.getItem('scannedArtifacts');
        if (stored) {
          setScannedArtifacts(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading scanned artifacts:', error);
      }
    };
    loadScannedArtifacts();
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

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setScanning(true);
    setScanError(null);

    try {
      const { data: result, error } = await supabase
        .from('artifacts')
        .select('*')
        .eq('qr_value', data)
        .maybeSingle();

      if (error) throw error;
      if (!result) {
        setScanError('No artifact found for this QR code.');
        return;
      }
      
      setCameraActive(false);
      setArtifact(result);

      // Add to scanned artifacts collection
      const updatedArtifacts = [...scannedArtifacts];
      const existingIndex = updatedArtifacts.findIndex(a => a.id === result.id);
      if (existingIndex === -1) {
        updatedArtifacts.push(result);
        setScannedArtifacts(updatedArtifacts);
        await AsyncStorage.setItem('scannedArtifacts', JSON.stringify(updatedArtifacts));
      }
    } catch (e: any) {
      setScanError(e.message ?? 'Something went wrong.');
    } finally {
      setScanning(false);
    }
  };

  const reset = () => {
    setCameraActive(true);
    setScanned(false);
    setScanError(null);
    setArtifact(null);
  };

  const startScanning = () => {
    setScanned(false);
    setScanError(null);
    setCameraActive(true);
  };

  // ── Permission states ────────────────────────────────────────────────────────
  if (!permission) return (
    <SafeAreaView style={s.centered}>
      <ActivityIndicator size="large" color={C.gold} />
    </SafeAreaView>
  );

  if (!permission.granted) return (
    <SafeAreaView style={s.centered}>
      <View style={s.permIconWrap}>
        <Ionicons name="camera-outline" size={48} color={C.gold} />
      </View>
      <Text style={s.permTitle}>Camera Access Needed</Text>
      <Text style={s.permSub}>Allow camera access to scan artifact QR codes and discover their sacred history</Text>
      <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.85}>
        <Text style={s.permBtnTxt}>Grant Permission</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );

  // Show Collection Page if collection button was pressed
  if (showCollection) {
    return <CollectionPage onBack={() => setShowCollection(false)} />;
  }

  return (
    <View style={s.container}>
      {/* ── Header with Collection Icon ── */}
      <SafeAreaView edges={['top']} style={s.headerSafe}>
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.eyebrow}>✦ SACRED HERITAGE</Text>
            <Text style={s.title}>QR Scanner</Text>
            <View style={s.goldLine} />
          </View>
          
          {/* Collection Button - Icon with counter */}
          <TouchableOpacity 
            style={s.collectionIconBtn} 
            onPress={() => setShowCollection(true)}
            activeOpacity={0.7}
          >
            <View style={s.collectionIconCircle}>
              <Ionicons name="library-outline" size={22} color={C.gold} />
              {scannedArtifacts.length > 0 && (
                <View style={s.collectionBadge}>
                  <Text style={s.collectionBadgeText}>{scannedArtifacts.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* ── Camera / Post-Scan View ── */}
      <View style={s.cameraContainer}>
        {cameraActive ? (
          <View style={s.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            />

            {/* Dark vignette overlay */}
            <View style={s.vignetteTop} />
            <View style={s.vignetteBottom} />
            <View style={s.vignetteLeft} />
            <View style={s.vignetteRight} />

            {/* Scan frame centered */}
            <View style={s.frameContainer}>
              <ScanFrame pulse={pulse} />
            </View>
            
            {/* Scanning hint overlay */}
            <View style={s.scanHintOverlay}>
              <Text style={s.scanHintText}>Position QR code inside the gold frame</Text>
            </View>
          </View>
        ) : (
          /* Post-scan static background */
          <View style={s.postScanBg}>
            <View style={s.postScanContent}>
              {artifact && (
                <View style={s.postScanSuccess}>
                  <View style={s.postScanIconWrap}>
                    <Ionicons name="checkmark" size={32} color={C.success} />
                  </View>
                  <Text style={s.postScanTitle}>Artifact Identified</Text>
                  <Text style={s.postScanName}>{artifact.name}</Text>
                  <Text style={s.postScanCategory}>{artifact.category}</Text>
                </View>
              )}
              
              <TouchableOpacity
                style={s.clickToScanBtn}
                onPress={startScanning}
                activeOpacity={0.85}
              >
                <Text style={s.clickToScanBtnText}>Click to Scan</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* ── Status Area ── */}
      <SafeAreaView edges={['bottom']} style={s.statusSafe}>
        <View style={s.statusArea}>
          {scanning ? (
            <View style={s.statusRow}>
              <ActivityIndicator size="small" color={C.gold} />
              <Text style={s.statusTxt}>Looking up artifact…</Text>
            </View>
          ) : scanError ? (
            <View style={s.errorBox}>
              <View style={s.errorIcon}>
                <Text style={s.errorIconTxt}>!</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.errorTitle}>Not Found</Text>
                <Text style={s.errorSub}>{scanError}</Text>
              </View>
              <TouchableOpacity onPress={startScanning} style={s.retryBtn} activeOpacity={0.85}>
                <Text style={s.retryBtnTxt}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : cameraActive && !scanned ? (
            <View style={s.hintBox}>
              <Text style={s.hintIco}>◈</Text>
              <Text style={s.hintTxt}>
                Point your camera at an artifact's QR code to reveal its sacred history and liturgical significance
              </Text>
            </View>
          ) : null}
        </View>
      </SafeAreaView>

      {/* ─── Artifact Detail Modal ── */}
      <ArtifactModal artifact={artifact} onClose={reset} />
    </View>
  );
}

// ─── Styles (Sacred Heritage Theme) ────────────────────────────────────────────
const s = StyleSheet.create({
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

  // ── Post-Scan View ──
  postScanBg: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postScanContent: {
    width: '100%',
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 24,
  },
  postScanSuccess: {
    alignItems: 'center',
    gap: 10,
  },
  postScanIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: C.borderGold,
  },
  postScanTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: C.inkMid,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  postScanName: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  postScanCategory: {
    fontSize: 12,
    color: C.gold,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 1,
  },
  clickToScanBtn: {
    width: '100%',
    backgroundColor: C.ink,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: C.ink,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
    marginTop: 8,
  },
  clickToScanBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
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