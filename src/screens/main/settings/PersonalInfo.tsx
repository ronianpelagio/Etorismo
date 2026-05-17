import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../../services/supabase';

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
};

type UserData = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
};

export default function PersonalInfo({ navigation }: any) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    fetchUserData();
  }, []);

  async function fetchUserData() {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (data) {
        setUser(data);
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setPhone(data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      Alert.alert('Error', 'Failed to load user data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
        })
        .eq('id', authUser.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      navigation?.goBack();
    } catch (error) {
      console.error('Error saving user data:', error);
      Alert.alert('Error', 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={C.gold} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Personal Information</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.titleDivider} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PROFILE DETAILS</Text>
          <View style={styles.card}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter first name"
                value={firstName}
                onChangeText={setFirstName}
                placeholderTextColor={C.inkLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter last name"
                value={lastName}
                onChangeText={setLastName}
                placeholderTextColor={C.inkLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholderTextColor={C.inkLight}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.input, styles.disabledInput]}>
                <Text style={styles.disabledText}>{user?.email}</Text>
              </View>
              <Text style={styles.helperText}>Email cannot be changed here</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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
  backTxt: { fontSize: 24, color: C.ink, lineHeight: 28, marginTop: -2 },
  pageTitle: { fontSize: 18, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },

  titleDivider: { height: 3, backgroundColor: C.gold, marginHorizontal: 20, borderRadius: 2, marginBottom: 4 },

  scrollContent: { paddingBottom: 40 },

  section: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: { fontSize: 10, fontWeight: '800', color: C.gold, letterSpacing: 2.5, marginBottom: 10 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    overflow: 'hidden',
    padding: 18,
  },

  formGroup: { marginBottom: 20 },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 8 },
  input: {
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.ink,
  },
  disabledInput: {
    backgroundColor: C.goldSoft,
    justifyContent: 'center',
  },
  disabledText: { fontSize: 15, color: C.inkMid },
  helperText: { fontSize: 11, color: C.inkLight, marginTop: 4, fontStyle: 'italic' },

  saveBtn: {
    marginHorizontal: 20,
    marginTop: 24,
    backgroundColor: C.ink,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: C.surface, letterSpacing: 0.3 },
});

