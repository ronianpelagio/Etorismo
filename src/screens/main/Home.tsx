import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  FlatList, Image, StatusBar, Animated, Dimensions,
  ActivityIndicator, StyleSheet, Platform, TextInput,
  ImageBackground, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import { supabase } from '../../services/supabase';
import { STORAGE_KEYS, toggleInStringArray, getStringArray } from '../../utils/storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

// ─── Types ──────────────────────────────────────────────────────────────────────
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

type Event = {
  id: string;
  title: string;
  event_datetime: string;
  description?: string;
  image_url?: string;
  created_at?: string;
};

type Announcement = {
  id: string;
  title: string;
  announcement_datetime: string;
  description?: string;
  image_url?: string;
  created_at?: string;
};

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture?: string;
};

type TabType = 'All' | 'Sacred Vessels' 
| 'Liturgical Books' | 'Vestments' 
| 'Altar Furnishings' | 'Devotional Objects' 
| 'Sacramentals' | 'Musical Instruments' 
| 'Architectural and Decorative Elements';
const TABS: TabType[] = [  'All', 'Sacred Vessels',
  'Liturgical Books',
  'Vestments',
  'Altar Furnishings',
  'Devotional Objects',
  'Sacramentals',
  'Musical Instruments',
  'Architectural and Decorative Elements',];

// ─── Light Theme Color Palette ─────────────────────────────────────────────────────
const C = {
  backgroundLight: '#FFFCF8',
  surfaceLight: '#FFFFFF',
  textPrimary: '#1E1B17',
  textSecondary: '#5C564B',
  textMuted: '#9B948A',
  accent: '#C7A84B',
  accentWarm: '#D4B86A',
  accentLight: '#FDF8F0',
  success: '#2ECC71',
  crimson: '#E74C3C',
  borderSubtle: '#EAE5DF',
  divider: '#F0EDE8',
  hoverLight: '#F5F2ED',
  shadowLight: '#1E1B17',
  overlay: 'rgba(0,0,0,0.03)',
  void: '#FFFCF8',
  ink: '#1E1B17',
  inkMid: '#5C564B',
  inkDim: '#9B948A',
  gold: '#C7A84B',
  borderGold: '#D4B86A',
  goldSoft: '#FDF8F0',
  raised: '#FFFFFF',
  surface: '#FFFFFF',
  border: '#EAE5DF',
  teal: '#2ECC71',
  deep: '#FFFFFF',
  over: '#F5F2ED',
};

const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Liturgical Books':   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
};

// ─── Date Formatters ────────────────────────────────────────────────────────────
function formatYear(dateStr: string) {
  const y = new Date(dateStr).getFullYear();
  return isNaN(y) ? 'Date unknown' : `c. ${y}`;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(date);
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatEventTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ─── Hooks ──────────────────────────────────────────────────────────────────────
function useFadeIn(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 600, delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0, duration: 600, delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return { opacity, transform: [{ translateY }] };
}

// ─── Welcome Toast ──────────────────────────────────────────────────────────────
function WelcomeToast({ name }: { name: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.88)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 90, friction: 10 }),
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 90, friction: 10 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 90, friction: 10 }),
      ]),
      Animated.delay(2400),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
        Animated.timing(translateY, { toValue: -12, duration: 500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.9, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View style={[styles.toast, { opacity, transform: [{ scale }, { translateY }] }]}>
      <View style={styles.toastDot} />
      <Text style={styles.toastText}>
        Welcome back, <Text style={styles.toastName}>{name}</Text>
      </Text>
    </Animated.View>
  );
}

// ─── Animated Counter ────────────────────────────────────────────────────────────
function CountBadge({ count }: { count: number }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 180, friction: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [count]);
  return (
    <Animated.View style={[styles.countBadge, { opacity, transform: [{ scale }] }]}>
      <Text style={styles.countBadgeText}>{count}</Text>
    </Animated.View>
  );
}

// ─── Artifact Card ──────────────────────────────────────────────────────────────
function ArtifactCard({
  item, width, onPress, isSaved, isFavorited, index,
}: {
  item: Artifact; width: number; onPress: () => void;
  isSaved?: boolean; isFavorited?: boolean; index: number;
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    const delay = (index % 2) * 60 + Math.floor(index / 2) * 80;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 500, delay,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0, duration: 500, delay,
        easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95, useNativeDriver: true, tension: 300, friction: 12,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1, useNativeDriver: true, tension: 300, friction: 12,
    }).start();
  };

  return (
    <Animated.View style={{
      width,
      opacity: fadeAnim,
      transform: [{ scale: scaleAnim }, { translateY: slideAnim }],
    }}>
      <TouchableOpacity
        style={styles.card}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: item.image_url }} style={styles.cardImage} resizeMode="cover" />
          <View style={styles.cardScrim} />

          <View style={styles.cardCatPill}>
            <Text style={styles.cardCatText}>{item.category.split(' ')[0].toUpperCase()}</Text>
          </View>

          <View style={styles.cardBottomRow}>
            {item.is_exhibition && (
              <View style={styles.cardLivePill}>
                <View style={styles.cardLiveDot} />
              </View>
            )}
            {isSaved && (
              <View style={[styles.cardMicroBadge, { backgroundColor: 'rgba(201,168,76,0.9)' }]}>
                <Ionicons name="bookmark" size={9} color="#fff" />
              </View>
            )}
            {isFavorited && (
              <View style={[styles.cardMicroBadge, { backgroundColor: 'rgba(192,57,43,0.9)' }]}>
                <Ionicons name="heart" size={9} color="#fff" />
              </View>
            )}
          </View>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.name}</Text>
          <View style={styles.cardMeta}>
            <View style={styles.cardAccentLine} />
            <Text style={styles.cardDate}>{item.date}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Compact Feed Card Component ────────────────────────────────────────────────
function CompactFeedCard({ item, type, onPress }: { 
  item: any; 
  type: 'announcement' | 'event';
  onPress: () => void;
}) {
  const rawDate = type === 'announcement' ? item.announcement_datetime : item.event_datetime;
  const date = new Date(rawDate);
  const timeAgo = getTimeAgo(date);
  const isEvent = type === 'event';
  const badgeColor = isEvent ? '#085041' : '#854F0B';
  const badgeBg = isEvent ? 'rgba(8,80,65,0.08)' : 'rgba(133,79,11,0.08)';

  return (
    <TouchableOpacity style={styles.feedCardCompact} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.feedCardCompactContent}>
        <View style={styles.feedCardCompactHeader}>
          <View style={[styles.feedCardCompactBadge, { backgroundColor: badgeBg }]}>
            <Ionicons name={isEvent ? 'calendar-outline' : 'megaphone-outline'} size={10} color={badgeColor} />
            <Text style={[styles.feedCardCompactBadgeText, { color: badgeColor }]}>
              {isEvent ? 'EVENT' : 'UPDATE'}
            </Text>
          </View>
          <Text style={styles.feedCardCompactDate}>{timeAgo}</Text>
        </View>
        
        <Text style={styles.feedCardCompactTitle} numberOfLines={2}>{item.title}</Text>
        
        {item.description && (
          <Text style={styles.feedCardCompactDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
        
        <View style={styles.feedCardCompactFooter}>
          <Ionicons name={isEvent ? 'time-outline' : 'chatbubble-outline'} size={10} color={C.inkDim} />
          <Text style={styles.feedCardCompactFooterText}>
            {isEvent ? formatEventTime(date) : 'Tap to read more'}
          </Text>
          <View style={styles.feedCardCompactDot} />
          <Text style={styles.feedCardCompactFooterText}>
            {formatDateShort(date)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Feed Card (used inside modal) ──────────────────────────────────────────────
function FeedCard({ item, type, isInterested, onToggleInterested }: {
  item: any;
  type: 'announcement' | 'event';
  isInterested?: boolean;
  onToggleInterested?: () => void;
}) {
  const rawDate = type === 'announcement'
    ? item.announcement_datetime
    : item.event_datetime;
  const date = new Date(rawDate);
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const day = date.getDate();
  const time = type === 'event'
    ? date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : null;

  return (
    <View style={styles.feedCard}>
      <View style={styles.feedDateBlock}>
        <Text style={styles.feedDateMonth}>{month}</Text>
        <Text style={styles.feedDateDay}>{day}</Text>
      </View>
      <View style={styles.feedDivider} />
      <View style={styles.feedContent}>
        <View style={styles.feedTopRow}>
          <View style={[styles.feedBadge, type === 'event' && styles.feedBadgeEvent]}>
            <Ionicons
              name={type === 'announcement' ? 'megaphone-outline' : 'calendar-outline'}
              size={10}
              color={type === 'announcement' ? '#854F0B' : '#085041'}
            />
            <Text style={[styles.feedBadgeText, { color: type === 'announcement' ? '#854F0B' : '#085041' }]}>
              {type === 'announcement' ? 'ANNOUNCEMENT' : 'EVENT'}
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.interestedBtn, isInterested && styles.interestedBtnActive]}
            onPress={onToggleInterested}
            activeOpacity={0.75}
          >
            <Ionicons 
              name={isInterested ? 'heart' : 'heart-outline'} 
              size={14} 
              color={isInterested ? '#E74C3C' : C.inkMid}
            />
            <Text style={[styles.interestedBtnText, isInterested && styles.interestedBtnTextActive]}>
              {isInterested ? 'Interested' : 'Interested'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.feedTitle}>{item.title}</Text>
        {item.description && (
          <Text style={styles.feedDesc} numberOfLines={3}>{item.description}</Text>
        )}
        <View style={styles.feedFooter}>
          {time && (
            <>
              <Text style={styles.feedFooterText}>{time}</Text>
              <View style={styles.feedFooterDot} />
            </>
          )}
          <Text style={styles.feedFooterText}>{formatDate(rawDate)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Tab Button ──────────────────────────────────────────────────────────────────
function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const bgAnim = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(bgAnim, {
      toValue: active ? 1 : 0, duration: 220,
      easing: Easing.out(Easing.quad), useNativeDriver: false,
    }).start();
  }, [active]);

  const backgroundColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.raised, C.gold],
  });

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <Animated.View style={[styles.tab, { backgroundColor }]}>
        <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Pulse Ring ──────────────────────────────────────────────────────────────────
function PulseRing() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(scale, { toValue: 1.8, duration: 1200, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
          Animated.timing(opacity, { toValue: 0, duration: 1200, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
        Animated.delay(400),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[styles.pulseRing, { opacity, transform: [{ scale }] }]} />
  );
}

// ─── Loading Dot ─────────────────────────────────────────────────────────────────
function LoadingDot({ delay }: { delay: number }) {
  const op = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(op, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0.2, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[styles.loadingDot, { opacity: op }]} />;
}
export default function HomeScreen({ setNavbarVisible }: { setNavbarVisible?: (visible: boolean) => void }) {
  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<Artifact | null>(null);
  const [playingLang, setPlayingLang] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'en' | 'ja' | 'fil' | 'es' | 'ko'>('en');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [savedArtifactIds, setSavedArtifactIds] = useState<string[]>([]);
  const [modalIsSaved, setModalIsSaved] = useState(false);
  const [modalIsFavorited, setModalIsFavorited] = useState(false);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);

  // Feed modal state
  const [showFeedModal, setShowFeedModal] = useState(false);
  const [feedModalTab, setFeedModalTab] = useState<'announcements' | 'events'>('announcements');
  const feedModalSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const feedModalOpacity = useRef(new Animated.Value(0)).current;

  const playerRef = useRef<any>(null);
  const playbackSubscriptionRef = useRef<any>(null);

  const modalSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setNavbarVisible?.(!selectedArtifact && !showFeedModal);
  }, [selectedArtifact, showFeedModal]);

  useEffect(() => {
    setupAudio();
    fetchData();
    loadStorage();
    return () => cleanupAudio();
  }, []);

  useEffect(() => {
    if (selectedArtifact) {
      setModalIsSaved(savedArtifactIds.includes(selectedArtifact.id));
      setModalIsFavorited(favoriteIds.includes(selectedArtifact.id));
      setSelectedLanguage('en');
      Animated.parallel([
        Animated.spring(modalSlide, {
          toValue: 0, useNativeDriver: true, tension: 65, friction: 12,
        }),
        Animated.timing(modalOpacity, {
          toValue: 1, duration: 300, useNativeDriver: true,
          easing: Easing.out(Easing.quad),
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalSlide, {
          toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true,
          easing: Easing.in(Easing.cubic),
        }),
        Animated.timing(modalOpacity, {
          toValue: 0, duration: 250, useNativeDriver: true,
        }),
      ]).start();
    }
  }, [selectedArtifact]);

  async function loadStorage() {
    const fav = await getStringArray(STORAGE_KEYS.favoriteArtifacts);
    const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
    const interested = await getStringArray(STORAGE_KEYS.interestedEvents);
    setFavoriteIds(fav);
    setSavedArtifactIds(saved);
    setInterestedIds(interested);
  }

  async function setupAudio() {
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
    } catch (e: any) { console.error('Audio setup:', e.message); }
  }

  function cleanupAudio() {
    // Stop any ongoing speech
    Speech.stop();
    
    if (playerRef.current) {
      playerRef.current.pause?.();
      playbackSubscriptionRef.current?.remove();
      playbackSubscriptionRef.current = null;
      playerRef.current.remove?.();
      playerRef.current = null;
    }
    setPlayingLang(null);
  }

  // Fixed playAudio function for React Native
  async function playAudio(audioUrl: string, lang: string, text?: string) {
    try {
      // Stop any currently playing audio/speech
      cleanupAudio();
      
      // Case 1: We have text and should use TTS (React Native)
      if (text && text.trim()) {
        setPlayingLang(lang);
        
        // Language mapping for expo-speech
        const langMap: Record<string, string> = {
          'en': 'en-US',
          'fil': 'fil-PH',
          'ja': 'ja-JP',
          'es': 'es-ES',
          'ko': 'ko-KR'
        };
        
        const options = {
          language: langMap[lang] || 'en-US',
          pitch: 1.0,
          rate: 0.9,
          onStart: () => {
            console.log('Speech started');
          },
          onDone: () => {
            console.log('Speech finished');
            setPlayingLang(null);
          },
          onError: (error: any) => {
            console.error('Speech error:', error);
            setPlayingLang(null);
            alert('Could not play audio');
          },
        };
        
        await Speech.speak(text, options);
        return;
      }
      
      // Case 2: We have a valid audio URL
      if (audioUrl && audioUrl !== 'No audio yet' && audioUrl !== 'null' && !audioUrl.startsWith('tts://')) {
        setPlayingLang(lang);
        const player = createAudioPlayer({ uri: audioUrl }) as any;
        playerRef.current = player;
        const sub = player.addListener('playbackStatusUpdate', (status: any) => {
          if (status.didJustFinish) {
            setPlayingLang(null);
            sub.remove();
            playerRef.current?.remove?.();
            playerRef.current = null;
          }
        });
        playbackSubscriptionRef.current = sub;
        await player.play();
        return;
      }
      
      // Case 3: No audio available
      alert('Audio Unavailable');
    } catch (e: any) {
      console.error('Playback error:', e.message);
      setPlayingLang(null);
      alert('Could not play audio. Please try again.');
    }
  }

  async function fetchData() {
    setLoading(true); setError(null);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!authUser) throw new Error('Please sign in to continue');

      const { data: userData, error: userError } = await supabase
        .from('users').select('id, first_name, last_name, email, profile_picture')
        .eq('id', authUser.id).single();
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
        image_url: item.image_url || CATEGORY_IMAGES[item.category] || 'https://via.placeholder.com/600',
        is_exhibition: item.category === 'Vestments' || item.category === 'Sacred Vessels',
        is_crown: item.name?.toLowerCase().includes('crown') || item.category === 'Altar Furnishings',
        is_artwork: item.category === 'Devotional Objects' || item.category === 'Sacramentals',
      }));
      setArtifacts(enriched);

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, title, event_datetime, description, image_url, created_at')
        .order('event_datetime', { ascending: false });
      if (!eventsError) setEvents(eventsData || []);

      const { data: announcementsData, error: announcementsError } = await supabase
        .from('announcements')
        .select('id, title, announcement_datetime, description, image_url, created_at')
        .order('announcement_datetime', { ascending: false });
      if (!announcementsError) setAnnouncements(announcementsData || []);

    } catch (err: any) {
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  function handleModalClose() {
    cleanupAudio();
    setSelectedArtifact(null);
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

  function openFeedModal(tab: 'announcements' | 'events') {
    setFeedModalTab(tab);
    setShowFeedModal(true);
    Animated.parallel([
      Animated.spring(feedModalSlide, {
        toValue: 0, useNativeDriver: true, tension: 65, friction: 12,
      }),
      Animated.timing(feedModalOpacity, {
        toValue: 1, duration: 300, useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }),
    ]).start();
  }

  function closeFeedModal() {
    Animated.parallel([
      Animated.timing(feedModalSlide, {
        toValue: SCREEN_HEIGHT, duration: 350, useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }),
      Animated.timing(feedModalOpacity, {
        toValue: 0, duration: 250, useNativeDriver: true,
      }),
    ]).start(() => setShowFeedModal(false));
  }

  // ─── FILTERING LOGIC ──────────────────────────────────────────────────────────
  const filteredArtifacts = (() => {
    let list = [...artifacts];
    
    if (activeTab !== 'All') {
      list = list.filter(item => item.category === activeTab);
    }
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(i => 
        i.name.toLowerCase().includes(q) || 
        i.category.toLowerCase().includes(q)
      );
    }
    
    return list;
  })();

  const firstName = user?.first_name || 'Explorer';

  // ─── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerScreen]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.void} />
        <View style={styles.loadingInner}>
          <View style={styles.loadingOrb}>
            <ActivityIndicator size="large" color={C.gold} />
          </View>
          <Text style={styles.loadingEyebrow}>SACRED HERITAGE</Text>
          <Text style={styles.loadingText}>Curating the collection</Text>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map(i => (
              <LoadingDot key={i} delay={i * 200} />
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerScreen]}>
        <StatusBar barStyle="dark-content" backgroundColor={C.void} />
        <View style={styles.errorInner}>
          <Text style={styles.errorGlyph}>✦</Text>
          <Text style={styles.errorTitle}>Collection Unavailable</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchData} activeOpacity={0.8}>
            <Ionicons name="refresh-outline" size={16} color={C.void} />
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ─── Main ────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.void} />

      {/* Toast */}
      {showToast && (
        <View style={styles.toastWrapper} pointerEvents="none">
          <WelcomeToast name={firstName} />
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* ─── Hero Header ────────────────────────────────────────────── */}
        <View style={styles.hero}>
          <ImageBackground
            source={require('../../assets/Signin.jpg')}
            style={styles.heroBg}
            imageStyle={styles.heroBgImage}
          >
            <View style={styles.heroScrim} />

            <View style={styles.heroTopBar}>
              <View>
                <Text style={styles.heroEyebrow}>✦ SACRED HERITAGE</Text>
                <Text style={styles.heroDateLine}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </Text>
              </View>
              <TouchableOpacity style={styles.avatarRing}>
                {user?.profile_picture ? (
                  <Image source={{ uri: user.profile_picture }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarInitial}>{firstName[0]?.toUpperCase()}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.heroContent}>
              <Text style={styles.heroKicker}>THE COLLECTION</Text>
              <Text style={styles.heroTitle}>Explore{'\n'}Sacred Art</Text>
              <View style={styles.heroRule}>
                <View style={styles.heroRuleLine} />
                <Text style={styles.heroRuleDot}>◆</Text>
                <View style={styles.heroRuleLine} />
              </View>
              <Text style={styles.heroSub}>Vestments · Vessels · Devotional Objects</Text>
            </View>
          </ImageBackground>
        </View>

        {/* ─── Search ───────────────────────────────────────────────────── */}
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, searchFocused && styles.searchBarFocused]}>
            <Ionicons name="search-outline" size={17} color={searchFocused ? C.gold : C.inkDim} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search the collection..."
              placeholderTextColor={C.inkDim}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={C.inkDim} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ─── Compact Feed Carousel ──────────────────────────────────── */}
        {(announcements.length > 0 || events.length > 0) && (
          <View style={styles.feedCarousel}>
            <View style={styles.feedCarouselHeader}>
              <Text style={styles.feedCarouselTitle}>LATEST UPDATES</Text>
              <TouchableOpacity onPress={() => openFeedModal('announcements')}>
                <Text style={styles.feedCarouselMore}>View all →</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.feedCarouselScroll}
              decelerationRate="fast"
              snapToInterval={272}
              snapToAlignment="start"
            >
              {announcements.slice(0, 3).map(item => (
                <CompactFeedCard
                  key={`ann-${item.id}`}
                  item={item}
                  type="announcement"
                  onPress={() => openFeedModal('announcements')}
                />
              ))}
              
              {events.slice(0, 2).map(item => (
                <CompactFeedCard
                  key={`evt-${item.id}`}
                  item={item}
                  type="event"
                  onPress={() => openFeedModal('events')}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─── Tabs ─────────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          {TABS.map(tab => (
            <TabButton
              key={tab}
              label={tab}
              active={activeTab === tab}
              onPress={() => setActiveTab(tab)}
            />
          ))}
        </ScrollView>

        {/* ─── Section Header ───────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>
              {activeTab === 'All' ? 'FULL COLLECTION' : activeTab.toUpperCase()}
            </Text>
            <Text style={styles.sectionTitle}>
              {activeTab === 'All' ? 'All Artifacts' : `${activeTab} Pieces`}
            </Text>
          </View>
          <CountBadge count={filteredArtifacts.length} />
        </View>

        {/* ─── Grid ─────────────────────────────────────────────────────── */}
        {filteredArtifacts.length > 0 ? (
          <FlatList
            data={filteredArtifacts}
            renderItem={({ item, index }) => (
              <ArtifactCard
                item={item}
                width={CARD_WIDTH}
                onPress={() => setSelectedArtifact(item)}
                isSaved={savedArtifactIds.includes(item.id)}
                isFavorited={favoriteIds.includes(item.id)}
                index={index}
              />
            )}
            keyExtractor={i => i.id}
            numColumns={2}
            scrollEnabled={false}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.gridRow}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyGlyph}>✦</Text>
            <Text style={styles.emptyTitle}>Nothing found</Text>
            <Text style={styles.emptySub}>
              {activeTab !== 'All' 
                ? `No artifacts found in "${activeTab}" category. Try another tab or adjust your search.`
                : 'Adjust your search or browse another tab'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ─── Artifact Detail Modal ────────────────────────────────────── */}
      {selectedArtifact !== null && (
        <Animated.View style={[styles.modalWrap, { opacity: modalOpacity }]}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={handleModalClose} activeOpacity={1} />
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: modalSlide }] }]}>
            <View style={styles.modalHandle} />

            <TouchableOpacity style={styles.modalCloseBtn} onPress={handleModalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={C.inkMid} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
              {selectedArtifact.image_url && (
                <View style={styles.modalHero}>
                  <Image source={{ uri: selectedArtifact.image_url }} style={styles.modalHeroImg} resizeMode="cover" />
                  <View style={styles.modalHeroScrim} />
                  <View style={styles.modalHeroCatPill}>
                    <Text style={styles.modalHeroCatText}>{selectedArtifact.category.toUpperCase()}</Text>
                  </View>
                  {selectedArtifact.is_exhibition && (
                    <View style={styles.modalHeroLive}>
                      <PulseRing />
                      <Text style={styles.modalHeroLiveText}>EXHIBITION</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.modalBody}>
                <View style={styles.modalGoldAccent} />
                <Text style={styles.modalTitle}>{selectedArtifact.name}</Text>
                <Text style={styles.modalDate}>{selectedArtifact.date}</Text>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, modalIsSaved && styles.modalActionBtnGold]}
                    onPress={toggleModalSave}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={modalIsSaved ? 'bookmark' : 'bookmark-outline'} size={18} color={modalIsSaved ? C.void : C.inkMid} />
                    <Text style={[styles.modalActionText, modalIsSaved && styles.modalActionTextDark]}>
                      {modalIsSaved ? 'Saved' : 'Save'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, modalIsFavorited && styles.modalActionBtnCrimson]}
                    onPress={toggleModalFavorite}
                    activeOpacity={0.75}
                  >
                    <Ionicons name={modalIsFavorited ? 'heart' : 'heart-outline'} size={18} color={modalIsFavorited ? '#fff' : C.inkMid} />
                    <Text style={[styles.modalActionText, modalIsFavorited && { color: '#fff' }]}>
                      {modalIsFavorited ? 'Liked' : 'Like'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {(selectedArtifact.description || selectedArtifact.description_en) && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>ABOUT THIS PIECE</Text>
                    <View style={styles.modalSectionUnderline} />
                    <Text style={styles.modalDesc}>
                      {selectedArtifact.description || selectedArtifact.description_en}
                    </Text>
                  </View>
                )}

                {/* ─── AUDIO GUIDE SECTION ─────────────────────────────────────── */}
                {(() => {
                  const langs = [
                    { code: 'en' as const, label: 'EN', name: 'English', flag: '🇺🇸', key: 'audio_en', textKey: 'description_en' },
                    { code: 'fil' as const, label: 'FIL', name: 'Filipino', flag: '🇵🇭', key: 'audio_fil', textKey: 'description_fil' },
                    { code: 'ja' as const, label: 'JA', name: 'Japanese', flag: '🇯🇵', key: 'audio_ja', textKey: 'description_ja' },
                    { code: 'es' as const, label: 'ES', name: 'Spanish', flag: '🇪🇸', key: 'audio_es', textKey: 'description_es' },
                    { code: 'ko' as const, label: 'KO', name: 'Korean', flag: '🇰🇷', key: 'audio_ko', textKey: 'description_ko' },
                  ];
                  const art = selectedArtifact as Record<string, any>;
                  
                  // Check for audio URLs or fallback to descriptions for TTS
                  const available = langs.filter(l => {
                    const hasAudio = art[l.key] && art[l.key] !== 'No audio yet' && art[l.key] !== 'null';
                    const hasText = art[l.textKey] && art[l.textKey].trim();
                    return hasAudio || hasText;
                  });
                  
                  if (!available.length) return null;

                  return (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>AUDIO GUIDE</Text>
                      <View style={styles.modalSectionUnderline} />

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        <View style={styles.audioLangRow}>
                          {available.map(lang => (
                            <TouchableOpacity
                              key={lang.code}
                              style={[styles.audioLangChip, selectedLanguage === lang.code && styles.audioLangChipActive]}
                              onPress={() => {
                                setSelectedLanguage(lang.code);
                                if (playingLang) cleanupAudio();
                              }}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.audioLangFlag}>{lang.flag}</Text>
                              <Text style={[styles.audioLangLabel, selectedLanguage === lang.code && styles.audioLangLabelActive]}>
                                {lang.label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </ScrollView>

                      {(() => {
                        const cur = available.find(l => l.code === selectedLanguage);
                        if (!cur) return null;
                        
                        const audioUrl = art[cur.key];
                        const text = art[cur.textKey];
                        const hasValidAudio = audioUrl && audioUrl !== 'No audio yet' && audioUrl !== 'null' && !audioUrl.startsWith('tts://');
                        const isPlaying = playingLang === selectedLanguage;
                        const canPlay = hasValidAudio || (text && text.trim());
                        
                        if (!canPlay) return null;
                        
                        return (
                          <TouchableOpacity
                            style={[styles.audioPlayer, isPlaying && styles.audioPlayerActive]}
                            onPress={() => {
                              if (isPlaying) {
                                cleanupAudio();
                              } else if (hasValidAudio) {
                                playAudio(audioUrl, selectedLanguage);
                              } else if (text && text.trim()) {
                                playAudio('', selectedLanguage, text);
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={[styles.audioPlayIcon, isPlaying && styles.audioPlayIconActive]}>
                              <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={isPlaying ? C.void : C.ink} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.audioPlayerLabel}>
                                {isPlaying ? 'Now playing' : 'Tap to listen'}
                              </Text>
                              <Text style={styles.audioPlayerSub}>
                                {cur.flag} {cur.name} narration
                                {!hasValidAudio && text && ' (Text-to-Speech)'}
                              </Text>
                            </View>
                            <Ionicons
                              name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                              size={20}
                              color={isPlaying ? C.gold : C.inkDim}
                            />
                          </TouchableOpacity>
                        );
                      })()}
                    </View>
                  );
                })()}
              </View>
            </ScrollView>
          </Animated.View>
        </Animated.View>
      )}

      {/* ─── Feed Modal (Announcements & Events) ─────────────────────── */}
      {showFeedModal && (
        <Animated.View style={[styles.modalWrap, { opacity: feedModalOpacity }]}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeFeedModal} activeOpacity={1} />
          <Animated.View style={[styles.feedModalSheet, { transform: [{ translateY: feedModalSlide }] }]}>
            <View style={styles.modalHandle} />

            <View style={styles.feedModalHeader}>
              <View style={styles.feedModalTabs}>
                {(['announcements', 'events'] as const).map(tab => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.feedModalTab, feedModalTab === tab && styles.feedModalTabActive]}
                    onPress={() => setFeedModalTab(tab)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={tab === 'announcements' ? 'megaphone-outline' : 'calendar-outline'}
                      size={13}
                      color={feedModalTab === tab ? C.void : C.inkMid}
                    />
                    <Text style={[styles.feedModalTabText, feedModalTab === tab && styles.feedModalTabTextActive]}>
                      {tab === 'announcements' ? 'Announcements' : 'Events'}
                    </Text>
                    <View style={[styles.feedModalTabCount, feedModalTab === tab && styles.feedModalTabCountActive]}>
                      <Text style={[styles.feedModalTabCountText, feedModalTab === tab && styles.feedModalTabCountTextActive]}>
                        {tab === 'announcements' ? announcements.length : events.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.modalCloseBtn} onPress={closeFeedModal} activeOpacity={0.7}>
                <Ionicons name="close" size={18} color={C.inkMid} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={(feedModalTab === 'announcements' ? announcements : events) as any}
              keyExtractor={i => i.id}
              contentContainerStyle={styles.feedModalList}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <FeedCard
                  item={item}
                  type={feedModalTab === 'announcements' ? 'announcement' : 'event'}
                  isInterested={interestedIds.includes(item.id)}
                  onToggleInterested={async () => {
                    const updated = await toggleInStringArray(STORAGE_KEYS.interestedEvents, item.id);
                    setInterestedIds(updated);
                  }}
                />
              )}
            />
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.void },
  centerScreen: { justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 130 },

  // ── Loading ──
  loadingInner: { alignItems: 'center', gap: 12 },
  loadingOrb: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: C.raised,
    borderWidth: 1, borderColor: C.borderGold,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
  },
  loadingEyebrow: { fontSize: 10, letterSpacing: 4, color: C.gold, fontWeight: '700' },
  loadingText: { fontSize: 16, color: C.inkMid, fontWeight: '400' },
  loadingDots: { flexDirection: 'row', gap: 6, marginTop: 8 },
  loadingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold },

  // ── Error ──
  errorInner: { alignItems: 'center', gap: 14, padding: 40 },
  errorGlyph: { fontSize: 36, color: C.gold, marginBottom: 4 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: C.ink, letterSpacing: -0.5 },
  errorBody: { fontSize: 14, color: C.inkMid, textAlign: 'center', lineHeight: 22 },
  retryBtn: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.gold, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 50,
  },
  retryText: { fontSize: 14, fontWeight: '700', color: C.void },

  // ── Toast ──
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 48,
    left: 0, right: 0, alignItems: 'center', zIndex: 999,
  },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.raised,
    borderWidth: 1, borderColor: C.borderGold,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 50,
    shadowColor: C.gold, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 12, elevation: 10,
  },
  toastDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.gold },
  toastText: { fontSize: 13, color: C.inkMid, fontWeight: '500' },
  toastName: { color: C.ink, fontWeight: '700' },

  // ── Hero (COMPACT VERSION) ──
  hero: { width: '100%' },
heroBg: { width: '100%', paddingBottom: 0 },
heroBgImage: { 
  opacity: 0.4,  // Image visibility (40% visible)
  resizeMode: 'cover' 
},
heroScrim: { 
  ...StyleSheet.absoluteFillObject, 
  backgroundColor: 'rgba(255, 252, 248, 0.75)' // Light cream overlay, 75% opaque
},
heroTopBar: {
  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  paddingHorizontal: 20, paddingTop: 12,
},
heroEyebrow: { 
  fontSize: 9.5, letterSpacing: 3.5, 
  color: C.gold, fontWeight: '700', marginBottom: 4 
},
heroDateLine: { 
  fontSize: 12, 
  color: C.textSecondary, fontWeight: '400' 
},
avatarRing: {
  width: 42, height: 42, borderRadius: 21,
  borderWidth: 1.5, borderColor: C.gold, overflow: 'hidden',
  backgroundColor: C.surfaceLight,
},
avatar: { width: '100%', height: '100%' },
avatarFallback: {
  width: '100%', height: '100%', backgroundColor: C.goldSoft,
  justifyContent: 'center', alignItems: 'center',
},
avatarInitial: { fontSize: 17, fontWeight: '800', color: C.gold },
heroContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
heroKicker: { 
  fontSize: 9, letterSpacing: 4, 
  color: C.gold, fontWeight: '600', marginBottom: 8 
},
heroTitle: { 
  fontSize: 44, fontWeight: '900', 
  color: C.textPrimary, lineHeight: 48, letterSpacing: -1.5, marginBottom: 16 
},
heroRule: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
heroRuleLine: { flex: 1, height: 1, backgroundColor: C.gold, opacity: 0.3 },
heroRuleDot: { fontSize: 8, color: C.gold },
heroSub: { 
  fontSize: 11, letterSpacing: 1.5, 
  color: C.textSecondary, fontWeight: '500' 
},

  // ── Search (COMPACT) ──
  searchSection: { paddingHorizontal: 20, paddingVertical: 12 }, // Reduced from 18
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, // Reduced from 14
    paddingHorizontal: 14, paddingVertical: 10, // Reduced from 16/14
  },
  searchBarFocused: { borderColor: C.borderGold },
  searchInput: { flex: 1, fontSize: 13, color: C.ink, padding: 0 }, // Reduced from 14

  // ── Compact Feed Carousel ──
  feedCarousel: {
    marginBottom: 20, // Reduced from 24
  },
  feedCarouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    marginBottom: 10, // Reduced from 12
  },
  feedCarouselTitle: {
    fontSize: 12, // Reduced from 13
    fontWeight: '700',
    color: C.ink,
    letterSpacing: 1.2,
  },
  feedCarouselMore: {
    fontSize: 10, // Reduced from 11
    color: C.gold,
    fontWeight: '600',
  },
  feedCarouselScroll: {
    paddingLeft: 20,
  },
  feedCardCompact: {
    width: 250, // Reduced from 260
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12, // Reduced from 14
    marginRight: 10, // Reduced from 12
    overflow: 'hidden',
  },
  feedCardCompactContent: {
    padding: 12, // Reduced from 14
    gap: 6, // Reduced from 8
  },
  feedCardCompactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feedCardCompactBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: C.overlay,
    paddingHorizontal: 6, // Reduced from 8
    paddingVertical: 2, // Reduced from 3
    borderRadius: 50,
  },
  feedCardCompactBadgeText: {
    fontSize: 8, // Reduced from 9
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  feedCardCompactDate: {
    fontSize: 9, // Reduced from 10
    color: C.inkDim,
  },
  feedCardCompactTitle: {
    fontSize: 13, // Reduced from 14
    fontWeight: '700',
    color: C.ink,
    lineHeight: 18,
  },
  feedCardCompactDesc: {
    fontSize: 11, // Reduced from 11.5
    color: C.inkMid,
    lineHeight: 15,
  },
  feedCardCompactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Reduced from 8
    marginTop: 2, // Reduced from 4
  },
  feedCardCompactFooterText: {
    fontSize: 9, // Reduced from 10
    color: C.inkDim,
  },
  feedCardCompactDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: C.inkDim,
    opacity: 0.5,
  },

  // ── Tabs (COMPACT) ──
  tabsScroll: { marginBottom: 20 }, // Reduced from 24
  tabsRow: { paddingHorizontal: 20, gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 50 }, // Reduced from 18/9
  tabText: { fontSize: 12, fontWeight: '600', color: C.inkMid }, // Reduced from 13
  tabTextActive: { color: C.void },

  // ── Section Header (COMPACT) ──
  sectionHeader: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 14, // Reduced from 18
  },
  sectionEyebrow: { fontSize: 9, letterSpacing: 3, color: C.gold, fontWeight: '700', marginBottom: 3 }, // Reduced from 4
  sectionTitle: { fontSize: 20, fontWeight: '800', color: C.ink, letterSpacing: -0.6 }, // Reduced from 22
  countBadge: {
    backgroundColor: C.overlay, borderWidth: 1, borderColor: C.borderGold,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, // Reduced from 12/5
  },
  countBadgeText: { fontSize: 12, fontWeight: '800', color: C.gold }, // Reduced from 13

  // ── Grid ──
  grid: { paddingHorizontal: 20 },
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP },

  // ── Card ──
  card: {
    backgroundColor: C.surface, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: C.border,
  },
  cardImageWrap: { width: '100%', height: 155, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  cardCatPill: {
    position: 'absolute', top: 10, left: 10,
    backgroundColor: 'rgba(235, 219, 204, 0.8)',
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
    borderWidth: 0.5, borderColor: 'rgba(201,168,76,0.3)',
  },
  cardCatText: { fontSize: 8, fontWeight: '800', color: C.gold, letterSpacing: 1.2 },
  cardBottomRow: { position: 'absolute', bottom: 10, right: 10, flexDirection: 'row', gap: 5 },
  cardLivePill: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: 'rgba(46,204,113,0.2)',
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.4)',
    justifyContent: 'center', alignItems: 'center',
  },
  cardLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.teal },
  cardMicroBadge: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardBody: { padding: 13, gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: C.ink, lineHeight: 19 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardAccentLine: { width: 16, height: 1.5, backgroundColor: C.gold, borderRadius: 1, opacity: 0.7 },
  cardDate: { fontSize: 11, color: C.inkDim, fontWeight: '500' },

  // ── Empty ──
  emptyState: { alignItems: 'center', paddingVertical: 50, gap: 10 }, // Reduced from 70
  emptyGlyph: { fontSize: 28, color: C.inkDim, marginBottom: 4 }, // Reduced from 32
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.ink }, // Reduced from 18
  emptySub: { fontSize: 12, color: C.inkDim, textAlign: 'center' }, // Reduced from 13

  // ── Modal (shared) ──
  modalWrap: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'flex-end', zIndex: 200,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,7,6,0.75)',
  },
  modalSheet: {
    backgroundColor: C.deep,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', maxHeight: SCREEN_HEIGHT * 0.93,
    borderTopWidth: 1, borderColor: C.border,
  },
  modalHandle: {
    width: 36, height: 3.5, borderRadius: 2, backgroundColor: C.inkDim,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  modalCloseBtn: {
    position: 'absolute', top: 14, right: 16, zIndex: 10,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  modalHero: { width: '100%', height: 280, position: 'relative' },
  modalHeroImg: { width: '100%', height: '100%' },
  modalHeroScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(8,7,6,0.35)' },
  modalHeroCatPill: {
    position: 'absolute', bottom: 18, left: 20,
    backgroundColor: 'rgba(8,7,6,0.85)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 50,
    borderWidth: 1, borderColor: C.borderGold,
  },
  modalHeroCatText: { fontSize: 9, fontWeight: '800', color: C.gold, letterSpacing: 2.5 },
  modalHeroLive: {
    position: 'absolute', top: 18, right: 18,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(8,7,6,0.75)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 50,
    borderWidth: 1, borderColor: 'rgba(46,204,113,0.3)',
  },
  pulseRing: {
    position: 'absolute', width: 10, height: 10, borderRadius: 5,
    backgroundColor: C.teal, opacity: 0,
  },
  modalHeroLiveText: { fontSize: 9, fontWeight: '800', color: C.teal, letterSpacing: 2 },
  modalBody: { padding: 24 },
  modalGoldAccent: { width: 32, height: 2, backgroundColor: C.gold, borderRadius: 1, marginBottom: 18 },
  modalTitle: { fontSize: 30, fontWeight: '900', color: C.ink, letterSpacing: -1, marginBottom: 5 },
  modalDate: { fontSize: 12, color: C.inkDim, fontStyle: 'italic', marginBottom: 22 },
  modalActions: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  modalActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 7,
    paddingVertical: 12, borderRadius: 50,
    backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
  },
  modalActionBtnGold: { backgroundColor: C.gold, borderColor: C.gold },
  modalActionBtnCrimson: { backgroundColor: C.crimson, borderColor: C.crimson },
  modalActionText: { fontSize: 13, fontWeight: '700', color: C.inkMid },
  modalActionTextDark: { color: C.void },
  modalSection: { marginBottom: 30 },
  modalSectionLabel: { fontSize: 9, letterSpacing: 3.5, color: C.gold, fontWeight: '800', marginBottom: 8 },
  modalSectionUnderline: {
    width: 24, height: 1.5, backgroundColor: C.gold,
    opacity: 0.5, borderRadius: 1, marginBottom: 14,
  },
  modalDesc: { fontSize: 14.5, color: C.inkMid, lineHeight: 24, fontWeight: '400' },

  // ── Audio ──
  audioLangRow: { flexDirection: 'row', gap: 8 },
  audioLangChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 50,
    backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
  },
  audioLangChipActive: { borderColor: C.borderGold, backgroundColor: C.goldSoft },
  audioLangFlag: { fontSize: 13 },
  audioLangLabel: { fontSize: 11, fontWeight: '700', color: C.inkDim },
  audioLangLabelActive: { color: C.gold },
  audioPlayer: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 16,
  },
  audioPlayerActive: { borderColor: C.borderGold, backgroundColor: C.goldSoft },
  audioPlayIcon: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: C.overlay,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  audioPlayIconActive: { backgroundColor: C.gold, borderColor: C.gold },
  audioPlayerLabel: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 2 },
  audioPlayerSub: { fontSize: 11.5, color: C.inkDim },

  // ── Feed Modal ──
  feedModalSheet: {
    backgroundColor: C.deep,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: C.border,
    maxHeight: SCREEN_HEIGHT * 0.82,
  },
  feedModalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingBottom: 16, gap: 10,
  },
  feedModalTabs: { flex: 1, flexDirection: 'row', gap: 8 },
  feedModalTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: C.raised, borderWidth: 1, borderColor: C.border,
  },
  feedModalTabActive: { backgroundColor: C.gold, borderColor: C.gold },
  feedModalTabText: { fontSize: 12, fontWeight: '700', color: C.inkMid },
  feedModalTabTextActive: { color: C.void },
  feedModalTabCount: {
    backgroundColor: C.overlay, borderRadius: 999,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  feedModalTabCountActive: { backgroundColor: 'rgba(0,0,0,0.15)' },
  feedModalTabCountText: { fontSize: 10, fontWeight: '800', color: C.inkDim },
  feedModalTabCountTextActive: { color: C.void },
  feedModalList: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },

  // ── Feed Cards ──
  feedCard: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 16, padding: 16,
    flexDirection: 'row', gap: 14,
  },
  feedDateBlock: {
    alignItems: 'center', justifyContent: 'flex-start',
    minWidth: 36, paddingTop: 2,
  },
  feedDateMonth: {
    fontSize: 9, fontWeight: '600', letterSpacing: 1.5,
    color: C.inkDim, marginBottom: 2, lineHeight: 12,
  },
  feedDateDay: {
    fontSize: 28, fontWeight: '700',
    color: C.ink, lineHeight: 30, letterSpacing: -1,
  },
  feedDivider: { width: 1, backgroundColor: C.border, alignSelf: 'stretch' },
  feedContent: { flex: 1, gap: 6 },
  feedTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(250,238,218,0.12)',
    borderWidth: 1, borderColor: 'rgba(133,79,11,0.25)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  feedBadgeEvent: {
    backgroundColor: 'rgba(225,245,238,0.1)',
    borderColor: 'rgba(8,80,65,0.3)',
  },
  feedBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  interestedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.raised,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 50,
  },
  interestedBtnActive: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  interestedBtnText: { fontSize: 10, fontWeight: '600', color: C.inkMid },
  interestedBtnTextActive: { color: '#E74C3C' },
  feedTitle: { fontSize: 14, fontWeight: '700', color: C.ink, lineHeight: 20 },
  feedDesc: { fontSize: 12, color: C.inkMid, lineHeight: 18 },
  feedFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  feedFooterText: { fontSize: 11, color: C.inkDim, fontWeight: '500' },
  feedFooterDot: {
    width: 3, height: 3, borderRadius: 1.5,
    backgroundColor: C.inkDim, opacity: 0.5,
  },
});