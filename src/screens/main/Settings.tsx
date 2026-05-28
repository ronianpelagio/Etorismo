import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../services/supabase';

// ─── Design tokens (matching Profile) ─────────────────────────────────────────────
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
  dangerBg: '#FEF5F4',
};

type RowProps = {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
};

function Row({ icon, label, value, onPress, danger, isLast }: RowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, isLast && styles.rowLast]}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
          <Ionicons name={icon as any} size={18} color={danger ? C.danger : C.gold} />
        </View>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <Ionicons 
          name="chevron-forward" 
          size={16} 
          color={danger ? C.danger : C.textMuted} 
        />
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionLine} />
      </View>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export default function Settings({ navigation, onClose }: any) {
  const rootNavigation = useNavigation();

  const nav = (screen: string) => navigation?.navigate(screen);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await supabase.auth.signOut();
            await new Promise(resolve => setTimeout(resolve, 100));

            let root = rootNavigation;
            while (root.getParent()) {
              root = root.getParent();
            }

            root.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'SignIn' }],
              })
            );
          } catch (error) {
            console.error('Logout error:', error);
            rootNavigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'SignIn' }],
              })
            );
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* ── Hero Header ── */}
        <ImageBackground
          source={require('../../assets/Signin.jpg')}
          style={styles.heroBg}
          imageStyle={styles.heroBgImage}
        >
          <LinearGradient
            colors={[
              'rgba(255, 252, 248, 0.92)',
              'rgba(255, 252, 248, 0.85)',
            ]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => {
                if (onClose) {
                  onClose();
                  return;
                }
                navigation?.goBack();
              }}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color={C.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Settings</Text>
            <View style={{ width: 40 }} />
          </View>
          
          <View style={styles.heroContent}>
            <Text style={styles.heroSubtitle}>Preferences & Configuration</Text>
            <Text style={styles.heroTitle}>Customize{'\n'}Your Experience</Text>
            <View style={styles.heroRule}>
              <View style={styles.heroRuleLine} />
              <Text style={styles.heroRuleDot}>◆</Text>
              <View style={styles.heroRuleLine} />
            </View>
          </View>
        </ImageBackground>

        {/* Menu Section */}
        <Section title="MENU">
          <Row 
            icon="person-outline"
            label="Personal Information" 
            onPress={() => nav('PersonalInfo')} 
          />
          <Row 
            icon="shield-outline"
            label="Password & Security" 
            onPress={() => nav('PasswordSecurity')} 
          />
          <Row 
            icon="mail-outline"
            label="Email Preferences" 
            onPress={() => nav('EmailPrefs')} 
            isLast
          />
        </Section>

        {/* Preferences Section */}
        <Section title="PREFERENCES">
          <Row 
            icon="language-outline"
            label="Language" 
            value="English"  
            onPress={() => nav('Language')} 
          />
          <Row 
            icon="notifications-outline"
            label="Push Notifications" 
            value="On"      
            onPress={() => nav('Notifications')} 
          />
          <Row 
            icon="color-palette-outline"
            label="Theme"             
            value="Light"    
            onPress={() => nav('Theme')} 
            isLast
          />
        </Section>

        {/* Support Section */}
        <Section title="SUPPORT">
          <Row 
            icon="help-circle-outline"
            label="Help & Support"    
            onPress={() => nav('HelpSupport')} 
          />
          <Row 
            icon="document-text-outline"
            label="Terms & Conditions" 
            onPress={() => nav('Terms')} 
          />
          <Row 
            icon="lock-closed-outline"
            label="Privacy Policy"    
            onPress={() => nav('Privacy')} 
            isLast
          />
        </Section>

        {/* About Section */}
        <Section title="ABOUT">
          <Row 
            icon="information-circle-outline"
            label="App Version" 
            value="2.0.0"    
            onPress={() => {}} 
          />
          <Row 
            icon="logo-outline"
            label="Sacred Heritage" 
            value="© 2024"    
            onPress={() => {}} 
            isLast
          />
        </Section>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={20} color={C.danger} />
            <Text style={styles.logoutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Heritage Collection · v2.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.backgroundLight },

  // ── Hero ──
  heroBg: {
    width: '100%',
    paddingBottom: 32,
    marginBottom: 8,
  },
  heroBgImage: {
    opacity: 0.12,
    resizeMode: 'cover',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surfaceLight,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.shadowLight,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.3,
  },
  heroContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  heroSubtitle: {
    fontSize: 9,
    letterSpacing: 4,
    color: C.gold,
    fontWeight: '700',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 38,
    fontWeight: '900',
    color: C.textPrimary,
    lineHeight: 42,
    letterSpacing: -1.5,
    marginBottom: 16,
  },
  heroRule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroRuleLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.gold,
    opacity: 0.3,
  },
  heroRuleDot: {
    fontSize: 7,
    color: C.gold,
  },

  // ── Sections ──
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: C.gold,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  card: {
    backgroundColor: C.surfaceLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },

  // ── Rows ──
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.goldSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: {
    backgroundColor: C.dangerBg,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: C.textPrimary,
  },
  rowLabelDanger: {
    color: C.danger,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowValue: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
  },

  // ── Logout ──
  logoutSection: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  logoutBtn: {
    flexDirection: 'row',
    backgroundColor: C.dangerBg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.danger,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  logoutTxt: {
    fontSize: 14,
    fontWeight: '700',
    color: C.danger,
    letterSpacing: 0.5,
  },

  version: {
    textAlign: 'center',
    fontSize: 11,
    color: C.textMuted,
    letterSpacing: 1,
    paddingTop: 32,
    paddingBottom: 16,
  },
});