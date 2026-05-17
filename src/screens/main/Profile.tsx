import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { supabase } from '../../services/supabase';
import { STORAGE_KEYS, getStringArray } from '../../utils/storage';
import { Loading, Avatar, Button, ListItem } from '../../components';

// ─────────────────────────────────────────────
// Design Tokens (Consistent with app)
// ─────────────────────────────────────────────
const C = {
  bg:       '#F7F4EF',
  surface:  '#FFFFFF',
  ink:      '#1A1612',
  inkMid:   '#6B6459',
  inkLight: '#A89F96',
  gold:     '#C9A84C',
  goldSoft: '#F5EDD8',
  border:   '#EAE4DA',
  danger:   '#C0392B',
};

type UserProfile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  profile_picture: string | null;
};

// ─────────────────────────────────────────────
// StatItem
// ─────────────────────────────────────────────
function StatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statNum}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// MenuRow
// ─────────────────────────────────────────────
function MenuRow({
  icon,
  title,
  subtitle,
  badge,
  onPress,
  isLast = false,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string | number;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !isLast && styles.menuItemBorder]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuIconWrap}>{icon}</View>
      <View style={styles.menuText}>
        <Text style={styles.menuTitle}>{title}</Text>
        {subtitle ? <Text style={styles.menuSub}>{subtitle}</Text> : null}
      </View>
      <View style={styles.menuRight}>
        {badge !== undefined && (
          <Text style={styles.menuBadge}>{badge}</Text>
        )}
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// SectionHeader
// ─────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHead}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ─────────────────────────────────────────────
// Main Profile (IMPROVED NAME HANDLING)
// ─────────────────────────────────────────────
export default function Profile({ navigation, onOpenSettings }: any) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchUser();
  }, []);

  // Refresh saved/favorite counts whenever screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchCounts();
    }, [])
  );

  // Auto-refresh counts every 2 seconds while screen is visible
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCounts();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  async function fetchCounts() {
    try {
      const saved = await getStringArray(STORAGE_KEYS.savedArtifacts);
      const favorited = await getStringArray(STORAGE_KEYS.favoriteArtifacts);
      setSavedCount(saved.length);
      setFavoriteCount(favorited.length);
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  }

  async function fetchUser() {
    setLoading(true);
    try {
      const { data: { user: auth } } = await supabase.auth.getUser();
      if (!auth) return;
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', auth.id)
        .single();
      setUser(data);
    } finally {
      setLoading(false);
    }
  }

  const goToSettings = () => {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
    if (navigation?.navigate) {
      navigation.navigate('Settings');
    }
  };

  const showPlaceholder = (feature: string) => {
    Alert.alert(feature, 'This screen will be available soon.');
  };

  // ───────── IMPROVED NAME HANDLING ─────────
  const getFullName = (first: string, last: string) => {
    const fullName = `${first} ${last}`.trim();
    return fullName;
  };

  const getNameDisplay = (first: string, last: string, maxLines: number = 2) => {
    const fullName = getFullName(first, last);
    
    // Split into words for better line breaking
    const words = fullName.split(' ');
    
    // Strategy 1: Try full name first (short names ≤3 words)
    if (words.length <= 3) {
      return {
        displayName: fullName,
        style: styles.fullName,
        numberOfLines: maxLines,
      };
    }
    
    // Strategy 2: First name on top, last name below (longer names)
    return {
      displayName: first,
      style: styles.firstNameLarge,
      subName: last,
      subStyle: styles.lastNameLarge,
      numberOfLines: maxLines,
    };
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Loading text="Loading profile…" />
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={{ color: C.inkMid }}>No user found</Text>
      </SafeAreaView>
    );
  }

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  const nameDisplay = getNameDisplay(user.first_name,user.last_name);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ───────── HERO ───────── */}
        <View style={styles.hero}>
          {/* Member label */}
          <Text style={styles.heroTopLabel}>Member Profile</Text>

          {/* Avatar + meta row */}
          <View style={styles.avatarRow}>
            <View style={styles.avatarCircle}>
              {user.profile_picture ? (
                <Avatar
                  source={{ uri: user.profile_picture }}
                  size="large"
                />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.avatarMeta}>
              <View style={styles.memberBadge}>
                <View style={styles.memberDot} />
                <Text style={styles.memberBadgeText}>Patron</Text>
              </View>
              <Text style={styles.emailLabel}>{user.email}</Text>
            </View>
          </View>

          {/* ───────── IMPROVED NAME BLOCK ───────── */}
          <View style={styles.nameBlock}>
            {nameDisplay.style === styles.fullName ? (
              // Single full name display (short names)
              <Text 
                style={nameDisplay.style} 
                numberOfLines={nameDisplay.numberOfLines}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.6}
              >
                {nameDisplay.displayName}
              </Text>
            ) : (
              // Stacked first/last name display (long names)
              <>
                <Text 
                  style={nameDisplay.style}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.65}
                >
                  {nameDisplay.displayName}
                </Text>
                <Text 
                  style={nameDisplay.subStyle}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.65}
                >
                  {nameDisplay.subName}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* ───────── DIVIDER ───────── */}
        <View style={styles.divider} />

        {/* ───────── STATS STRIP ───────── */}
        <View style={styles.statsStrip}>
          <StatItem value={savedCount} label="Saved" />
          <View style={styles.statDivider} />
          <StatItem value={favoriteCount} label="Favorites" />
          <View style={styles.statDivider} />
          <StatItem value={3} label="Tours" />
        </View>

        {/* ───────── DIVIDER ───────── */}
        <View style={styles.divider} />

        {/* ───────── MY COLLECTION ───────── */}
        <View style={styles.sectionWrap}>
          <SectionHeader title="MY COLLECTION" />
          <View style={styles.menuCard}>
            <MenuRow
              icon={<Text style={styles.menuIconText}>⊞</Text>}
              title="Saved Artifacts"
              subtitle={`${savedCount} artifact${savedCount !== 1 ? 's' : ''}`}
              badge={savedCount}
              onPress={() => navigation?.navigate?.('SavedArtifacts')}
            />
            <MenuRow
              icon={<Text style={styles.menuIconText}>♡</Text>}
              title="Favorite Pieces"
              subtitle={`${favoriteCount} favorite${favoriteCount !== 1 ? 's' : ''}`}
              badge={favoriteCount}
              onPress={() => navigation?.navigate?.('FavoriteArtifacts')}
              isLast
            />
          </View>
        </View>

        {/* ───────── ACCOUNT ───────── */}
        <View style={[styles.sectionWrap, { marginTop: 20 }]}>
          <SectionHeader title="ACCOUNT" />
          <View style={styles.menuCard}>
            <MenuRow
              icon={<Text style={styles.menuIconText}>△</Text>}
              title="Edit Profile"
              subtitle={user.email}
              onPress={() => {
                navigation?.navigate?.('Settings', { screen: 'PersonalInfo' });
              }}
              isLast
            />
          </View>
        </View>

        {/* ───────── SETTINGS BUTTON ───────── */}
        <TouchableOpacity style={styles.settingsBtn} onPress={goToSettings} activeOpacity={0.7}>
          <Text style={styles.settingsBtnLabel}>SETTINGS</Text>
          <Text style={styles.settingsBtnArrow}>→</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// COMPLETE STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.bg,
  },

  // ── Hero ──
  hero: {
    paddingHorizontal: 28,
    paddingTop: 28,
    paddingBottom: 32,
  },
  heroTopLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3.2,
    color: C.gold,
    textTransform: 'uppercase',
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 20,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '600',
    color: C.surface,
    letterSpacing: 1,
  },
  avatarMeta: {
    paddingBottom: 6,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 0.5,
    borderColor: C.gold,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  memberDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.gold,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: C.gold,
  },
  emailLabel: {
    fontSize: 13,
    fontWeight: '400',
    color: C.inkMid,
  },

  // ───────── UPDATED NAME STYLES ─────────
  nameBlock: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
    paddingTop: 20,
    minHeight: 96,
  },
  fullName: {
    fontSize: 46,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 48,
    letterSpacing: -0.5,
    includeFontPadding: false,
  },
  firstNameLarge: {
    fontSize: 44,
    fontWeight: '700',
    color: C.ink,
    lineHeight: 44,
    letterSpacing: -0.4,
    includeFontPadding: false,
    marginBottom: 2,
  },
  lastNameLarge: {
    fontSize: 44,
    fontWeight: '600',
    color: C.gold,
    lineHeight: 44,
    letterSpacing: -0.4,
    includeFontPadding: false,
  },
  divider: {
    height: 0.5,
    backgroundColor: C.border,
  },

  // ── Stats ──
  statsStrip: {
    flexDirection: 'row',
    paddingVertical: 24,
    paddingHorizontal: 28,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 32,
    fontWeight: '600',
    color: C.ink,
    lineHeight: 36,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.inkMid,
  },
  statDivider: {
    width: 0.5,
    backgroundColor: C.border,
    marginVertical: 4,
  },

  // ── Section ──
  sectionWrap: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: C.gold,
  },
  sectionLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: C.border,
  },
  menuCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 0.5,
    borderColor: C.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconText: {
    fontSize: 17,
    color: C.gold,
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
    marginBottom: 1,
  },
  menuSub: {
    fontSize: 12,
    fontWeight: '400',
    color: C.inkMid,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  menuBadge: {
    fontSize: 18,
    fontWeight: '600',
    color: C.gold,
  },
  chevron: {
    fontSize: 20,
    color: C.inkLight,
    lineHeight: 22,
  },
  settingsBtn: {
    marginHorizontal: 28,
    marginTop: 24,
    borderWidth: 0.5,
    borderColor: C.ink,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsBtnLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: C.ink,
  },
  settingsBtnArrow: {
    fontSize: 18,
    color: C.inkMid,
  },
});