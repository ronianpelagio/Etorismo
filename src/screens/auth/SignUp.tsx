import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Animated, Image, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FontAwesome5 as FAIcon } from '@expo/vector-icons';

const C = {
  bg: '#F7F4EF',
  surface: '#FFFFFF',
  ink: '#1A1612',
  inkMid: '#6B6459',
  inkLight: '#A89F96',
  gold: '#C9A84C',
  goldSoft: '#F5EDD8',
  border: '#EAE4DA',
  error: '#C0392B',
};

type Gender = 'Male' | 'Female' | 'Other';

// --- Animated Input Field ---
interface FieldProps {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder: string; keyboardType?: any; autoCapitalize?: any;
  secure?: boolean; error?: string; helper?: string; showToggle?: boolean;
}

function Field({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', autoCapitalize = 'none',
  secure = false, error, helper, showToggle = false,
}: FieldProps) {
  const [showPwd, setShowPwd] = useState(!secure);
  const anim = useRef(new Animated.Value(0)).current;
  const animate = (to: number) =>
    Animated.timing(anim, { toValue: to, duration: 200, useNativeDriver: false }).start();

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? C.error : C.border, error ? C.error : C.gold],
  });

  return (
    <View style={fs.wrap}>
      <Text style={fs.label}>{label}</Text>
      <Animated.View style={[fs.box, { borderColor }]}>
        <TextInput
          style={[fs.input, showToggle && { paddingRight: 52 }]}
          placeholder={placeholder}
          placeholderTextColor={C.inkLight}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          secureTextEntry={secure && !showPwd}
          onFocus={() => animate(1)}
          onBlur={() => animate(0)}
        />
        {showToggle && (
          <TouchableOpacity style={fs.eye} onPress={() => setShowPwd(v => !v)}>
            <Icon name={showPwd ? 'eye-outline' : 'eye-off-outline'} size={19} color={C.inkLight} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {helper && !error && <Text style={fs.helper}>{helper}</Text>}
      {error && <Text style={fs.err}>{error}</Text>}
    </View>
  );
}

const fs = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { fontSize: 10, fontWeight: '700', color: C.inkMid, letterSpacing: 1.5, marginBottom: 8, textTransform: 'uppercase' },
  box: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.surface, borderWidth: 1.5, borderRadius: 12, overflow: 'hidden' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, color: C.ink },
  eye: { position: 'absolute', right: 16 },
  helper: { fontSize: 11, color: C.inkLight, marginTop: 5, marginLeft: 2 },
  err: { fontSize: 12, color: C.error, marginTop: 5, marginLeft: 2 },
});

function GenderSelector({ selected, onSelect, error }: { selected: Gender | ''; onSelect: (g: Gender) => void; error?: string }) {
  const OPTIONS: Gender[] = ['Male', 'Female', 'Other'];
  return (
    <View style={gs.wrap}>
      <Text style={gs.label}>GENDER</Text>
      <View style={gs.row}>
        {OPTIONS.map(opt => {
          const active = selected === opt;
          return (
            <TouchableOpacity key={opt} onPress={() => onSelect(opt)} style={[gs.btn, active && gs.btnActive]}>
              <Text style={[gs.txt, active && gs.txtActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {error && <Text style={gs.err}>{error}</Text>}
    </View>
  );
}

const gs = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { fontSize: 10, fontWeight: '700', color: C.inkMid, letterSpacing: 1.5, marginBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 13, alignItems: 'center', borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.surface },
  btnActive: { borderColor: C.ink, backgroundColor: C.ink },
  txt: { fontSize: 14, fontWeight: '600', color: C.inkMid },
  txtActive: { color: '#FFF' },
  err: { fontSize: 12, color: C.error, marginTop: 5, marginLeft: 2 },
});

function Checkbox({ checked, onToggle, label, linkText, onLinkPress, hasError }: any) {
  return (
    <TouchableOpacity style={cb.row} onPress={onToggle} activeOpacity={0.7}>
      <View style={[cb.box, checked && cb.boxOn, hasError && cb.boxErr]}>
        {checked && <Icon name="checkmark" size={13} color="#FFF" />}
      </View>
      <Text style={cb.label}>{label} <Text style={cb.link} onPress={onLinkPress}>{linkText}</Text></Text>
    </TouchableOpacity>
  );
}

const cb = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.border, marginRight: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: C.surface },
  boxOn: { backgroundColor: C.gold, borderColor: C.gold },
  boxErr: { borderColor: C.error },
  label: { fontSize: 14, color: C.inkMid, flexShrink: 1 },
  link: { color: C.gold, fontWeight: '700', textDecorationLine: 'underline' },
});

// --- Main Screen ---
export default function SignUp({ navigation }: any) {
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [age, setAge] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!firstName.trim()) e.firstName = 'First name is required';
    if (!lastName.trim()) e.lastName = 'Last name is required';
    if (!gender) e.gender = 'Please select your gender';
    if (!age) e.age = 'Age is required';
    else {
      const n = parseInt(age, 10);
      if (isNaN(n) || n < 1 || n > 120) e.age = 'Enter a valid age';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format';
    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Must be at least 8 characters';
    if (!termsAccepted) e.terms = 'Agreement required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => { if (validateStep1()) setStep(2); };

  const handleSignUp = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.toLowerCase().trim(),
        password,
        options: { data: { first_name: firstName, last_name: lastName, gender, age: parseInt(age, 10) } }
      });
      if (error) throw error;
      Alert.alert('Success', 'Check your email for verification.', [{ text: 'OK', onPress: () => navigation.navigate('SignIn') }]);
    } catch (e: any) { Alert.alert('Error', e.message); } finally { setLoading(false); }
  };

  const clearErr = (key: string) => setErrors(prev => ({ ...prev, [key]: '' }));

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView style={s.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView bounces={false} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={s.imageContainer}>
            <Image source={require('../../assets/Signin.jpg')} style={s.topImage} />
            <View style={s.imageOverlay}>
              <Text style={s.eyebrow}>— STEP {step} OF 2</Text>
              <Text style={s.title}>{step === 1 ? 'Personal\nDetails' : 'Create\nAccount'}</Text>
            </View>
          </View>

          <View style={s.formContainer}>
            <View style={s.handle} />
            
            {/* Progress Bar */}
            <View style={s.progressBase}>
              <View style={[s.progressFill, { width: step === 1 ? '50%' : '100%' }]} />
            </View>

            {step === 1 ? (
              <View>
                <View style={s.nameRow}>
                  <View style={s.half}><Field label="First Name" value={firstName} onChangeText={t => { setFirstName(t); clearErr('firstName'); }} placeholder="First" error={errors.firstName} /></View>
                  <View style={s.half}><Field label="Last Name" value={lastName} onChangeText={t => { setLastName(t); clearErr('lastName'); }} placeholder="Last" error={errors.lastName} /></View>
                </View>
                <GenderSelector selected={gender} onSelect={g => { setGender(g); clearErr('gender'); }} error={errors.gender} />
                <Field label="Age" value={age} onChangeText={t => { setAge(t); clearErr('age'); }} placeholder="Age" keyboardType="numeric" error={errors.age} />
                <TouchableOpacity style={s.btn} onPress={nextStep}><Text style={s.btnTxt}>Next Step</Text></TouchableOpacity>
              </View>
            ) : (
              <View>
                <Field label="Email Address" value={email} onChangeText={t => { setEmail(t); clearErr('email'); }} placeholder="you@example.com" keyboardType="email-address" error={errors.email} />
                <Field label="Password" value={password} onChangeText={t => { setPassword(t); clearErr('password'); }} placeholder="Password" secure showToggle error={errors.password} />
                <Checkbox checked={termsAccepted} onToggle={() => { setTermsAccepted(!termsAccepted); clearErr('terms'); }} label="I agree to the" linkText="Terms & Privacy" hasError={!!errors.terms} />
                <TouchableOpacity style={[s.btn, loading && s.btnOff]} onPress={handleSignUp} disabled={loading}>
                  {loading ? <ActivityIndicator color="#FFF" /> : <Text style={s.btnTxt}>Create Account</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setStep(1)} style={s.backBtn}><Text style={s.backTxt}>Go Back</Text></TouchableOpacity>
              </View>
            )}

            <View style={s.footer}>
              <Text style={s.footerTxt}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignIn')}><Text style={s.footerLink}>Sign In</Text></TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  imageContainer: { height: 280, width: '100%' },
  topImage: { width: '100%', height: '100%' },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(26, 22, 18, 0.45)', justifyContent: 'flex-end', padding: 28, paddingBottom: 60 },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: '#FFF', marginBottom: 8, opacity: 0.8 },
  title: { fontSize: 36, fontWeight: '800', color: '#FFF', lineHeight: 40 },
  formContainer: { flex: 1, backgroundColor: C.bg, marginTop: -40, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 28, paddingTop: 10, paddingBottom: 40 },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  progressBase: { height: 4, backgroundColor: C.border, borderRadius: 2, marginBottom: 25, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.gold },
  nameRow: { flexDirection: 'row', gap: 14 },
  half: { flex: 1 },
  btn: { backgroundColor: C.ink, paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10, shadowColor: C.ink, shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 }, shadowRadius: 10, elevation: 4 },
  btnOff: { opacity: 0.55 },
  btnTxt: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  backBtn: { paddingVertical: 15, alignItems: 'center' },
  backTxt: { color: C.inkMid, fontWeight: '600' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerTxt: { fontSize: 14, color: C.inkMid },
  footerLink: { fontSize: 14, fontWeight: '800', color: C.gold },
});