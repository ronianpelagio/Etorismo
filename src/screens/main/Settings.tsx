import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase';

// ─── Design tokens ─────────────────────────────────────────────────────────────
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
  dangerBg: '#FDF0EE',
};

type RowProps = {
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
  isLast?: boolean;
};

function Row({ label, value, onPress, danger, isLast }: RowProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, isLast && styles.rowLast]}
      activeOpacity={0.7}
    >
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
        <Text style={[styles.chevron, danger && styles.rowLabelDanger]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
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

            // Give Supabase a moment to clear the session.
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Page header ── */}
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
          >
            <Text style={styles.backTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Settings</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.titleDivider} />

        <Section title="MENU">
          <Row label="Personal Information"  onPress={() => nav('PersonalInfo')} />
          <Row label="Password & Security"   onPress={() => nav('PasswordSecurity')} />
          <Row label="Email Preferences"     onPress={() => nav('EmailPrefs')} isLast />
        </Section>

        <Section title="PREFERENCES">
          <Row label="Language"          value="English"  onPress={() => nav('Language')} />
          <Row label="Push Notifications" value="On"      onPress={() => nav('Notifications')} />
          <Row label="Theme"             value="Light"    onPress={() => nav('Theme')} isLast />
        </Section>

        <Section title="SUPPORT">
          <Row label="Help & Support"    onPress={() => nav('HelpSupport')} />
          <Row label="Terms & Conditions" onPress={() => nav('Terms')} />
          <Row label="Privacy Policy"    onPress={() => nav('Privacy')} isLast />
        </Section>

        <View style={styles.section}>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.8}>
            <Text style={styles.logoutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Heritage Collection · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center',
  },
  backTxt:   { fontSize: 24, color: C.ink, lineHeight: 28, marginTop: -2 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },

  titleDivider: { height: 3, backgroundColor: C.gold, marginHorizontal: 20, borderRadius: 2, marginBottom: 4 },

  section:      { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 2.5, marginBottom: 10 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 17,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rowLast:        { borderBottomWidth: 0 },
  rowLabel:       { fontSize: 15, color: C.ink, fontWeight: '500' },
  rowLabelDanger: { color: C.danger },
  rowRight:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowValue:       { fontSize: 13, color: C.inkMid },
  chevron:        { fontSize: 22, color: C.inkLight, lineHeight: 24 },

  logoutBtn: {
    backgroundColor: C.dangerBg,
    borderRadius: 14,
    borderWidth: 1.5, borderColor: C.danger,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutTxt: { fontSize: 15, fontWeight: '700', color: C.danger, letterSpacing: 0.3 },

  version: {
    textAlign: 'center',
    fontSize: 11,
    color: C.inkLight,
    letterSpacing: 1,
    paddingTop: 32,
    paddingBottom: 8,
  },
});