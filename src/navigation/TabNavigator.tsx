import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Screens
import Home from '../screens/main/Home';
import QRScanner from '../screens/main/QRScanner';
import SettingsStack from './SettingsStack';

// ─────────────────────────────────────────────
// SACRED HERITAGE THEME TOKENS
// ─────────────────────────────────────────────
const COLORS = {
  // Light, warm background (from HomeScreen)
  background: '#FFFCF8',  // Creamy off-white
  
  // Glass surface colors
  surface: 'rgba(255,255,255,0.85)',
  border: '#EAE5DF',  // Subtle warm border
  borderLight: 'rgba(199,168,75,0.25)', // Gold-tinted border
  
  // Text colors (from HomeScreen palette)
  textPrimary: '#1E1B17',  // Deep warm black
  textSecondary: '#5C564B',  // Warm taupe
  textMuted: '#9B948A',  // Soft warm gray
  
  // Brand accent - Gold (from HomeScreen)
  gold: '#C7A84B',
  goldWarm: '#D4B86A',
  goldSoft: '#FDF8F0',
  
  // Crimson for special actions
  crimson: '#E74C3C',
  
  // Shadow color
  shadow: '#1E1B17',
};

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
const TABS = [
  {
    key: 'Home',
    label: 'Home',
    activeIcon: 'home',
    inactiveIcon: 'home-outline',
  },
  {
    key: 'Settings',
    label: 'Settings',
    activeIcon: 'grid',
    inactiveIcon: 'grid-outline',
  },
];

// ─────────────────────────────────────────────
// MAIN NAVIGATOR
// ─────────────────────────────────────────────
export default function TabNavigator() {
  const pagerRef = useRef<PagerView>(null);
  const insets = useSafeAreaInsets();

  const [index, setIndex] = useState(0);
  const [navbarVisible, setNavbarVisible] = useState(true);

  const navbarTranslate = useRef(new Animated.Value(0)).current;
  const navbarOpacity = useRef(new Animated.Value(1)).current;

  // ─────────────────────────────
  // NAVBAR ANIMATION
  // ─────────────────────────────
  useEffect(() => {
    Animated.parallel([
      Animated.timing(navbarTranslate, {
        toValue: navbarVisible ? 0 : 120,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(navbarOpacity, {
        toValue: navbarVisible ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [navbarVisible]);

  // ─────────────────────────────
  // NAVIGATION
  // ─────────────────────────────
  const goToPage = async (i: number) => {
    pagerRef.current?.setPage(i);
    setIndex(i);

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      
      {/* PAGES */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) =>
          setIndex(e.nativeEvent.position)
        }
      >
        <View key="0">
          <Home setNavbarVisible={setNavbarVisible} />
        </View>

        <View key="1">
          <QRScanner />
        </View>

        <View key="2">
          <SettingsStack />
        </View>
      </PagerView>

      {/* ─────────────────────────────
          ANIMATED NAVBAR
      ───────────────────────────── */}
      <Animated.View
        pointerEvents={navbarVisible ? 'auto' : 'none'}
        style={[
          styles.navWrapper,
          {
            bottom:
              insets.bottom > 0
                ? insets.bottom + 8
                : 18,
            opacity: navbarOpacity,
            transform: [
              { translateY: navbarTranslate },
            ],
          },
        ]}
      >
        {/* GLASS BAR - SACRED HERITAGE STYLE */}
        <BlurView intensity={35} tint="light" style={styles.navbar}>
          
          {/* HOME */}
          <TabItem
            label={TABS[0].label}
            activeIcon={TABS[0].activeIcon}
            inactiveIcon={TABS[0].inactiveIcon}
            focused={index === 0}
            onPress={() => goToPage(0)}
          />

          <View style={{ width: 80 }} />

          {/* SETTINGS */}
          <TabItem
            label={TABS[1].label}
            activeIcon={TABS[1].activeIcon}
            inactiveIcon={TABS[1].inactiveIcon}
            focused={index === 2}
            onPress={() => goToPage(2)}
          />
        </BlurView>

        {/* CENTER BUTTON - GOLD ACCENT */}
        <TouchableOpacity
          activeOpacity={0.9}
          style={[
            styles.scanButton,
            index === 1 && styles.scanButtonActive
          ]}
          onPress={() => goToPage(1)}
        >
          <View style={styles.scanGlow} />
          <Ionicons
            name={index === 1 ? 'scan' : 'scan-outline'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────
// TAB ITEM - WITH GOLD ACCENTS
// ─────────────────────────────────────────────
function TabItem({
  label,
  activeIcon,
  inactiveIcon,
  focused,
  onPress,
}: any) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.55)).current;
  const goldGlow = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.08 : 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.55,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(goldGlow, {
        toValue: focused ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [focused]);

  const iconColor = goldGlow.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.textMuted, COLORS.gold],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.tabButton}
    >
      <Animated.View
        style={{
          alignItems: 'center',
          transform: [{ scale }],
          opacity,
        }}
      >
        {focused && <View style={styles.activeDot} />}

        <Animated.View>
          <Ionicons
            name={focused ? activeIcon : inactiveIcon}
            size={21}
            color={focused ? COLORS.gold : COLORS.textMuted}
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.label,
            {
              color: focused ? COLORS.gold : COLORS.textMuted,
              fontWeight: focused ? '700' : '500',
            },
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// STYLES - SACRED HERITAGE THEME
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  navWrapper: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },

  navbar: {
    width: '100%',
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderWidth: 1,
    borderColor: '#EAE5DF',
    paddingHorizontal: 6,
    shadowColor: '#1E1B17',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    marginTop: 2,
    fontSize: 9,
    letterSpacing: 0.5,
  },

  activeDot: {
    position: 'absolute',
    top: -5,
    width: 4,
    height: 4,
    borderRadius: 10,
    backgroundColor: '#C7A84B', // Gold accent
  },

  scanButton: {
    position: 'absolute',
    top: -18,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1E1B17', // Deep warm black (ink)
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFCF8', // Matches background
    shadowColor: '#1E1B17',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  scanButtonActive: {
    backgroundColor: '#C7A84B', // Gold when active
  },

  scanGlow: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(199,168,75,0.15)',
    transform: [{ scale: 1.12 }],
  },
});