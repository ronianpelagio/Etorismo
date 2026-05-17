import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const C = {
  bg: '#F7F4EF',
  surface: '#FFFFFF',
  ink: '#1A1612',
  inkMid: '#6B6459',
  gold: '#C9A84C',
  border: '#EAE4DA',
};

const THEMES = [
  { id: 'light', name: 'Light', icon: 'sunny' },
  { id: 'dark', name: 'Dark', icon: 'moon' },
  { id: 'auto', name: 'Auto', icon: 'settings' },
];

export default function Theme({ navigation }: any) {
  const [selected, setSelected] = useState('light');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Theme</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.titleDivider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SELECT THEME</Text>
        <View style={styles.card}>
          {THEMES.map((theme, idx) => (
            <TouchableOpacity
              key={theme.id}
              style={[styles.row, idx < THEMES.length - 1 && styles.rowBorder]}
              onPress={() => setSelected(theme.id)}
              activeOpacity={0.7}
            >
              <View style={styles.themeInfo}>
                <Ionicons name={theme.icon} size={20} color={C.gold} style={{ marginRight: 12 }} />
                <Text style={styles.themeName}>{theme.name}</Text>
              </View>
              {selected === theme.id && (
                <Ionicons name="checkmark" size={24} color={C.gold} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
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
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backTxt: { fontSize: 24, color: C.ink, lineHeight: 28, marginTop: -2 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  titleDivider: { height: 3, backgroundColor: C.gold, marginHorizontal: 20, borderRadius: 2, marginBottom: 4 },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 2.5, marginBottom: 10 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeName: {
    fontSize: 15,
    fontWeight: '500',
    color: C.ink,
  },
});

