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

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'fil', name: 'Filipino', flag: '🇵🇭' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
];

export default function Language({ navigation }: any) {
  const [selected, setSelected] = useState('en');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Language</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.titleDivider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>SELECT LANGUAGE</Text>
        <View style={styles.card}>
          {LANGUAGES.map((lang, idx) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.row, idx < LANGUAGES.length - 1 && styles.rowBorder]}
              onPress={() => setSelected(lang.code)}
              activeOpacity={0.7}
            >
              <View style={styles.langInfo}>
                <Text style={styles.langFlag}>{lang.flag}</Text>
                <Text style={styles.langName}>{lang.name}</Text>
              </View>
              {selected === lang.code && (
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
  langInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  langFlag: {
    fontSize: 24,
  },
  langName: {
    fontSize: 15,
    fontWeight: '500',
    color: C.ink,
  },
});

