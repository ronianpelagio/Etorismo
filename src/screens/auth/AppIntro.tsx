import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  StatusBar,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AppIntro({ navigation }: any) {
  // Main animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const logoSlideUp = useRef(new Animated.Value(50)).current;
  
  // Text reveal animations
  const titleSlide = useRef(new Animated.Value(30)).current;
  const titleFade = useRef(new Animated.Value(0)).current;
  const taglineSlide = useRef(new Animated.Value(20)).current;
  const taglineFade = useRef(new Animated.Value(0)).current;
  
  // Decorative elements
  const lineWidth = useRef(new Animated.Value(0)).current;
  const dotOpacity = useRef(new Animated.Value(0)).current;
  
  // Background gradient animation
  const bgOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Stage 1: Background & Logo entrance (0-800ms)
    Animated.parallel([
      Animated.timing(bgOpacity, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(logoSlideUp, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    // Stage 2: Title & Line reveal (400-1200ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(titleFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(titleSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(lineWidth, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ]).start();
    }, 400);

    // Stage 3: Tagline & dots reveal (800-1600ms)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineFade, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(taglineSlide, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(dotOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 900);

    // Auto navigate after all animations complete
    const timer = setTimeout(() => {
      // Fade out animation before navigation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        navigation.replace('SignIn');
      });
    }, 2800);

    return () => clearTimeout(timer);
  }, [navigation]);

  // Animated line width interpolation
  const lineWidthInterpolated = lineWidth.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0A0F" />

      {/* Animated Background Gradient */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: bgOpacity }]}>
        <LinearGradient
          colors={['#0A0A0F', '#1A1A2E', '#16213E', '#0A0A0F']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Floating Particles Effect */}
      <View style={styles.particlesContainer}>
        {[...Array(20)].map((_, i) => (
          <Particle key={i} delay={i * 100} />
        ))}
      </View>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          
          {/* Logo Section */}
          <Animated.View
            style={[
              styles.logoContainer,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scaleAnim },
                  { translateY: logoSlideUp },
                ],
              },
            ]}
          >
            {/* Logo with glow effect */}
            <View style={styles.logoWrapper}>
              <View style={styles.logoGlow} />
              <View style={styles.logo}>
                <Text style={styles.logoSymbol}>⛪</Text>
              </View>
            </View>
          </Animated.View>

          {/* Title Section */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                opacity: titleFade,
                transform: [{ translateY: titleSlide }],
              },
            ]}
          >
            <Text style={styles.appName}>eTurismo{'\n'}Dolores</Text>
            
            {/* Animated Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerDot} />
              <Animated.View 
                style={[
                  styles.dividerLine,
                  { width: lineWidthInterpolated },
                ]} 
              />
              <View style={styles.dividerDot} />
            </View>
          </Animated.View>

          {/* Tagline Section */}
          <Animated.View
            style={[
              styles.taglineContainer,
              {
                opacity: taglineFade,
                transform: [{ translateY: taglineSlide }],
              },
            ]}
          >
            <Text style={styles.tagline}>
              Discover Sacred Places • Digitalize Museum • Heritage Sites
            </Text>
          </Animated.View>

          {/* Bottom Dots Indicator */}
          <Animated.View style={[styles.dotsContainer, { opacity: dotOpacity }]}>
            {[0, 1, 2].map((dot) => (
              <View key={dot} style={styles.dot} />
            ))}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Floating Particle Component
function Particle({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: -100,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: Math.random() * 40 - 20,
            duration: 3000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          opacity,
          transform: [{ translateY }, { translateX }],
          left: `${Math.random() * 100}%`,
          top: `${60 + Math.random() * 40}%`,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0F',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  
  // Particles
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  particle: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },

  // Logo
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    transform: [{ scale: 1.5 }],
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  logoSymbol: {
    fontSize: 52,
  },

  // Title
  titleContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 2,
    lineHeight: 52,
    fontFamily: 'System',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  dividerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dividerLine: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 12,
  },

  // Tagline
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  tagline: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 280,
    fontWeight: '400',
    letterSpacing: 0.5,
  },

  // Dots
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    position: 'absolute',
    bottom: 60,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});