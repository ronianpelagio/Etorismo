import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const C = {
  bg: '#F7F4EF',
  surface: '#FFFFFF',
  ink: '#1A1612',
  inkMid: '#6B6459',
  gold: '#C9A84C',
  border: '#EAE4DA',
};

export default function EmailPrefs({ navigation }: any) {
  const [emails, setEmails] = useState({
    updates: true,
    promotions: false,
    events: true,
    newsletter: true,
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Email Preferences</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.titleDivider} />

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>EMAIL SETTINGS</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Product Updates</Text>
              <Text style={styles.rowDesc}>New features and improvements</Text>
            </View>
            <Switch
              value={emails.updates}
              onValueChange={(val) => setEmails({ ...emails, updates: val })}
              trackColor={{ false: C.border, true: C.gold }}
              thumbColor={C.surface}
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <View>
              <Text style={styles.rowLabel}>Promotions</Text>
              <Text style={styles.rowDesc}>Special offers and discounts</Text>
            </View>
            <Switch
              value={emails.promotions}
              onValueChange={(val) => setEmails({ ...emails, promotions: val })}
              trackColor={{ false: C.border, true: C.gold }}
              thumbColor={C.surface}
            />
          </View>
          <View style={[styles.row, styles.rowBorder]}>
            <View>
              <Text style={styles.rowLabel}>Events</Text>
              <Text style={styles.rowDesc}>Upcoming tours and exhibitions</Text>
            </View>
            <Switch
              value={emails.events}
              onValueChange={(val) => setEmails({ ...emails, events: val })}
              trackColor={{ false: C.border, true: C.gold }}
              thumbColor={C.surface}
            />
          </View>
          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Newsletter</Text>
              <Text style={styles.rowDesc}>Weekly digest</Text>
            </View>
            <Switch
              value={emails.newsletter}
              onValueChange={(val) => setEmails({ ...emails, newsletter: val })}
              trackColor={{ false: C.border, true: C.gold }}
              thumbColor={C.surface}
            />
          </View>
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
  rowLabel: { fontSize: 15, fontWeight: '500', color: C.ink, marginBottom: 4 },
  rowDesc: { fontSize: 12, color: C.inkMid },
});

