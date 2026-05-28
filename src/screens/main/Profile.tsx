import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ImageBackground,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';
import { STORAGE_KEYS, getStringArray } from '../../utils/storage';
import { Loading, Avatar } from '../../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// Design Tokens
// ─────────────────────────────────────────────
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
  
  bg: '#FFFCF8',
  surface: '#FFFFFF',
  ink: '#1E1B17',
  inkMid: '#5C564B',
  inkLight: '#9B948A',
  gold: '#C7A84B',
  goldSoft: '#FDF8F0',
  border: '#EAE5DF',
  danger: '#E74C3C',
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
function StatItem({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon as any} size={22} color={C.gold} />
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
        {badge !== undefined && badge !== 0 && (
          <View style={styles.menuBadge}>
            <Text style={styles.menuBadgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
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
// Main Profile
// ─────────────────────────────────────────────
export default function Profile({ navigation }: any) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCount, setSavedCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    fetchUser();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      fetchCounts();
    }, [])
  );

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
    } catch (error) {
      console.error('Error fetching user:', error);
    } finally {
      setLoading(false);
    }
  }

  const goToSettings = () => {
    navigation?.navigate?.('SettingsRoot');
  };

  const getFullName = (first: string, last: string) => {
    return `${first} ${last}`.trim();
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
        <Text style={{ color: C.textSecondary }}>No user found</Text>
      </SafeAreaView>
    );
  }

  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
  const fullName = getFullName(user.first_name, user.last_name);
  const isLongName = fullName.split(' ').length > 3 || fullName.length > 20;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero with Background Image ─── */}
        <ImageBackground
          source={require('../../assets/Signin.jpg')}
          style={styles.heroBg}
          imageStyle={styles.heroBgImage}
        >
          <LinearGradient
            colors={[
              'rgba(255, 252, 248, 0.92)',
              'rgba(255, 252, 248, 0.85)',
              'rgba(255, 252, 248, 0.78)',
            ]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          
          <View style={styles.heroContent}>
            {/* Avatar Section */}
            <View style={styles.avatarSection}>
              <View style={styles.avatarCircle}>
                {user.profile_picture ? (
                  <Avatar source={{ uri: user.profile_picture }} size="large" />
                ) : (
                  <Text style={styles.avatarInitials}>{initials}</Text>
                )}
              </View>
            </View>

            {/* Name Section */}
            <View style={styles.nameSection}>
              {isLongName ? (
                <>
                  <Text style={styles.firstNameLarge} numberOfLines={1} adjustsFontSizeToFit>
                    {user.first_name}
                  </Text>
                  <Text style={styles.lastNameLarge} numberOfLines={1} adjustsFontSizeToFit>
                    {user.last_name}
                  </Text>
                </>
              ) : (
                <Text style={styles.fullName} numberOfLines={2} adjustsFontSizeToFit>
                  {fullName}
                </Text>
              )}
              <Text style={styles.emailText}>{user.email}</Text>
            </View>
          </View>
        </ImageBackground>

        {/* Stats Strip */}
        <View style={styles.statsStrip}>
          <StatItem value={savedCount} label="Saved" icon="bookmark-outline" />
          <View style={styles.statDivider} />
          <StatItem value={favoriteCount} label="Favorites" icon="heart-outline" />
          <View style={styles.statDivider} />
          <StatItem value="3" label="Tours" icon="compass-outline" />
        </View>

        {/* My Collection Section */}
        <View style={styles.sectionWrap}>
          <SectionHeader title="MY COLLECTION" />
          <View style={styles.menuCard}>
            <MenuRow
              icon={<Ionicons name="bookmark-outline" size={20} color={C.gold} />}
              title="Saved Artifacts"
              subtitle={`${savedCount} artifact${savedCount !== 1 ? 's' : ''} in your collection`}
              badge={savedCount}
              onPress={() => navigation?.navigate?.('SavedArtifacts')}
            />
            <MenuRow
              icon={<Ionicons name="heart-outline" size={20} color={C.gold} />}
              title="Favorite Pieces"
              subtitle={`${favoriteCount} favorite${favoriteCount !== 1 ? 's' : ''} you've liked`}
              badge={favoriteCount}
              onPress={() => navigation?.navigate?.('FavoriteArtifacts')}
              isLast
            />
          </View>
        </View>

        {/* Settings Button */}
        <TouchableOpacity style={styles.settingsBtn} onPress={goToSettings} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="settings-outline" size={18} color={C.textPrimary} />
            <Text style={styles.settingsBtnLabel}>Settings & Preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
        </TouchableOpacity>

        {/* Version Info */}
        <Text style={styles.versionText}>Version 2.0.0 • Sacred Heritage</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.backgroundLight,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: C.backgroundLight,
  },

  // ── Hero with Background ──
  heroBg: {
    width: '100%',
    paddingBottom: 32,
  },
  heroBgImage: {
    opacity: 0.15,
    resizeMode: 'cover',
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: C.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 3,
    borderColor: C.surfaceLight,
    shadowColor: C.shadowLight,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarInitials: {
    fontSize: 36,
    fontWeight: '600',
    color: C.surfaceLight,
    letterSpacing: 1,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.goldSoft,
    borderWidth: 1,
    borderColor: C.accentWarm,
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  memberDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.gold,
  },
  memberBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.gold,
  },
  nameSection: {
    alignItems: 'center',
    gap: 6,
  },
  fullName: {
    fontSize: 32,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  firstNameLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: C.textPrimary,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  lastNameLarge: {
    fontSize: 28,
    fontWeight: '600',
    color: C.gold,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  emailText: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 6,
  },

  // ── Stats Strip ──
  statsStrip: {
    flexDirection: 'row',
    paddingVertical: 24,
    paddingHorizontal: 24,
    backgroundColor: C.surfaceLight,
    marginHorizontal: 20,
    marginTop: -20,
    borderRadius: 20,
    shadowColor: C.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: C.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statNum: {
    fontSize: 28,
    fontWeight: '700',
    color: C.textPrimary,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: C.textMuted,
  },
  statDivider: {
    width: 1,
    backgroundColor: C.border,
    marginVertical: 8,
  },

  // ── Section ──
  sectionWrap: {
    paddingHorizontal: 20,
    paddingTop: 28,
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
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: C.gold,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  menuCard: {
    backgroundColor: C.surfaceLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
    marginBottom: 2,
  },
  menuSub: {
    fontSize: 12,
    fontWeight: '400',
    color: C.textMuted,
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuBadge: {
    backgroundColor: C.gold,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  menuBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.surfaceLight,
  },
  settingsBtn: {
    marginHorizontal: 20,
    marginTop: 28,
    backgroundColor: C.surfaceLight,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsBtnLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: C.textMuted,
    marginTop: 24,
    marginBottom: 16,
  },
});