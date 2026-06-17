import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  FlatList, Image, StatusBar, Animated, Dimensions,
  ActivityIndicator, StyleSheet, Platform, TextInput,
  ImageBackground, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../services/supabase';
import { STORAGE_KEYS, toggleInStringArray, getStringArray } from '../../utils/storage';
import { useAppTheme } from '../../context/ThemeContext';
import { THEMES } from '../../constants/themes';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_GAP = 10;
const CARD_WIDTH = (SCREEN_WIDTH - 40 - CARD_GAP) / 2;

// ─── Types ──────────────────────────────────────────────────────────────────────
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
  qr_code: string | null;
  created_at: string;
  date?: string;
  image_url?: string;
  is_exhibition?: boolean;
  is_crown?: boolean;
  is_artwork?: boolean;
  description?: string;
  creator?: string;
  Historical_Significance?: string;
  translations?: ArtifactTranslation[];
  audio_url?: string; // from audio_guides
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
function buildC(t: typeof THEMES.light) {
  return {
    backgroundLight: t.bg, surfaceLight: t.surface,
    textPrimary: t.ink, textSecondary: t.inkMid, textMuted: t.inkDim,
    accent: t.gold, accentWarm: t.goldBright, accentLight: t.goldSoft,
    success: t.teal, crimson: t.crimson,
    borderSubtle: t.border, divider: t.deep, hoverLight: t.overlay,
    shadowLight: t.ink, overlay: t.goldSoft,
    void: t.bg, ink: t.ink, inkMid: t.inkMid, inkDim: t.inkDim,
    gold: t.gold, borderGold: t.borderGold, goldSoft: t.goldSoft,
    raised: t.raised, surface: t.surface, border: t.border,
    teal: t.teal, deep: t.deep, over: t.overlay,
  };
}
let C = buildC(THEMES.light);


function getStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
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
  gridRow: { gap: CARD_GAP, marginBottom: CARD_GAP, alignItems: 'stretch' },

  // ── Card ──
  card: {
    backgroundColor: C.surface, borderRadius: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: C.border,
    flex: 1,
  },
  cardImageWrap: { width: '100%', aspectRatio: 1, position: 'relative' },
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
  cardBody: { padding: 13, gap: 6, minHeight: 70 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: C.ink, lineHeight: 18, minHeight: 36 },
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
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  feedModalHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, gap: 10,
    borderBottomWidth: 1, borderBottomColor: C.divider,
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
    borderRadius: 16, overflow: 'hidden',
  },
  feedCardImage: { width: '100%', height: 160 },
  feedCardBody: { padding: 16, gap: 8 },
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

  // ── Stats Strip ──
  statsStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 20, paddingVertical: 10, gap: 16,
    backgroundColor: C.surface, borderTopWidth: 1, borderBottomWidth: 1, borderColor: C.border,
    marginBottom: 16,
  },
  statItem: { fontSize: 13, fontWeight: '800', color: C.ink },
  statLabel: { fontSize: 11, fontWeight: '400', color: C.inkMid },
  statDivider: { width: 1, height: 16, backgroundColor: C.border },

  // ── Unread dot ──
  feedCarouselTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.crimson },

  // ── Featured Banner ──
  featuredBanner: {
    marginHorizontal: 20, marginBottom: 14, borderRadius: 18,
    overflow: 'hidden', height: 180,
    borderWidth: 1, borderColor: C.borderGold,
  },
  featuredBannerImg: { ...StyleSheet.absoluteFillObject as any },
  featuredBannerScrim: { ...StyleSheet.absoluteFillObject as any, backgroundColor: 'rgba(20,16,10,0.55)' },
  featuredBannerContent: { flex: 1, justifyContent: 'flex-end', padding: 18 },
  featuredBannerBadge: {
    alignSelf: 'flex-start', backgroundColor: C.gold,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, marginBottom: 8,
  },
  featuredBannerBadgeText: { fontSize: 8, fontWeight: '800', color: C.ink, letterSpacing: 1.5 },
  featuredBannerTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', letterSpacing: -0.5, lineHeight: 26 },
  featuredBannerCat: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4, letterSpacing: 0.5 },

  // ── Progress Bar ──
  progressBar: { marginHorizontal: 20, marginBottom: 20 },
  progressBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressBarLabel: { fontSize: 11, color: C.inkDim, fontWeight: '500' },
  progressBarCount: { fontSize: 11, color: C.gold, fontWeight: '700' },
  progressBarTrack: { height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: C.gold, borderRadius: 2 },

  // ── 'New' badge ──
  cardNewBadge: {
    position: 'absolute', top: 10, right: 10,
    backgroundColor: C.gold, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  cardNewBadgeText: { fontSize: 7, fontWeight: '900', color: C.ink, letterSpacing: 1 },

  // ── Recent searches ──
  recentSearchRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  recentSearchLabel: { fontSize: 10, color: C.inkDim, fontWeight: '600', letterSpacing: 0.5 },
  recentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50,
  },
  recentChipText: { fontSize: 11, color: C.inkMid, fontWeight: '500' },

  // ── Search result count ──
  searchResultCount: { fontSize: 11, color: C.inkDim, marginTop: 8, fontStyle: 'italic' },

  // ── Profile Sheet ──
  profileSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: C.border, paddingBottom: 40,
  },
  profileSheetBody: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 12, gap: 6 },
  profileSheetAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: C.goldSoft, borderWidth: 2, borderColor: C.gold,
    overflow: 'hidden', justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  profileSheetInitial: { fontSize: 32, fontWeight: '800', color: C.gold },
  profileSheetName: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.5 },
  profileSheetEmail: { fontSize: 13, color: C.inkDim, marginBottom: 20 },
  profileSheetStats: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.hoverLight ?? C.border, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 24, gap: 20, width: '100%', justifyContent: 'center',
  },
  profileSheetStat: { alignItems: 'center', gap: 4 },
  profileSheetStatVal: { fontSize: 22, fontWeight: '900', color: C.ink },
  profileSheetStatLbl: { fontSize: 10, color: C.inkDim, fontWeight: '600', letterSpacing: 0.5 },
  profileSheetStatDiv: { width: 1, height: 32, backgroundColor: C.border },
});
}

let styles = getStyles(C);

const CATEGORY_IMAGES: Record<string, string> = {
  'Vestments':          'https://images.unsplash.com/photo-1582552938356-8b6b14c0e1ee?w=600',
  'Sacred Vessels':     'https://images.unsplash.com/photo-1602351447937-7457d2e0ffc3?w=600',
  'Liturgical Books':   'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600',
  'Devotional Objects': 'https://images.unsplash.com/photo-1566505237780-6bf6d4c1b84e?w=600',
  'Altar Furnishings':  'https://images.unsplash.com/photo-1601940462811-2c893df9477c?w=600',
  'Sacramentals':       'https://images.unsplash.com/photo-1580137189272-c9379f8864fd?w=600',
};

function formatYear(dateStr: string) {
  const y = new Date(dateStr).getFullYear();
  return isNaN(y) ? 'Date unknown' : `c. ${y}`;
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function getTimeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDateShort(date);
}
function formatDateShort(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatEventTime(date: Date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}
function getEventCountdown(dateStr: string): string | null {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  return h < 24 ? `In ${h}h` : `In ${Math.floor(h / 24)}d`;
}
function isNewArtifact(createdAt: string) {
  return Date.now() - new Date(createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
}

// ─── Skeleton Card ──────────────────────────────────────────────────────────────
function SkeletonCard({ width }: { width: number }) {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });
  return (
    <Animated.View style={[{ width, backgroundColor: C.border, borderRadius: 16, overflow: 'hidden', marginBottom: 2 }, { opacity }]}>
      <View style={{ width: '100%', aspectRatio: 1, backgroundColor: C.deep }} />
      <View style={{ padding: 13, gap: 8 }}>
        <View style={{ height: 12, backgroundColor: C.deep, borderRadius: 6, width: '75%' }} />
        <View style={{ height: 10, backgroundColor: C.deep, borderRadius: 6, width: '45%' }} />
      </View>
    </Animated.View>
  );
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
  item, width, onPress, isSaved, index,
}: {
  item: Artifact; width: number; onPress: () => void;
  isSaved?: boolean; index: number;
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

          {isNewArtifact(item.created_at) && (
            <View style={styles.cardNewBadge}>
              <Text style={styles.cardNewBadgeText}>NEW</Text>
            </View>
          )}

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
  const isEvent = type === 'event';
  const badgeColor = isEvent ? '#085041' : '#854F0B';
  const badgeBg = isEvent ? 'rgba(8,80,65,0.08)' : 'rgba(133,79,11,0.08)';
  const countdown = isEvent ? getEventCountdown(rawDate) : null;
  const timeLabel = countdown ?? getTimeAgo(date);

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
          <Text style={styles.feedCardCompactDate}>{timeLabel}</Text>
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
  const rawDate = type === 'announcement' ? item.announcement_datetime : item.event_datetime;
  const date = new Date(rawDate);
  const isEvent = type === 'event';
  const badgeColor = isEvent ? '#085041' : '#854F0B';
  const badgeBg = isEvent ? 'rgba(8,80,65,0.1)' : 'rgba(133,79,11,0.1)';

  return (
    <View style={styles.feedCard}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.feedCardImage} resizeMode="cover" />
      ) : null}
      <View style={styles.feedCardBody}>
        <View style={styles.feedTopRow}>
          <View style={[styles.feedBadge, { backgroundColor: badgeBg, borderColor: `${badgeColor}40` }]}>
            <Ionicons name={isEvent ? 'calendar-outline' : 'megaphone-outline'} size={10} color={badgeColor} />
            <Text style={[styles.feedBadgeText, { color: badgeColor }]}>
              {isEvent ? 'EVENT' : 'ANNOUNCEMENT'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.interestedBtn, isInterested && styles.interestedBtnActive]}
            onPress={onToggleInterested}
            activeOpacity={0.75}
          >
            <Ionicons name={isInterested ? 'heart' : 'heart-outline'} size={14} color={isInterested ? '#E74C3C' : C.inkMid} />
            <Text style={[styles.interestedBtnText, isInterested && styles.interestedBtnTextActive]}>
              Interested
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.feedTitle}>{item.title}</Text>
        {item.description ? (
          <Text style={styles.feedDesc}>{item.description}</Text>
        ) : null}

        <View style={styles.feedFooter}>
          <Ionicons name={isEvent ? 'time-outline' : 'calendar-outline'} size={11} color={C.inkDim} />
          <Text style={styles.feedFooterText}>{formatDate(rawDate)}</Text>
          {isEvent && (
            <>
              <View style={styles.feedFooterDot} />
              <Text style={styles.feedFooterText}>{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</Text>
            </>
          )}
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
  const { theme } = useAppTheme();
  C = buildC(theme); // update module-level C so all sub-components use it
  const styles = getStyles(C);

  const [activeTab, setActiveTab] = useState<TabType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
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
  const [savedArtifactIds, setSavedArtifactIds] = useState<string[]>([]);
  const [modalIsSaved, setModalIsSaved] = useState(false);
  const [interestedIds, setInterestedIds] = useState<string[]>([]);
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [hasUnreadFeed, setHasUnreadFeed] = useState(false);
  const profileSheetSlide = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const profileSheetOpacity = useRef(new Animated.Value(0)).current;
  //navbar visibility refs
  const lastScrollY = useRef(0);
  const navbarVisibleRef = useRef(true);

  const handleScroll = (event: any) => {
  const currentY = event.nativeEvent.contentOffset.y;

  if (currentY <= 20) {
    navbarVisibleRef.current = true;
    setNavbarVisible?.(true);
    lastScrollY.current = currentY;
    return;
  }

  const diff = currentY - lastScrollY.current;

  if (Math.abs(diff) < 10) return;

  if (diff > 0 && navbarVisibleRef.current) {
    navbarVisibleRef.current = false;
    setNavbarVisible?.(false);
  } else if (diff < 0 && !navbarVisibleRef.current) {
    navbarVisibleRef.current = true;
    setNavbarVisible?.(true);
  }

  lastScrollY.current = currentY;
};
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
    setNavbarVisible?.(!selectedArtifact && !showFeedModal && !showProfileSheet);
  }, [selectedArtifact, showFeedModal, showProfileSheet]);

  useEffect(() => {
    setupAudio();
    fetchData();
    loadStorage();
    return () => cleanupAudio();
  }, []);

  useEffect(() => {
    if (selectedArtifact) {
      setModalIsSaved(savedArtifactIds.includes(selectedArtifact.id));
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
    const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
    const interested = await getStringArray(STORAGE_KEYS.interestedEvents);
    setSavedArtifactIds(saved);
    setInterestedIds(interested);
    try {
      const rs = await AsyncStorage.getItem('recentSearches');
      if (rs) setRecentSearches(JSON.parse(rs));
      const lastSeen = await AsyncStorage.getItem('feedLastSeen');
      if (lastSeen) {
        // hasUnread resolved after data loads — set flag optimistically
        setHasUnreadFeed(false);
      } else {
        setHasUnreadFeed(true);
      }
    } catch (_) {}
  }

  async function setupAudio() {
    try {
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true, shouldPlayInBackground: false });
    } catch (e: any) { console.error('Audio setup:', e.message); }
  }

  function cleanupAudio() {
    if (playerRef.current) {
      playerRef.current.pause?.();
      playbackSubscriptionRef.current?.remove();
      playbackSubscriptionRef.current = null;
      playerRef.current.remove?.();
      playerRef.current = null;
    }
    setPlayingLang(null);
  }

  // Play saved audio_url only — no TTS fallback
  async function playAudio(audioUrl: string, lang: string) {
    try {
      cleanupAudio();

      if (!audioUrl || audioUrl === 'null') {
        alert('No audio available for this language yet.');
        return;
      }

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
        .select('id, name, category, qr_code, created_at, description, image_url, creator, Historical_Significance, artifact_translations(language_code, name, description, audio_url)')
        .order('created_at', { ascending: false });
      if (itemsError) throw itemsError;

      const enriched: Artifact[] = (items || []).map(item => ({
        ...item,
        translations: (item as any).artifact_translations || [],
        audio_url: (item as any).audio_guides?.[0]?.audio_url || null,
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

      // Compute unread dot
      try {
        const lastSeen = await AsyncStorage.getItem('feedLastSeen');
        const newestTs = [...(eventsData || []), ...(announcementsData || [])]
          .map(i => new Date((i as any).event_datetime || (i as any).announcement_datetime).getTime())
          .reduce((a, b) => Math.max(a, b), 0);
        setHasUnreadFeed(!lastSeen || newestTs > parseInt(lastSeen, 10));
      } catch (_) {}

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

  async function saveRecentSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    setRecentSearches(prev => {
      const updated = [trimmed, ...prev.filter(s => s !== trimmed)].slice(0, 3);
      AsyncStorage.setItem('recentSearches', JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }

  function openProfileSheet() {
    setShowProfileSheet(true);
    Animated.parallel([
      Animated.spring(profileSheetSlide, { toValue: 0, useNativeDriver: true, tension: 65, friction: 12 }),
      Animated.timing(profileSheetOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }

  function closeProfileSheet() {
    Animated.parallel([
      Animated.timing(profileSheetSlide, { toValue: SCREEN_HEIGHT, duration: 300, useNativeDriver: true }),
      Animated.timing(profileSheetOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setShowProfileSheet(false));
  }

  async function toggleModalSave() {
    if (!selectedArtifact) return;
    const updated = await toggleInStringArray(STORAGE_KEYS.savedArtifacts, selectedArtifact.id);
    setSavedArtifactIds(updated);
    setModalIsSaved(updated.includes(selectedArtifact.id));
  }

  function openFeedModal(tab: 'announcements' | 'events') {
    setFeedModalTab(tab);
    setShowFeedModal(true);
    setHasUnreadFeed(false);
    AsyncStorage.setItem('feedLastSeen', Date.now().toString()).catch(() => {});
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
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.void} />
        <ScrollView contentContainerStyle={styles.scroll} scrollEnabled={false}>
          <View style={styles.hero}>
            <ImageBackground source={require('../../assets/Signin.jpg')} style={styles.heroBg} imageStyle={styles.heroBgImage}>
              <View style={styles.heroScrim} />
              <View style={styles.heroTopBar}>
                <View>
                  <Text style={styles.heroEyebrow}>✦ SACRED HERITAGE</Text>
                  <Text style={styles.heroDateLine}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
                </View>
                <View style={styles.avatarRing}><View style={styles.avatarFallback} /></View>
              </View>
              <View style={styles.heroContent}>
                <Text style={styles.heroKicker}>THE COLLECTION</Text>
                <Text style={styles.heroTitle}>Explore{'\n'}Sacred Art</Text>
                <View style={styles.heroRule}><View style={styles.heroRuleLine} /><Text style={styles.heroRuleDot}>◆</Text><View style={styles.heroRuleLine} /></View>
                <Text style={styles.heroSub}>Vestments · Vessels · Devotional Objects</Text>
              </View>
            </ImageBackground>
          </View>
          <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
            <View style={[styles.searchBar, { marginBottom: 20 }]}>
              <Ionicons name="search-outline" size={17} color={C.inkDim} />
              <View style={{ flex: 1, height: 14, backgroundColor: C.border, borderRadius: 6, marginLeft: 8 }} />
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP }}>
              {[0, 1, 2, 3, 4, 5].map(i => (
                <SkeletonCard key={i} width={CARD_WIDTH} />
              ))}
            </View>
          </View>
        </ScrollView>
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
      onScroll={handleScroll}
      scrollEventThrottle={16}
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
              <TouchableOpacity style={styles.avatarRing} onPress={openProfileSheet} activeOpacity={0.85}>
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
              onBlur={() => { setSearchFocused(false); if (searchQuery.trim()) saveRecentSearch(searchQuery); }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => { if (searchQuery.trim()) saveRecentSearch(searchQuery); }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={16} color={C.inkDim} />
              </TouchableOpacity>
            )}
          </View>

          {/* Recent searches chips — shown when focused and no query */}
          {searchFocused && !searchQuery && recentSearches.length > 0 && (
            <View style={styles.recentSearchRow}>
              <Text style={styles.recentSearchLabel}>Recent</Text>
              {recentSearches.map(s => (
                <TouchableOpacity key={s} style={styles.recentChip} onPress={() => setSearchQuery(s)} activeOpacity={0.75}>
                  <Ionicons name="time-outline" size={10} color={C.inkDim} />
                  <Text style={styles.recentChipText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Result count — shown when there is an active query */}
          {searchQuery.trim().length > 0 && (
            <Text style={styles.searchResultCount}>
              {filteredArtifacts.length} result{filteredArtifacts.length !== 1 ? 's' : ''} for "{searchQuery.trim()}"
            </Text>
          )}
        </View>

        {/* ─── Stats Strip ────────────────────────────────────────────── */}
        {!loading && artifacts.length > 0 && (
          <View style={styles.statsStrip}>
            <Text style={styles.statItem}>{artifacts.length} <Text style={styles.statLabel}>artifacts</Text></Text>
            <View style={styles.statDivider} />
            <Text style={styles.statItem}>{TABS.length - 1} <Text style={styles.statLabel}>categories</Text></Text>
            <View style={styles.statDivider} />
            <Text style={styles.statItem}>{savedArtifactIds.length} <Text style={styles.statLabel}>saved</Text></Text>
          </View>
        )}

        {/* ─── Compact Feed Carousel ──────────────────────────────────── */}
        {(announcements.length > 0 || events.length > 0) && (
          <View style={styles.feedCarousel}>
            <View style={styles.feedCarouselHeader}>
              <View style={styles.feedCarouselTitleRow}>
                <Text style={styles.feedCarouselTitle}>LATEST UPDATES</Text>
                {hasUnreadFeed && <View style={styles.unreadDot} />}
              </View>
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

        {/* ─── Featured Artifact Banner ──────────────────────────────────── */}
        {activeTab === 'All' && !searchQuery && artifacts.length > 0 && (() => {
          const featured = artifacts[0];
          return (
            <TouchableOpacity
              style={styles.featuredBanner}
              onPress={() => setSelectedArtifact(featured)}
              activeOpacity={0.9}
            >
              <Image source={{ uri: featured.image_url }} style={styles.featuredBannerImg} resizeMode="cover" />
              <View style={styles.featuredBannerScrim} />
              <View style={styles.featuredBannerContent}>
                <View style={styles.featuredBannerBadge}>
                  <Text style={styles.featuredBannerBadgeText}>✦ ARTIFACT OF THE DAY</Text>
                </View>
                <Text style={styles.featuredBannerTitle} numberOfLines={2}>{featured.name}</Text>
                <Text style={styles.featuredBannerCat}>{featured.category}</Text>
              </View>
            </TouchableOpacity>
          );
        })()}

        {/* ─── Collection Progress Bar ──────────────────────────────────── */}
        {artifacts.length > 0 && (
          <View style={styles.progressBar}>
            <View style={styles.progressBarHeader}>
              <Text style={styles.progressBarLabel}>Collection explored</Text>
              <Text style={styles.progressBarCount}>{savedArtifactIds.length} / {artifacts.length}</Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${Math.min((savedArtifactIds.length / artifacts.length) * 100, 100)}%` }]} />
            </View>
          </View>
        )}

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
                </View>

                {(selectedArtifact.description || (selectedArtifact.translations?.find(t => t.language_code === 'en')?.description)) && (
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionLabel}>ABOUT THIS PIECE</Text>
                    <View style={styles.modalSectionUnderline} />
                    <Text style={styles.modalDesc}>
                      {selectedArtifact.description || selectedArtifact.translations?.find(t => t.language_code === 'en')?.description}
                    </Text>
                  </View>
                )}

                {/* ─── AUDIO GUIDE SECTION ─────────────────────────────────────── */}
                {(() => {
                  const translations = selectedArtifact.translations || [];
                  const langMeta: Record<string, { label: string; flag: string; name: string }> = {
                    en:  { label: 'EN',  flag: '🇺🇸', name: 'English'  },
                    fil: { label: 'FIL', flag: '🇵🇭', name: 'Filipino' },
                    ja:  { label: 'JA',  flag: '🇯🇵', name: 'Japanese' },
                    es:  { label: 'ES',  flag: '🇪🇸', name: 'Spanish'  },
                    ko:  { label: 'KO',  flag: '🇰🇷', name: 'Korean'   },
                  };

                  const available = translations.filter(t => t.audio_url || t.description);
                  if (!available.length) return null;

                  return (
                    <View style={styles.modalSection}>
                      <Text style={styles.modalSectionLabel}>AUDIO GUIDE</Text>
                      <View style={styles.modalSectionUnderline} />

                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        <View style={styles.audioLangRow}>
                          {available.map(t => {
                            const meta = langMeta[t.language_code] || { label: t.language_code.toUpperCase(), flag: '🌐', name: t.language_code };
                            return (
                              <TouchableOpacity
                                key={t.language_code}
                                style={[styles.audioLangChip, selectedLanguage === t.language_code && styles.audioLangChipActive]}
                                onPress={() => {
                                  setSelectedLanguage(t.language_code as any);
                                  if (playingLang) cleanupAudio();
                                }}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.audioLangFlag}>{meta.flag}</Text>
                                <Text style={[styles.audioLangLabel, selectedLanguage === t.language_code && styles.audioLangLabelActive]}>
                                  {meta.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>

                      {(() => {
                        const cur = available.find(t => t.language_code === selectedLanguage) || available[0];
                        if (!cur) return null;
                        const meta = langMeta[cur.language_code] || { label: cur.language_code.toUpperCase(), flag: '🌐', name: cur.language_code };
                        const hasValidAudio = !!cur.audio_url;
                        const isPlaying = playingLang === cur.language_code;

                        return (
                          <TouchableOpacity
                            style={[styles.audioPlayer, isPlaying && styles.audioPlayerActive]}
                            onPress={() => {
                              if (isPlaying) {
                                cleanupAudio();
                              } else if (hasValidAudio) {
                                playAudio(cur.audio_url!, cur.language_code);
                              } else {
                                alert('No audio available for this language yet.');
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
                                {meta.flag} {meta.name} narration
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
      {/* ─── Profile Sheet ────────────────────────────────────────────── */}
      {showProfileSheet && (
        <Animated.View style={[styles.modalWrap, { opacity: profileSheetOpacity }]}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={closeProfileSheet} activeOpacity={1} />
          <Animated.View style={[styles.profileSheet, { transform: [{ translateY: profileSheetSlide }] }]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={closeProfileSheet} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={C.inkMid} />
            </TouchableOpacity>
            <View style={styles.profileSheetBody}>
              <View style={styles.profileSheetAvatar}>
                {user?.profile_picture
                  ? <Image source={{ uri: user.profile_picture }} style={{ width: '100%', height: '100%' }} />
                  : <Text style={styles.profileSheetInitial}>{user?.first_name?.[0]?.toUpperCase() ?? '?'}</Text>
                }
              </View>
              <Text style={styles.profileSheetName}>{user?.first_name} {user?.last_name}</Text>
              <Text style={styles.profileSheetEmail}>{user?.email}</Text>
              <View style={styles.profileSheetStats}>
                <View style={styles.profileSheetStat}>
                  <Text style={styles.profileSheetStatVal}>{savedArtifactIds.length}</Text>
                  <Text style={styles.profileSheetStatLbl}>Saved</Text>
                </View>
                <View style={styles.profileSheetStatDiv} />
                <View style={styles.profileSheetStat}>
                  <Text style={styles.profileSheetStatVal}>{interestedIds.length}</Text>
                  <Text style={styles.profileSheetStatLbl}>Interested</Text>
                </View>
                <View style={styles.profileSheetStatDiv} />
                <View style={styles.profileSheetStat}>
                  <Text style={styles.profileSheetStatVal}>{artifacts.length}</Text>
                  <Text style={styles.profileSheetStatLbl}>In Collection</Text>
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────────