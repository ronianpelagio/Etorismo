import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { useAppTheme } from '../../context/ThemeContext';
import { THEMES } from '../../constants/themes';
import { STORAGE_KEYS, getStringArray } from '../../utils/storage';
import { Loading, Avatar } from '../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function buildC(t: typeof THEMES.light) {
  return {
    bg: t.bg, surface: t.surface, ink: t.ink, inkMid: t.inkMid, inkLight: t.inkDim, gold: t.gold, goldWarm: t.goldBright, goldSoft: t.goldSoft, goldBorder: t.borderGold, border: t.border, shadow: t.ink,
  };
}
let C = buildC(THEMES.light);
function getStyles(C: ReturnType<typeof buildC>) { return StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  // ── Hero ──
  hero: {
    width: '100%',
    paddingBottom: 36,
    overflow: 'hidden',
    position: 'relative',
  },
  orbTopRight: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(199,168,75,0.08)',
  },
  orbBottomLeft: {
    position: 'absolute', bottom: -40, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(199,168,75,0.05)',
  },
  heroGoldLine: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 1.5, backgroundColor: 'rgba(199,168,75,0.3)',
  },
  heroInner: {
    alignItems: 'center',
    paddingTop: 32,
    paddingHorizontal: 24,
  },
  settingsIcon: {
    position: 'absolute', top: 16, right: 20,
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },

  // Avatar
  avatarRing: { marginBottom: 16 },
  avatarGradientRing: {
    width: 108, height: 108, borderRadius: 54,
    padding: 3, alignItems: 'center', justifyContent: 'center',
  },
  avatarInner: {
    width: 102, height: 102, borderRadius: 51,
    backgroundColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarInitials: {
    fontSize: 38, fontWeight: '700',
    color: C.gold, letterSpacing: 1,
  },

  // Name / badge
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(199,168,75,0.12)',
    borderWidth: 1, borderColor: 'rgba(199,168,75,0.25)',
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 14,
  },
  heroBadgeDot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold,
  },
  heroBadgeText: {
    fontSize: 9, fontWeight: '700', letterSpacing: 2,
    color: C.gold, textTransform: 'uppercase',
  },
  heroName: {
    fontSize: 34, fontWeight: '800', color: '#FFFCF8',
    letterSpacing: -0.5, lineHeight: 38,
  },
  heroLastName: {
    fontSize: 28, fontWeight: '600', color: C.goldWarm,
    letterSpacing: -0.3, marginBottom: 8,
  },
  heroEmail: {
    fontSize: 12, color: 'rgba(255,252,248,0.45)', letterSpacing: 0.3,
  },

  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 20, marginTop: -1,
    backgroundColor: C.surface,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    shadowColor: C.shadow, shadowOpacity: 0.06,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 3, overflow: 'hidden',
  },
  statCard: {
    flex: 1, alignItems: 'center',
    paddingVertical: 20, gap: 5,
  },
  statIconWrap: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.goldSoft,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 2,
  },
  statNum: {
    fontSize: 26, fontWeight: '800',
    color: C.ink, lineHeight: 30,
  },
  statLabel: {
    fontSize: 9, fontWeight: '700',
    letterSpacing: 1.5, textTransform: 'uppercase', color: C.inkLight,
  },
  statsDivider: {
    width: 1, backgroundColor: C.border, marginVertical: 16,
  },

  // ── Section ──
  section: { paddingHorizontal: 20, paddingTop: 28 },
  sectionHead: {
    flexDirection: 'row', alignItems: 'center',
    gap: 8, marginBottom: 12,
  },
  sectionDot: {
    width: 5, height: 5, borderRadius: 3, backgroundColor: C.gold,
  },
  sectionLabel: {
    fontSize: 9, fontWeight: '800',
    letterSpacing: 2.5, textTransform: 'uppercase', color: C.gold,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: C.border },

  // ── Menu Card ──
  menuCard: {
    backgroundColor: C.surface, borderRadius: 18,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
    shadowColor: C.shadow, shadowOpacity: 0.04,
    shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 15, gap: 14,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  menuIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: C.goldSoft, borderWidth: 1, borderColor: C.goldBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  menuText: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 2 },
  menuSub: { fontSize: 11, color: C.inkLight, lineHeight: 15 },
  menuRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  menuBadge: {
    backgroundColor: C.gold, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2, minWidth: 22, alignItems: 'center',
  },
  menuBadgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  version: {
    textAlign: 'center', fontSize: 10,
    color: C.inkLight, marginTop: 32, letterSpacing: 0.5,
  },
});
}

let styles = getStyles(C);

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture: string | null;
};

// ── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIconWrap}>
        <Ionicons name={icon as any} size={18} color={C.gold} />
      </View>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Menu Row ───────────────────────────────────────────────────────────────────
function MenuRow({
  icon, title, subtitle, badge, onPress, isLast = false,
}: {
  icon: React.ReactNode; title: string; subtitle?: string;
  badge?: string | number; onPress: () => void; isLast?: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[styles.menuItem, !isLast && styles.menuItemBorder]}
        onPress={press}
        activeOpacity={1}
      >
        <View style={styles.menuIconWrap}>{icon}</View>
        <View style={styles.menuText}>
          <Text style={styles.menuTitle}>{title}</Text>
          {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
        </View>
        <View style={styles.menuRight}>
          {!!badge && badge !== 0 && (
            <View style={styles.menuBadge}>
              <Text style={styles.menuBadgeText}>{badge}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={15} color={C.goldWarm} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ── Section Header ─────────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionDot} />
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ── Main Profile ───────────────────────────────────────────────────────────────
export default function Profile({ navigation, setNavbarVisible }: any) {
  const { theme } = useAppTheme(); C = buildC(theme); styles = getStyles(C);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const insets = useSafeAreaInsets();
  const lastScrollY = useRef(0);
  const navbarVisibleRef = useRef(true);
  const headerAnim = useRef(new Animated.Value(0)).current;

  const handleScroll = (event: any) => {
    const y = event.nativeEvent.contentOffset.y;
    Animated.timing(headerAnim, { toValue: Math.min(y / 120, 1), duration: 0, useNativeDriver: false }).start();
    if (y <= 20) { navbarVisibleRef.current = true; setNavbarVisible?.(true); lastScrollY.current = y; return; }
    const diff = y - lastScrollY.current;
    if (Math.abs(diff) < 10) return;
    if (diff > 0 && navbarVisibleRef.current) { navbarVisibleRef.current = false; setNavbarVisible?.(false); }
    else if (diff < 0 && !navbarVisibleRef.current) { navbarVisibleRef.current = true; setNavbarVisible?.(true); }
    lastScrollY.current = y;
  };

  useEffect(() => { fetchUser(); }, []);

  useFocusEffect(React.useCallback(() => { fetchCounts(); }, []));

  useEffect(() => {
    const t = setInterval(fetchCounts, 3000);
    return () => clearInterval(t);
  }, []);

  async function fetchCounts() {
    try {
      const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
      setSavedCount(saved.length);
    } catch {}
  }

  async function fetchUser() {
    setLoading(true);
    try {
      const { data: { user: auth } } = await supabase.auth.getUser();
      if (!auth) return;
      const { data } = await supabase.from('users').select('*').eq('id', auth.id).single();
      setUser(data);
    } catch {}
    finally { setLoading(false); }
  }

  if (loading) {
    return <SafeAreaView style={styles.center}><Loading text="Loading profile…" /></SafeAreaView>;
  }
  if (!user) {
    return <SafeAreaView style={styles.center}><Text style={{ color: C.inkMid }}>No user found</Text></SafeAreaView>;
  }

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  const fullName = `${user.first_name} ${user.last_name}`.trim();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        onScroll={handleScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero ── */}
        <View style={styles.hero}>
          <LinearGradient
            colors={['#1E1B17', '#2C2720', '#3A3228']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Decorative gold orbs */}
          <View style={styles.orbTopRight} />
          <View style={styles.orbBottomLeft} />

          {/* Gold shimmer line */}
          <View style={styles.heroGoldLine} />

          <View style={styles.heroInner}>
            {/* Avatar */}
            <View style={styles.avatarRing}>
              <LinearGradient
                colors={[C.gold, C.goldWarm, '#B8922E']}
                style={styles.avatarGradientRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.avatarInner}>
                  {user.profile_picture ? (
                    <Avatar source={{ uri: user.profile_picture }} size="large" />
                  ) : (
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  )}
                </View>
              </LinearGradient>
            </View>

            {/* Name & badge */}
            <View style={styles.heroBadge}>
              <View style={styles.heroBadgeDot} />
              <Text style={styles.heroBadgeText}>SACRED HERITAGE MEMBER</Text>
            </View>

            <Text style={styles.heroName}>{user.first_name}</Text>
            <Text style={styles.heroLastName}>{user.last_name}</Text>
            <Text style={styles.heroEmail}>{user.email}</Text>
          </View>

          {/* Settings shortcut */}
          <TouchableOpacity
            style={styles.settingsIcon}
            onPress={() => navigation?.navigate?.('SettingsRoot')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>

        {/* ── Stats Strip ── */}
        <View style={styles.statsRow}>
          <StatCard value={savedCount} label="Saved" icon="bookmark-outline" />
          <View style={styles.statsDivider} />
          <StatCard value="∞" label="Collection" icon="library-outline" />
        </View>

        {/* ── My Collection ── */}
        <View style={styles.section}>
          <SectionHeader title="MY COLLECTION" />
          <View style={styles.menuCard}>
            <MenuRow
              icon={<Ionicons name="bookmark" size={19} color={C.gold} />}
              title="Saved Artifacts"
              subtitle={savedCount > 0 ? `${savedCount} artifact${savedCount !== 1 ? 's' : ''} bookmarked` : 'No saved artifacts yet'}
              badge={savedCount || undefined}
              onPress={() => navigation?.navigate?.('SavedArtifacts')}
            />
            <MenuRow
              icon={<Ionicons name="library" size={19} color={C.gold} />}
              title="Artifact Collection"
              subtitle="Browse all scanned artifacts"
              onPress={() => navigation?.navigate?.('CollectionPage')}
              isLast
            />
          </View>
        </View>

        {/* ── Account ── */}
        <View style={styles.section}>
          <SectionHeader title="ACCOUNT" />
          <View style={styles.menuCard}>
            <MenuRow
              icon={<Ionicons name="person-outline" size={19} color={C.gold} />}
              title="Personal Information"
              onPress={() => navigation?.navigate?.('PersonalInfo')}
            />
            <MenuRow
              icon={<Ionicons name="settings-outline" size={19} color={C.gold} />}
              title="Settings & Preferences"
              onPress={() => navigation?.navigate?.('SettingsRoot')}
              isLast
            />
          </View>
        </View>

        <Text style={styles.version}>Version 2.0.0 · Sacred Heritage</Text>
      </ScrollView>
    </SafeAreaView>
  );
}