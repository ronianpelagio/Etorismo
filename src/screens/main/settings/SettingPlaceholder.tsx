import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const C = {
  bg: '#F7F4EF',
  surface: '#FFFFFF',
  ink: '#1A1612',
  inkMid: '#6B6459',
  gold: '#C9A84C',
  border: '#EAE4DA',
};

export default function SettingPlaceholder({
  title,
  onBack,
}: {
  title: string;
  onBack?: () => void;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.divider} />

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.cardEyebrow}>Coming Soon</Text>
          <Text style={styles.cardText}>This Settings screen is not implemented yet.</Text>
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
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 10,
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

  title: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },

  divider: {
    height: 3,
    backgroundColor: C.gold,
    marginHorizontal: 18,
    borderRadius: 2,
    marginBottom: 6,
  },

  body: {
    paddingHorizontal: 18,
    paddingTop: 16,
  },

  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
  },

  cardEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2.5,
    color: C.gold,
    textTransform: 'uppercase',
    marginBottom: 10,
  },

  cardText: {
    fontSize: 14,
    color: C.inkMid,
    lineHeight: 20,
  },
});

