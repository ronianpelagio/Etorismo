import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  Animated,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:       '#F7F4EF',
  surface:  '#FFFFFF',
  ink:      '#1A1612',
  inkMid:   '#6B6459',
  inkLight: '#A89F96',
  gold:     '#C9A84C',
  goldSoft: '#F5EDD8',
  border:   '#EAE4DA',
  error:    '#C0392B',
  success:  '#2ECC71',
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
  description_es?: string;
  description_fil?: string;
  description_fr?: string;
  description_ja?: string;
  description_ko?: string;
  audio_en?: string;
  audio_fil?: string;
  audio_ja?: string;
  audio_es?: string;
  audio_ko?: string;
  image_url?: string;
  name_ja?: string;
  name_fil?: string;
  name_es?: string;
  name_ko?: string;
  creator?: string;
};

type AudioGuide = {
  id: string;
  artifact_id: string;
  language: string;
  audio_url: string;
  created_at: string;
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Liturgical Books':   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
  'Musical Instruments': 'https://images.unsplash.com/photo-1510915361-a1da77b45a6f?w=600',
  'Architectural and Decorative Elements': 'https://images.unsplash.com/photo-1595359910253-6c0e6b8a4440?w=600',
};

// ─── Artifact Detail Modal ─────────────────────────────────────────────────────
function ArtifactModal({
  artifact, onClose,
}: { artifact: Artifact | null; onClose: () => void }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const [audioGuides, setAudioGuides] = useState<AudioGuide[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'es' | 'fil' | 'ja' | 'ko'>('en');
  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (artifact) {
      setupAudioModal();
      fetchAudioGuides(artifact.id);
      
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

  async function fetchAudioGuides(artifactId: string) {
    setLoadingAudio(true);
    try {
      const { data, error: dbErr } = await supabase
        .from('audio_guides')
        .select('id, artifact_id, language, audio_url, created_at')
        .eq('artifact_id', artifactId)
        .order('language', { ascending: true });
      
      if (dbErr) throw dbErr;
      setAudioGuides(data || []);
      
      const firstGuide = data?.[0];
      if (firstGuide) {
        setSelectedLanguage(firstGuide.language as 'en' | 'es' | 'fil' | 'ja' | 'ko');
      }
    } catch (e: any) {
      console.error('Error fetching audio guides:', e.message);
      setAudioGuides([]);
    } finally {
      setLoadingAudio(false);
    }
  }

  function getDescriptionByLanguage(lang: string): string {
    switch (lang) {
      case 'es':
        return artifact?.description_es || artifact?.description || `Este ${artifact?.category?.toLowerCase()} forma parte de la Colección Sagrada del Patrimonio, preservada como testimonio de siglos de tradición litúrgica y artesanía.`;
      case 'fil':
        return artifact?.description_fil || artifact?.description || `Ang ${artifact?.category?.toLowerCase()} na ito ay bahagi ng Sacred Heritage Collection, pinapanatili bilang patunay ng mga siglong tradisyon at craftsmanship.`;
      case 'ja':
        return artifact?.description_ja || artifact?.description || `この${artifact?.category?.toLowerCase()}は神聖な遺産コレクションの一部であり、儀式の伝統と職人技術の証として保存されています。`;
      case 'ko':
        return artifact?.description_ko || artifact?.description || `이 ${artifact?.category?.toLowerCase()}는 신성한 유산 컬렉션의 일부이며 수백 년의 전례 전통과 장인정신의 증거로 보존됩니다.`;
      case 'en':
      default:
        return artifact?.description_en || artifact?.description || `This ${artifact?.category?.toLowerCase()} is part of the Sacred Heritage Collection, preserved as a testament to centuries of liturgical tradition and craftsmanship.`;
    }
  }

  async function playAudio(audioGuide: AudioGuide) {
    try {
      await stopAudio();
      setPlayingAudioId(audioGuide.id);
      
      const player = createAudioPlayer({ uri: audioGuide.audio_url }) as any;
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
      setPlayingAudioId(null);
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
      setPlayingAudioId(null);
    } catch (e: any) {
      console.error('Error stopping audio:', e.message);
    }
  }

  function handleAudioFinished() {
    setPlayingAudioId(null);
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
      setAudioGuides([]);
      setSelectedLanguage('en');
      onClose();
    });
  };

  if (!artifact) return null;

  const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category]
    ?? 'https://via.placeholder.com/600?text=Artifact';

  const currentLanguageGuides = audioGuides.filter(guide => guide.language === selectedLanguage);
  const availableLanguages = Array.from(new Set(audioGuides.map(guide => guide.language)));

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
          <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, backgroundColor: 'rgba(26,22,18,0.75)' }]} />
        </TouchableOpacity>

        <Animated.View style={[
          ams.modal,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
          {/* Close button */}
          <TouchableOpacity style={ams.closeBtn} onPress={handleClose} activeOpacity={0.7}>
            <View style={ams.closeBtnCircle}>
              <Text style={ams.closeBtnX}>✕</Text>
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
                <Text style={ams.sectionLabel}>About this artifact</Text>
                <Text style={ams.description}>
                  {getDescriptionByLanguage(selectedLanguage)}
                </Text>
              </View>

              {/* Audio Guide Section */}
              <View style={ams.audioGrid}>
                <View style={[ams.metaCard, ams.audioCard]}>
                  <View style={ams.audioHeader}>
                    <Ionicons name="volume-high-outline" size={20} color={C.gold} />
                    <Text style={ams.audioLabel}>Audio Guide</Text>
                  </View>
                  
                  {loadingAudio ? (
                    <View style={ams.audioLoading}>
                      <ActivityIndicator size="small" color={C.gold} />
                      <Text style={ams.audioLoadingText}>Loading…</Text>
                    </View>
                  ) : currentLanguageGuides.length > 0 ? (
                    <TouchableOpacity
                      style={ams.audioPlayButton}
                      onPress={() => {
                        const guide = currentLanguageGuides[0];
                        playingAudioId === guide.id ? stopAudio() : playAudio(guide);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={playingAudioId === currentLanguageGuides[0].id ? 'pause' : 'play'}
                        size={20}
                        color={C.gold}
                      />
                      <Text style={ams.audioPlayText}>
                        {playingAudioId === currentLanguageGuides[0].id ? 'Pause' : 'Play'}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={ams.noAudio}>
                      <Ionicons name="volume-mute-outline" size={20} color={C.inkLight} />
                      <Text style={ams.noAudioText}>No audio</Text>
                    </View>
                  )}
                </View>

                <View style={[ams.metaCard, ams.languageCard]}>
                  <Text style={ams.metaLabel}>Language</Text>
                  <FlatList
                    data={availableLanguages.length > 0 ? availableLanguages : ['en']}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item}
                    contentContainerStyle={ams.languageList}
                    renderItem={({ item: lang }) => (
                      <TouchableOpacity
                        style={[
                          ams.languageButton,
                          selectedLanguage === lang && ams.languageButtonActive
                        ]}
                        onPress={() => {
                          setSelectedLanguage(lang as 'en' | 'es' | 'fil' | 'ja' | 'ko');
                          stopAudio();
                        }}
                      >
                        <Text style={[
                          ams.languageButtonText,
                          selectedLanguage === lang && ams.languageButtonTextActive
                        ]}>
                          {lang.toUpperCase()}
                        </Text>
                      </TouchableOpacity>
                    )}
                  />
                </View>
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
    maxHeight: SCREEN_HEIGHT * 0.8,
    backgroundColor: C.surface,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 16,
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
    backgroundColor: 'rgba(26,22,18,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnX: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imageSection: {
    width: '100%',
    height: 240,
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
    backgroundColor: 'rgba(26,22,18,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  categoryPillText: {
    fontSize: 10,
    letterSpacing: 2,
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
    fontSize: 26,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  period: {
    fontSize: 13,
    color: C.inkLight,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: C.inkMid,
    lineHeight: 24,
  },
  audioGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  metaCard: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  audioCard: {
    flex: 2,
  },
  languageCard: {
    flex: 1,
  },
  audioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  audioLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  audioLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  audioLoadingText: {
    fontSize: 13,
    color: C.inkMid,
    fontWeight: '500',
  },
  audioPlayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  audioPlayText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.gold,
  },
  noAudio: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    opacity: 0.6,
  },
  noAudioText: {
    fontSize: 13,
    color: C.inkMid,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  languageList: {
    gap: 8,
  },
  languageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  languageButtonActive: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
  },
  languageButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.inkMid,
    textAlign: 'center',
  },
  languageButtonTextActive: {
    color: C.ink,
  },
  doneBtn: {
    backgroundColor: C.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: C.ink,
    shadowOpacity: 0.2,
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

// ─── Main Collection Page Component ─────────────────────────────────────────────
export default function CollectionPage({ onBack }: { onBack: () => void }) {
  const [allArtifacts, setAllArtifacts] = useState<Artifact[]>([]);
  const [scannedArtifactIds, setScannedArtifactIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);

  const allCategories = [
    'Sacred Vessels',
    'Liturgical Books',
    'Vestments',
    'Altar Furnishings',
    'Devotional Objects',
    'Sacramentals',
    'Musical Instruments',
    'Architectural and Decorative Elements',
  ];

  // Fetch all artifacts and scanned artifact IDs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all artifacts from Supabase
        const { data: artifacts, error: artifactsError } = await supabase
          .from('artifacts')
          .select('*')
          .order('category', { ascending: true });

        if (artifactsError) throw artifactsError;
        setAllArtifacts(artifacts || []);

        // Load scanned artifact IDs from AsyncStorage
        const stored = await AsyncStorage.getItem('scannedArtifacts');
        if (stored) {
          const scannedArtifacts = JSON.parse(stored);
          setScannedArtifactIds(scannedArtifacts.map((a: Artifact) => a.id));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter artifacts by selected category
  const filteredArtifacts = selectedCategory
    ? allArtifacts.filter(a => a.category === selectedCategory)
    : allArtifacts;

  // Check if artifact is scanned
  const isScanned = (artifactId: string) => scannedArtifactIds.includes(artifactId);

  // Render locked artifact (unscanned)
  const renderLockedArtifact = (artifact: Artifact) => {
    const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category]
      ?? 'https://via.placeholder.com/100?text=Artifact';

    return (
      <View style={s.artifactCardLocked}>
        {/* Grayscale Image Container */}
        <View style={s.lockedImageWrapper}>
          <Image
            source={{ uri: imgUrl }}
            style={[s.artifactImage, s.grayscaleImage]}
            resizeMode="cover"
          />
          {/* Lock Icon Overlay */}
          <View style={s.lockOverlay}>
            <Ionicons name="lock-closed" size={24} color={C.surface} />
          </View>
        </View>

        {/* Info Section */}
        <View style={s.artifactInfoLocked}>
          <Text style={s.artifactNameLocked} numberOfLines={2}>{artifact.name}</Text>
          <Text style={s.artifactCategoryLocked}>{artifact.category}</Text>
          <Text style={s.lockedText}>Scan to unlock</Text>
        </View>
      </View>
    );
  };

  // Render unlocked artifact (scanned)
  const renderUnlockedArtifact = (artifact: Artifact) => {
    const imgUrl = artifact.image_url ?? CATEGORY_IMAGES[artifact.category]
      ?? 'https://via.placeholder.com/100?text=Artifact';

    return (
      <TouchableOpacity
        style={s.artifactCardUnlocked}
        onPress={() => setSelectedArtifact(artifact)}
        activeOpacity={0.7}
      >
        {/* Image Container */}
        <View style={s.unlockedImageWrapper}>
          <Image
            source={{ uri: imgUrl }}
            style={s.artifactImage}
            resizeMode="cover"
          />
        </View>

        {/* Info Section */}
        <View style={s.artifactInfoUnlocked}>
          <Text style={s.artifactNameUnlocked} numberOfLines={2}>{artifact.name}</Text>
          <Text style={s.artifactCategoryUnlocked}>{artifact.category}</Text>
          <View style={s.viewDetailsRow}>
            <Text style={s.viewDetailsText}>View details</Text>
            <Ionicons name="chevron-forward" size={16} color={C.gold} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={onBack} style={s.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <View style={s.headerContent}>
          <Text style={s.eyebrow}>— Collection</Text>
          <Text style={s.title}>My Artifacts</Text>
          <View style={s.goldLine} />
        </View>
      </View>

      {/* Category Filter (Horizontal Scroll) */}
      <View style={s.categorySection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.categoryList}
          scrollEventThrottle={16}
        >
          {/* All Categories Button */}
          <TouchableOpacity
            style={[
              s.categoryPill,
              selectedCategory === null && s.categoryPillActive,
            ]}
            onPress={() => setSelectedCategory(null)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                s.categoryPillText,
                selectedCategory === null && s.categoryPillTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          {/* Individual Category Pills */}
          {allCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                s.categoryPill,
                selectedCategory === category && s.categoryPillActive,
              ]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  s.categoryPillText,
                  selectedCategory === category && s.categoryPillTextActive,
                ]}
                numberOfLines={1}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Artifacts Grid/List (Mixed Layout) */}
      {filteredArtifacts.length === 0 ? (
        <View style={s.emptyContainer}>
          <Ionicons name="library-outline" size={48} color={C.inkLight} />
          <Text style={s.emptyText}>No artifacts in this category</Text>
        </View>
      ) : (
        <FlatList
          data={filteredArtifacts}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.artifactsList}
          renderItem={({ item }) =>
            isScanned(item.id)
              ? renderUnlockedArtifact(item)
              : renderLockedArtifact(item)
          }
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
        />
      )}

      {/* Artifact Detail Modal */}
      <ArtifactModal
        artifact={selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: C.inkMid,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  goldLine: {
    width: 32,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
  },

  // ── Category Filter ──
  categorySection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoryList: {
    paddingHorizontal: 24,
    gap: 10,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryPillActive: {
    backgroundColor: C.gold,
    borderColor: C.gold,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMid,
  },
  categoryPillTextActive: {
    color: C.surface,
  },

  // ── Artifacts List ──
  artifactsList: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },

  // ── Locked Artifact Card ──
  artifactCardLocked: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    opacity: 0.6,
  },
  lockedImageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  grayscaleImage: {
    opacity: 0.5,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26,22,18,0.3)',
  },
  artifactImage: {
    width: '100%',
    height: '100%',
  },
  artifactInfoLocked: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  artifactNameLocked: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 4,
  },
  artifactCategoryLocked: {
    fontSize: 12,
    color: C.inkLight,
    marginBottom: 6,
  },
  lockedText: {
    fontSize: 11,
    color: C.error,
    fontWeight: '500',
    fontStyle: 'italic',
  },

  // ── Unlocked Artifact Card ──
  artifactCardUnlocked: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  unlockedImageWrapper: {
    width: 100,
    height: 100,
    overflow: 'hidden',
  },
  artifactInfoUnlocked: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  artifactNameUnlocked: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 4,
  },
  artifactCategoryUnlocked: {
    fontSize: 12,
    color: C.gold,
    fontWeight: '500',
    marginBottom: 8,
  },
  viewDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 11,
    color: C.gold,
    fontWeight: '600',
  },

  // ── Empty State ──
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.inkMid,
    marginTop: 12,
    textAlign: 'center',
  },
});
