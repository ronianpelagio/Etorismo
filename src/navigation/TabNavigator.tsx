import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Screens
import Home from '../screens/main/Home';
import QRScanner from '../screens/main/QRScanner';
import Profile from '../screens/main/Profile';
import Settings from '../screens/main/Settings';



const { width } = Dimensions.get('window');

// ─────────────────────────────────────────────
// Design Tokens
// ─────────────────────────────────────────────
const V = {
  ink: '#111',
  muted: 'rgba(0,0,0,0.4)',
};

// ─────────────────────────────────────────────
// Tabs (excluding center scan)
// ─────────────────────────────────────────────
const TABS = [
  {
    key: 'Home',
    label: 'Home',
    icon: (focused: boolean) => (
      <Ionicons
        name={focused ? 'home' : 'home-outline'}
        size={20}
        color={focused ? V.ink : V.muted}
      />
    ),
  },
  {
    key: 'Profile',
    label: 'Profile',
    icon: (focused: boolean) => (
      <Ionicons
        name={focused ? 'person' : 'person-outline'}
        size={20}
        color={focused ? V.ink : V.muted}
      />
    ),
  },
];

// ─────────────────────────────────────────────
// MAIN NAVIGATOR (Swipe Enabled)
// ─────────────────────────────────────────────
export default function TabNavigator() {
  const pagerRef = useRef<PagerView>(null);
  const [index, setIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const insets = useSafeAreaInsets();

  const goToPage = (i: number) => {
    pagerRef.current?.setPage(i);
    setIndex(i);
    if (i !== 2) {
      setShowSettings(false);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View style={{ flex: 1 }}>
      
      {/* SWIPE PAGES */}
      <PagerView
        ref={pagerRef}
        style={{ flex: 1 }}
        initialPage={0}
        onPageSelected={(e) => setIndex(e.nativeEvent.position)}
      >
        <View key="0">
          <Home />
        </View>

        <View key="1">
          <QRScanner />
        </View>

        <View key="2">
          <SettingsStack />
        </View>
      </PagerView>

      {/* FLOATING TAB BAR */}
      <View style={[styles.wrapper, { bottom: insets.bottom + 12 }]}>
        <BlurView intensity={30} tint="light" style={styles.glass}>

          {/* LEFT TAB */}
          <TabItem
            tab={TABS[0]}
            isFocused={index === 0}
            onPress={() => goToPage(0)}
          />

          {/* CENTER SPACE (for floating button) */}
          <View style={{ width: 64 }} />

          {/* RIGHT TAB */}
          <TabItem
            tab={TABS[1]}
            isFocused={index === 2}
            onPress={() => goToPage(2)}
          />
        </BlurView>

        {/* CENTER FLOATING SCAN BUTTON */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => goToPage(1)}
          style={styles.scanButton}
        >
          <Ionicons name="scan" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
// ─────────────────────────────────────────────
// Settings Stack (handles Profile, Settings, and Collection)
// ─────────────────────────────────────────────
import SettingsStack from './SettingsStack';


// ─────────────────────────────────────────────
// Tab Item
// ─────────────────────────────────────────────
function TabItem({ tab, isFocused, onPress }: any) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: isFocused ? 1.08 : 1,
      useNativeDriver: true,
    }).start();
  }, [isFocused]);

  return (
    <TouchableOpacity onPress={onPress} style={styles.tab}>
      <Animated.View style={{ transform: [{ scale }] }}>
        {tab.icon(isFocused)}
      </Animated.View>

      <Text style={[styles.label, { opacity: isFocused ? 1 : 0.5 }]}>
        {tab.label}
      </Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// Styles (Modern Museum Minimal)
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },

  glass: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 28,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',

    backgroundColor: 'rgba(255,255,255,0.25)',

    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.3)',

    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  label: {
    fontSize: 9,
    marginTop: 2,
    color: '#111',
  },

  // 🔥 CENTER FLOATING BUTTON
  scanButton: {
    position: 'absolute',
    top: -15,

    width: 56,
    height: 56,
    borderRadius: 28,

    backgroundColor: '#111',

    alignItems: 'center',
    justifyContent: 'center',

    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
});