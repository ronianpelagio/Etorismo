import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  FlatList, Image, StatusBar, Animated, Dimensions, ActivityIndicator,
  StyleSheet, Platform, TextInput, ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import { supabase } from '../../services/supabase';
import { STORAGE_KEYS, toggleInStringArray, getStringArray } from '../../utils/storage';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (SCREEN_WIDTH - 48 - CARD_GAP) / 2; // 24px padding each side + gap

// ─── Types ─────────────────────────────────────────────────────────────────────
type Artifact = {
  id: string;
  name: string;
  category: string;
  qr_code: string | null;
  created_at: string;
  date?: string;
  image_url?: string;
  is_exhibition?: boolean;
  is_crown?: boolean;
  is_artwork?: boolean;
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
  name_ja?: string;
  name_fil?: string;
  name_es?: string;
  name_ko?: string;
};

type AudioGuide = {
  id: string;
  artifact_id: string;
  artifact_name: string;
  audio_url: string;
  created_at: string;
};

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
};

type TabType = 'All' | 'Exhibition' | 'Artwork' | 'Crown';
const TABS: TabType[] = ['All', 'Exhibition', 'Artwork', 'Crown'];

// ─── Design Tokens ─────────────────────────────────────────────────────────────
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

// ─── Category Image Map ────────────────────────────────────────────────────────
const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Liturgical Books':   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
};

// ─── Welcome Toast ──────────────────────────────────────────────────────────────
function WelcomeToast({ name }: { name: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    const show = Animated.parallel([
      Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 10 }),
      Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]);

    const hide = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -20, duration: 400, useNativeDriver: true }),
    ]);

    Animated.sequence([show, Animated.delay(2200), hide]).start();
  }, []);

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.toastIcon}>
        <Ionicons name="star" size={14} color={C.gold} />
      </View>
      <Text style={styles.toastTxt} numberOfLines={1}>
        Welcome, <Text style={styles.toastName}>{name}</Text>
      </Text>
    </Animated.View>
  );
}

// ─── Artifact Card ──────────────────────────────────────────────────────────────
function ArtifactCard({ 
  item, 
  width, 
  onPress,
  isSaved,
  isFavorited,
}: { 
  item: Artifact; 
  width: number; 
  onPress: () => void;
  isSaved?: boolean;
  isFavorited?: boolean;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true, tension: 200, friction: 10 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 200, friction: 10 }).start();
  };

  return (
    <Animated.View style={{ width, transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.cardImageWrap}>
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.cardImage} 
            resizeMode="cover" 
          />
          <View style={styles.cardImageOverlay} />
          <View style={styles.cardBadge}>
            <Text style={styles.cardBadgeText}>{item.category}</Text>
          </View>
          {item.is_exhibition && (
            <View style={styles.cardStatusBadge}>
              <View style={styles.cardStatusDot} />
              <Text style={styles.cardStatusText}>Exhibition</Text>
            </View>
          )}
          {isSaved && (
            <View style={styles.cardSavedBadge}>
              <Ionicons name="bookmark" size={12} color={C.gold} />
              <Text style={styles.cardSavedText}>Saved</Text>
            </View>
          )}
          {isFavorited && (
            <View style={styles.cardFavoriteBadge}>
              <Ionicons name="heart" size={12} color="#E74C3C" />
              <Text style={styles.cardFavoriteText}>Liked</Text>
            </View>
          )}
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.cardDate}>{item.date}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Audio Player Item ─────────────────────────────────────────────────────────
function AudioGuideItem({
  guide,
  isPlaying,
  onToggle,
}: {
  guide: AudioGuide;
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.audioItem, isPlaying && styles.audioItemActive]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[styles.audioPlayBtn, isPlaying && styles.audioPlayBtnActive]}>
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={18}
          color={isPlaying ? C.ink : C.surface}
        />
      </View>
      <View style={styles.audioInfo}>
        <Text style={styles.audioName} numberOfLines={1}>{guide.artifact_name}</Text>
        <Text style={styles.audioStatus}>
          {isPlaying ? 'Now playing...' : 'Tap to play'}
        </Text>
      </View>
      <Ionicons
        name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
        size={20}
        color={isPlaying ? C.gold : C.inkLight}
      />
    </TouchableOpacity>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [audioGuides, setAudioGuides] = useState<AudioGuide[]>([]);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [playingLang, setPlayingLang] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ja' | 'fil' | 'es' | 'ko'>('en');
  const [editing, setEditing] = useState(false);
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [editedDescriptions, setEditedDescriptions] = useState<Record<string, string>>({});
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [savedArtifactIds, setSavedArtifactIds] = useState<string[]>([]);
  const [modalIsSaved, setModalIsSaved] = useState(false);
  const [modalIsFavorited, setModalIsFavorited] = useState(false);
  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);

  // Initialize
  useEffect(() => {
    setupAudio();
    fetchData();

    return () => {
      cleanupAudio();
    };
  }, []);

  useEffect(() => {
    if (selectedArtifact) {
      setEditedNames({
        en: selectedArtifact.name || '',
        ja: selectedArtifact.name_ja || '',
        fil: selectedArtifact.name_fil || '',
        es: selectedArtifact.name_es || '',
        ko: selectedArtifact.name_ko || '',
      });
      setEditedDescriptions({
        en: selectedArtifact.description || '',
        ja: selectedArtifact.description_ja || '',
        fil: selectedArtifact.description_fil || '',
        es: selectedArtifact.description_es || '',
        ko: selectedArtifact.description_ko || '',
      });
      setSelectedLanguage('en');
      setEditing(false);
      // Check save/favorite status
      setModalIsSaved(savedArtifactIds.includes(selectedArtifact.id));
      setModalIsFavorited(favoriteIds.includes(selectedArtifact.id));
    }
  }, [selectedArtifact, savedArtifactIds, favoriteIds]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const fav = await getStringArray(STORAGE_KEYS.favoriteArtifacts);
      const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
      if (mounted) {
        setFavoriteIds(fav);
        setSavedArtifactIds(saved);
        setFavoritesLoaded(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  async function setupAudio() {
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
        shouldPlayInBackground: false,
      });
    } catch (e: any) {
      console.error('Audio setup error:', e.message);
    }
  }

  function cleanupAudio() {
    if (playerRef.current) {
      playerRef.current.pause();
      playbackSubscriptionRef.current?.remove();
      playbackSubscriptionRef.current = null;
      playerRef.current.remove?.();
      playerRef.current = null;
    }
  }

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser) throw new Error('Please sign in to continue');

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, profile_picture')
        .eq('id', authUser.id)
        .single();
      if (userError) throw userError;
      setUser(userData);
      setShowToast(true);

      const { data: items, error: itemsError } = await supabase
        .from('artifacts')
        .select('id, name, category, qr_code, created_at, description, description_en, description_fil, description_ja, description_es, description_ko, audio_en, audio_fil, audio_ja, audio_es, audio_ko, image_url, name_ja, name_fil, name_es, name_ko')
        .order('created_at', { ascending: false });
      if (itemsError) throw itemsError;

      const enriched: Artifact[] = (items || []).map(item => ({
        ...item,
        date: formatYear(item.created_at),
        image_url: item.image_url || CATEGORY_IMAGES[item.category] || 'https://via.placeholder.com/600?text=Artifact',
        is_exhibition: item.category === 'Vestments' || item.category === 'Sacred Vessels',
        is_crown: item.name?.toLowerCase().includes('crown') || item.category === 'Altar Furnishings',
        is_artwork: item.category === 'Devotional Objects' || item.category === 'Sacramentals',
      }));
      setArtifacts(enriched);
    } catch (err: any) {
      setError(err.message || 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  }

  function formatYear(dateStr: string) {
    const year = new Date(dateStr).getFullYear();
    return isNaN(year) ? 'Unknown date' : `Circa ${year}`;
  }

  async function playAudio(audioUrl: string, lang: string) {
    try {
      cleanupAudio();
      setPlayingLang(lang);

      const player = createAudioPlayer({ uri: audioUrl }) as any;
      playerRef.current = player;

      const subscription = player.addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          setPlayingLang(null);
          subscription.remove();
          playbackSubscriptionRef.current = null;
          playerRef.current?.remove?.();
          playerRef.current = null;
        }
      });
      playbackSubscriptionRef.current = subscription;
      player.play();
    } catch (e: any) {
      console.error('Playback error:', e.message);
      setPlayingLang(null);
    }
  }

  function handleArtifactPress(item: Artifact) {
    setSelectedArtifact(item);
  }

  function handleModalClose() {
    cleanupAudio();
    setSelectedArtifact(null);
    setPlayingLang(null);
  }

  async function toggleModalSave() {
    if (!selectedArtifact) return;
    const updated = await toggleInStringArray(STORAGE_KEYS.savedArtifacts, selectedArtifact.id);
    setSavedArtifactIds(updated);
    setModalIsSaved(updated.includes(selectedArtifact.id));
  }

  async function toggleModalFavorite() {
    if (!selectedArtifact) return;
    const updated = await toggleInStringArray(STORAGE_KEYS.favoriteArtifacts, selectedArtifact.id);
    setFavoriteIds(updated);
    setModalIsFavorited(updated.includes(selectedArtifact.id));
  }

  async function saveArtifact() {
    if (!selectedArtifact) return;
    try {
      const updateData: any = {
        name: editedNames.en,
        name_ja: editedNames.ja,
        name_fil: editedNames.fil,
        name_es: editedNames.es,
        name_ko: editedNames.ko,
        description: editedDescriptions.en,
        description_ja: editedDescriptions.ja,
        description_fil: editedDescriptions.fil,
        description_es: editedDescriptions.es,
        description_ko: editedDescriptions.ko,
      };
      const { error } = await supabase
        .from('artifacts')
        .update(updateData)
        .eq('id', selectedArtifact.id);
      if (error) throw error;
      // Update local state
      setSelectedArtifact({ ...selectedArtifact, ...updateData });
      setEditing(false);
      // Optionally refetch artifacts
      fetchData();
    } catch (error) {
      console.error('Save error:', error);
      // Handle error, maybe show toast
    }
  }

  async function translateText(text: string, from: string, to: string): Promise<string> {
    try {
      const response = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: from, target: to }),
      });
      const data = await response.json();
      return data.translatedText || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  // Filter artifacts
  const filteredArtifacts = (() => {
    let list = [...artifacts];
    
    if (activeTab === 'Exhibition') list = list.filter(i => i.is_exhibition);
    else if (activeTab === 'Artwork') list = list.filter(i => i.is_artwork);
    else if (activeTab === 'Crown') list = list.filter(i => i.is_crown);
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.category.toLowerCase().includes(q)
      );
    }
    
    return list;
  })();

  const fullName = user ? `${user.first_name} ${user.last_name}` : 'Guest';
  const firstName = user?.first_name || 'Explorer';

  // ── Loading State ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={styles.loadingText}>Curating the collection...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error State ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.errorContainer}>

          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={48} color={C.error} />
          </View>
          <Text style={styles.errorTitle}>Unable to Load</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.errorRetryBtn} onPress={fetchData} activeOpacity={0.85}>
            <Ionicons name="refresh" size={18} color={C.surface} style={{ marginRight: 8 }} />
            <Text style={styles.errorRetryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isFavorite = (id: string) => favoriteIds.includes(id);

  const toggleFavorite = async (id: string) => {
    const updated = await toggleInStringArray(STORAGE_KEYS.favoriteArtifacts, id);
    setFavoriteIds(updated);
  };

  // ── Main Render ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>

      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Welcome Toast */}
      {showToast && (
        <View style={styles.toastWrapper} pointerEvents="none">
          <WelcomeToast name={firstName} />
        </View>
      )}

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <ImageBackground 
          source={require('../../assets/Signin.jpg')} 
          style={styles.header}
          imageStyle={styles.headerBackgroundImage}
        >
          <View style={styles.headerOverlay} />
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.headerEyebrow}>— Sacred Heritage</Text>
              <Text style={styles.headerDate}>
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </Text>
            </View>
            <TouchableOpacity style={styles.avatarBtn}>
              {user?.profile_picture ? (
                <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>
                    {firstName.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
          {/* Hero */}
          <View style={styles.hero}>
            <Text style={styles.heroTitle}>
              Explore{'\n'}Sacred Art
            </Text>
            <View style={styles.heroDivider} />
            <Text style={styles.heroSub}>
              Vestments • Vessels • Devotional Objects
            </Text>
          </View>
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={C.inkLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search artifacts, categories..."
            placeholderTextColor={C.inkLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={C.inkLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>
        </ImageBackground>
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab}
                </Text>
                {activeTab === tab && <View style={styles.tabIndicator} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {activeTab === 'All' ? 'Collection' : activeTab}
          </Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredArtifacts.length}</Text>
          </View>
        </View>

        {/* Artifact Grid */}
        {filteredArtifacts.length > 0 ? (
          <FlatList
            data={filteredArtifacts}
            renderItem={({ item }) => (
              <ArtifactCard
                item={item}
                width={CARD_WIDTH}
                onPress={() => handleArtifactPress(item)}
                isSaved={savedArtifactIds.includes(item.id)}
                isFavorited={favoriteIds.includes(item.id)}
              />
            )}
            keyExtractor={item => item.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="images-outline" size={48} color={C.inkLight} />
            <Text style={styles.emptyStateTitle}>No artifacts found</Text>
            <Text style={styles.emptyStateSub}>
              Try adjusting your search or filters
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Detail Modal */}
      {selectedArtifact && (
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop} 
            onPress={handleModalClose} 
            activeOpacity={1} 
          />
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={handleModalClose} activeOpacity={0.7}>
              <View style={styles.modalCloseCircle}>
                <Ionicons name="close" size={20} color={C.surface} />
              </View>
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {/* Image */}
              {selectedArtifact.image_url && (
                <View style={styles.modalImageWrap}>
                  <Image 
                    source={{ uri: selectedArtifact.image_url }} 
                    style={styles.modalImage} 
                    resizeMode="cover" 
                  />
                  <View style={styles.modalImageGradient} />
                  <View style={styles.modalCategoryPill}>
                    <Text style={styles.modalCategoryPillText}>
                      {selectedArtifact.category}
                    </Text>
                  </View>
                </View>
              )}

              <View style={styles.modalBody}>
                {/* Gold accent */}
                <View style={styles.modalAccent} />
                
                <Text style={styles.modalTitle}>{selectedArtifact.name}</Text>
                <Text style={styles.modalDate}>{selectedArtifact.date}</Text>

                {/* Description */}
                {(selectedArtifact.description || selectedArtifact.description_en) && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>About</Text>
                    <Text style={styles.modalDescription}>
                      {selectedArtifact.description || selectedArtifact.description_en}
                    </Text>
                  </View>
                )}

                {/* Audio Guide Section */}
                {(() => {
                  const audioLanguages = [
                    { code: 'en' as const, label: 'English', flag: '🇺🇸', dbKey: 'audio_en' },
                    { code: 'fil' as const, label: 'Filipino', flag: '🇵🇭', dbKey: 'audio_fil' },
                    { code: 'ja' as const, label: 'Japanese', flag: '🇯🇵', dbKey: 'audio_ja' },
                    { code: 'es' as const, label: 'Spanish', flag: '🇪🇸', dbKey: 'audio_es' },
                    { code: 'ko' as const, label: 'Korean', flag: '🇰🇷', dbKey: 'audio_ko' },
                  ];

                  const art = selectedArtifact as Record<string, any>;
                  const availableAudio = audioLanguages.filter(lang => art[lang.dbKey]);

                  if (availableAudio.length === 0) return null;

                  return (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>Audio Guide</Text>
                      
                      {/* Language Tabs */}
                      <View style={styles.audioLangTabs}>
                        {availableAudio.map(lang => (
                          <TouchableOpacity
                            key={lang.code}
                            style={[
                              styles.audioLangTab,
                              selectedLanguage === lang.code && styles.audioLangTabActive
                            ]}
                            onPress={() => {
                              setSelectedLanguage(lang.code);
                              if (playingLang) cleanupAudio();
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.audioLangTabText,
                              selectedLanguage === lang.code && styles.audioLangTabTextActive
                            ]}>
                              {lang.flag} {lang.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Audio Player */}
                      {(() => {
                        const langObj = audioLanguages.find(l => l.code === selectedLanguage);
                        if (!langObj) return null;
                        
                        const audioUrl = art[langObj.dbKey] as string | undefined;
                        if (!audioUrl) return null;

                        return (
                          <TouchableOpacity
                            style={styles.audioPlayButton}
                            onPress={() => {
                              const lang = audioLanguages.find(l => l.code === selectedLanguage);
                              if (lang) {
                                const url = art[lang.dbKey] as string;
                                playingLang === selectedLanguage
                                  ? cleanupAudio()
                                  : playAudio(url, selectedLanguage);
                              }
                            }}
                            activeOpacity={0.7}
                          >
                            <Ionicons
                              name={playingLang === selectedLanguage ? 'pause-circle' : 'play-circle'}
                              size={24}
                              color={C.gold}
                            />
                            <Text style={styles.audioPlayText}>
                              {playingLang === selectedLanguage ? 'Pause' : 'Play'} Audio
                            </Text>
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                  );
                })()}

                {/* Save & Favorite Buttons */}
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, modalIsSaved && styles.actionBtnActive]} 
                    onPress={toggleModalSave}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={modalIsSaved ? 'bookmark' : 'bookmark-outline'} 
                      size={20} 
                      color={modalIsSaved ? C.gold : C.inkMid}
                    />
                    <Text style={[styles.actionBtnText, modalIsSaved && styles.actionBtnTextActive]}>
                      {modalIsSaved ? 'Saved' : 'Save'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, modalIsFavorited && styles.actionBtnActive]} 
                    onPress={toggleModalFavorite}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={modalIsFavorited ? 'heart' : 'heart-outline'} 
                      size={20} 
                      color={modalIsFavorited ? C.error : C.inkMid}
                    />
                    <Text style={[styles.actionBtnText, modalIsFavorited && styles.actionBtnTextActive]}>
                      {modalIsFavorited ? 'Liked' : 'Like'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Info */}
                <View style={styles.modalInfo}>
                  <View style={styles.modalInfoRow}>
                    <Text style={styles.modalInfoLabel}>Added</Text>
                    <Text style={styles.modalInfoValue}>{selectedArtifact.date}</Text>
                  </View>
                  {selectedArtifact.qr_code && (
                    <View style={styles.modalInfoRow}>
                      <Text style={styles.modalInfoLabel}>QR Code</Text>
                      <View style={styles.qrBadge}>
                        <Ionicons name="qr-code-outline" size={14} color={C.gold} />
                        <Text style={styles.qrBadgeText}>Available</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scrollContent: { paddingBottom: 120 },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
    gap: 16,
  },
  loadingText: {
    fontSize: 14,
    color: C.inkMid,
    letterSpacing: 0.5,
  },
  // ── Error ──
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 40,
    gap: 12,
  },
  errorIconWrap: {
    marginBottom: 8,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
  },
  errorMessage: {
    fontSize: 14,
    color: C.inkMid,
    textAlign: 'center',
    lineHeight: 22,
  },
  errorRetryBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.ink,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  errorRetryText: {
    color: C.surface,
    fontSize: 15,
    fontWeight: '700',
  },

  // ── Toast ──
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 0, right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.ink,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  toastIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(201,168,76,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toastTxt: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  toastName: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  // ── Header ──
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headerBackgroundImage: {
    opacity: 0.35,
    resizeMode: 'cover',
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(247,244,239,0.7)',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerEyebrow: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: C.inkMid,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  headerDate: {
    fontSize: 13,
    color: C.inkLight,
    fontWeight: '500',
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: C.gold,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: C.goldSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '700',
    color: C.gold,
  },

  // ── Hero ──
  hero: {
    paddingTop: 28,
    paddingBottom: 24,
  },
  heroTitle: {
    fontSize: 44,
    fontWeight: '900',
    color: C.ink,
    lineHeight: 50,
    letterSpacing: -1.5,
  },
  heroDivider: {
    width: 44,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginTop: 18,
    marginBottom: 14,
  },
  heroSub: {
    fontSize: 13,
    color: C.inkMid,
    letterSpacing: 1.5,
    fontWeight: '500',
  },

  // ── Search ──
  searchWrap: {
    marginBottom: 4,
  },
 searchBar: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  backgroundColor: C.surface,
  borderWidth: 1,
  borderColor: C.border,
  borderRadius: 14,
  paddingHorizontal: 16,
  paddingVertical: 14,
},
searchInput: {
  flex: 1,
  fontSize: 15,
  color: C.ink,
  padding: 0, // Remove default padding on TextInput
},

  // ── Tabs ──
  tabsContainer: {
    marginTop: 20,
    paddingHorizontal: 24,
  },
  tabsScroll: {
    gap: 8,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    backgroundColor: C.ink,
    borderColor: C.ink,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.inkMid,
  },
  tabTextActive: {
    color: C.surface,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -8,
    width: 20,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
  },

  // ── Section Header ──
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: 28,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
  },
  countBadge: {
    backgroundColor: C.goldSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.gold,
  },

  // ── Grid ──
  grid: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  gridRow: {
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },

  // ── Card ──
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  cardImageWrap: {
    width: '100%',
    height: 160,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardImageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  cardBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(26,22,18,0.75)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.gold,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  cardStatusBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(46,204,113,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  cardStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.surface,
  },
  cardStatusText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.surface,
    letterSpacing: 0.5,
  },
  cardSavedBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(201,168,76,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardSavedText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.surface,
    letterSpacing: 0.3,
  },
  cardFavoriteBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(231,76,60,0.95)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardFavoriteText: {
    fontSize: 9,
    fontWeight: '700',
    color: C.surface,
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: 14,
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 20,
  },
  cardDate: {
    fontSize: 12,
    color: C.inkLight,
    fontWeight: '500',
  },

  // ── Empty State ──
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  emptyStateSub: {
    fontSize: 14,
    color: C.inkMid,
  },

  // ── Modal ──
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26,22,18,0.6)',
  },
  modalContent: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
  },
  modalCloseCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(26,22,18,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalImageWrap: {
    width: '100%',
    height: 300,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalImageGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  modalCategoryPill: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(26,22,18,0.8)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  modalCategoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  modalBody: {
    padding: 24,
  },
  modalAccent: {
    width: 40,
    height: 3,
    backgroundColor: C.gold,
    borderRadius: 2,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  modalDate: {
    fontSize: 13,
    color: C.inkLight,
    fontStyle: 'italic',
    marginBottom: 24,
  },
  modalSection: {
    marginBottom: 28,
  },
  modalSectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: C.gold,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 15,
    color: C.inkMid,
    lineHeight: 24,
  },

  // ── Audio ──
  audioLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  audioLoadingText: {
    fontSize: 14,
    color: C.inkMid,
  },
  audioLangTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  audioLangTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(201,168,76,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.3)',
  },
  audioLangTabActive: {
    backgroundColor: C.goldSoft,
    borderColor: C.gold,
  },
  audioLangTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.inkMid,
    textAlign: 'center',
  },
  audioLangTabTextActive: {
    color: C.ink,
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
  audioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  audioItemActive: {
    borderColor: C.gold,
    backgroundColor: C.goldSoft,
  },
  audioPlayBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: C.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioPlayBtnActive: {
    backgroundColor: C.gold,
  },
  audioInfo: {
    flex: 1,
    gap: 4,
  },
  audioName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  audioStatus: {
    fontSize: 12,
    color: C.inkMid,
    fontWeight: '500',
  },
  noAudioWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  noAudioText: {
    fontSize: 14,
    color: C.inkLight,
    fontStyle: 'italic',
  },

  // ── Action Buttons (Save/Favorite) ──
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    marginTop: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  actionBtnActive: {
    borderColor: C.gold,
    backgroundColor: C.goldSoft,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.inkMid,
  },
  actionBtnTextActive: {
    color: C.gold,
  },

  // ── Modal Info ──
  modalInfo: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 20,
    gap: 4,
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalInfoLabel: {
    fontSize: 14,
    color: C.inkMid,
    fontWeight: '600',
  },
  modalInfoValue: {
    fontSize: 14,
    color: C.ink,
    fontWeight: '700',
  },
  qrBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qrBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.gold,
  },
});