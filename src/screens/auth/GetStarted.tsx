import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, Image,
  Dimensions, TouchableOpacity, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const C = {
  bg:       '#F7F4EF',
  surface:  '#FFFFFF',
  ink:      '#1A1612',
  inkMid:   '#6B6459',
  inkLight: '#A89F96',
  gold:     '#C9A84C',
  goldSoft: '#F5EDD8',
  border:   '#EAE4DA',
};

const PAGES = [
  {
    eyebrow: '— Sacred Spaces',
    title:   'Explore\nSacred Places',
    sub:     'Discover churches, artifacts, and heritage sites from anywhere in the world.',
    image:   require('../../assets/1.jpg'),
  },
  {
    eyebrow: '— Always Available',
    title:   'Works Offline\n& Online',
    sub:     'Access the full collection even without an internet connection.',
    image:   require('../../assets/Onboarding1.jpg'),
  },
  {
    eyebrow: '— Digital Artifacts',
    title:   'Experience\nDigitalize museum',
    sub:     'View 3D models of artifacts up close, with detailed descriptions and audio guides.',
    image:   require('../../assets/Onboarding2.jpg'),
  },
];

export default function GetStarted({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);

  // Slide animation
  const slideX = useRef(new Animated.Value(0)).current;

  // Per-page content fade
  const contentOpacity = useRef(new Animated.Value(1)).current;

  // Gold line width for active dot
  const dotWidths = PAGES.map((_, i) => useRef(new Animated.Value(i === 0 ? 28 : 8)).current);

  // Entrance animation on mount
  const entranceY   = useRef(new Animated.Value(30)).current;
  const entranceOp  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceY,  { toValue: 0, duration: 600, useNativeDriver: true }),
      Animated.timing(entranceOp, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  const goToPage = (next: number) => {
    const idx = Math.max(0, Math.min(next, PAGES.length - 1));

    // Fade content out, slide, fade back in
    Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setPage(idx);
      Animated.spring(slideX, {
        toValue: -idx * width,
        useNativeDriver: true,
        tension: 80, friction: 14,
      }).start();
      Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });

    // Animate dots
    PAGES.forEach((_, i) => {
      Animated.spring(dotWidths[i], {
        toValue: i === idx ? 28 : 8,
        useNativeDriver: false,
        tension: 160, friction: 14,
      }).start();
    });
  };

  const handleNext = () => {
    if (page < PAGES.length - 1) goToPage(page + 1);
    else navigation.replace('AppIntro');
  };

  const isLast = page === PAGES.length - 1;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Skip ── */}
      {!isLast && (
        <TouchableOpacity
          style={s.skip}
          onPress={() => navigation.replace('AppIntro')}
          activeOpacity={0.7}
        >
          <Text style={s.skipTxt}>Skip</Text>
        </TouchableOpacity>
      )}

      {/* ── Image slider ── */}
      <Animated.View style={[s.slider, { transform: [{ translateX: slideX }] }]}>
        {PAGES.map((p, i) => (
          <View key={i} style={s.slide}>
            <View style={s.imgCard}>
              <Image source={p.image} style={s.img} />
              {/* Gold accent strip at bottom of image */}
              <View style={s.imgStrip} />
            </View>
          </View>
        ))}
      </Animated.View>

      {/* ── Text content ── */}
      <Animated.View
        style={[
          s.content,
          { opacity: contentOpacity, transform: [{ translateY: entranceY }] },
        ]}
      >
        <Text style={s.eyebrow}>{PAGES[page].eyebrow}</Text>
        <Text style={s.title}>{PAGES[page].title}</Text>
        <View style={s.goldLine} />
        <Text style={s.sub}>{PAGES[page].sub}</Text>
      </Animated.View>

      {/* ── Dots ── */}
      <View style={s.dots}>
        {PAGES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goToPage(i)} activeOpacity={0.7}>
            <Animated.View
              style={[
                s.dot,
                { width: dotWidths[i] },
                page === i && s.dotActive,
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Bottom actions ── */}
      <View style={[s.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={s.btn}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={s.btnTxt}>{isLast ? 'Get Started' : 'Next'}</Text>
          <Text style={s.btnArrow}>{isLast ? '✦' : '→'}</Text>
        </TouchableOpacity>

        {!isLast && (
          <View style={s.stepRow}>
            <Text style={s.stepTxt}>{page + 1} of {PAGES.length}</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  // Skip
  skip: { position: 'absolute', top: 56, right: 24, zIndex: 10, paddingVertical: 6, paddingHorizontal: 14 },
  skipTxt: { fontSize: 13, fontWeight: '700', color: C.inkMid, letterSpacing: 0.3 },

  // Slider
  slider: { flexDirection: 'row', width: width * PAGES.length, paddingTop: 24 },
  slide:  { width, alignItems: 'center', paddingHorizontal: 28 },
  imgCard: {
    width: '100%',
    height: height * 0.38,
    borderRadius: 24, overflow: 'hidden',
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1, shadowRadius: 18, elevation: 6,
  },
  img:      { width: '100%', height: '100%', resizeMode: 'cover' },
  imgStrip: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: C.gold },

  // Content
  content: { paddingHorizontal: 32, marginTop: 36 },
  eyebrow: { fontSize: 11, letterSpacing: 2.5, color: C.inkMid, marginBottom: 10 },
  title: {
    fontSize: 36, fontWeight: '800', color: C.ink,
    lineHeight: 42, letterSpacing: -1,
  },
  goldLine: { width: 36, height: 3, backgroundColor: C.gold, borderRadius: 2, marginTop: 16, marginBottom: 14 },
  sub: { fontSize: 15, color: C.inkMid, lineHeight: 23 },

  // Dots
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 28, gap: 6 },
  dot: {
    height: 8, borderRadius: 4,
    backgroundColor: C.border,
  },
  dotActive: { backgroundColor: C.gold },

  // Bottom
  bottom:   { paddingHorizontal: 28, marginTop: 20 },
  btn: {
    backgroundColor: C.ink,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 17, borderRadius: 14, gap: 10,
    shadowColor: C.ink, shadowOpacity: 0.22,
    shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 5,
  },
  btnTxt:   { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  btnArrow: { color: C.gold, fontSize: 15, fontWeight: '700' },
  stepRow:  { alignItems: 'center', marginTop: 16 },
  stepTxt:  { fontSize: 12, color: C.inkLight, letterSpacing: 0.5 },
});