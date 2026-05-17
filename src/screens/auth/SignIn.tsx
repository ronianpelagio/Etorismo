import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, StatusBar, Animated, useWindowDimensions, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../services/supabase';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FontAwesome5 as FAIcon } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

// ─── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       '#F7F4EF',
  surface:  '#FFFFFF',
  ink:       '#1A1612',
  inkMid:    '#6B6459',
  inkLight:  '#A89F96',
  gold:      '#C9A84C',
  goldSoft:  '#F5EDD8',
  border:    '#EAE4DA',
  error:     '#C0392B',
  errorBg:   '#FDF0EE',
  errorBdr:  '#F0C4BC',
};

// ─── Animated Field ────────────────────────────────────────────────────────────
interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: any;
  autoCapitalize?: any;
  autoCorrect?: boolean;
  secure?: boolean;
  showToggle?: boolean;
  show?: boolean;
  onToggle?: () => void;
  error?: string;
}

function Field({
  label, value, onChangeText, placeholder,
  keyboardType = 'default', autoCapitalize = 'none',
  autoCorrect = false, secure = false,
  showToggle = false, show = true, onToggle, error,
}: FieldProps) {
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
          autoCorrect={autoCorrect}
          secureTextEntry={secure && !show}
          onFocus={() => animate(1)}
          onBlur={() => animate(0)}
        />
        {showToggle && onToggle && (
          <TouchableOpacity style={fs.eye} onPress={onToggle}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Icon name={show ? 'eye-outline' : 'eye-off-outline'} size={19} color={C.inkLight} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? <Text style={fs.err}>{error}</Text> : null}
    </View>
  );
}

const fs = StyleSheet.create({
  wrap:  { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '700', color: C.gold, letterSpacing: 1.8, marginBottom: 8, textTransform: 'uppercase' },
  box: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface,
    borderWidth: 1.5, borderRadius: 14, overflow: 'hidden',
  },
  input: {
    flex: 1, paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 15 : 12,
    fontSize: 15, color: C.ink,
  },
  eye: { position: 'absolute', right: 16 },
  err: { fontSize: 12, color: C.error, marginTop: 5, marginLeft: 2 },
});

// ─── Social Button ─────────────────────────────────────────────────────────────
function SocialBtn({
  label, iconName, onPress, loading, dark = false, brand = false,
}: {
  label: string;
  iconName: ComponentProps<typeof FAIcon>['name'];
  onPress: () => void;
  loading: boolean;
  dark?: boolean;
  brand?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[sb.btn, dark && sb.dark]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={dark ? '#FFF' : C.ink} />
        : <>
            <FAIcon name={iconName} size={17} color={dark ? '#FFF' : C.ink} brand={brand} />
            <Text style={[sb.txt, dark && sb.txtDark]}>{label}</Text>
          </>
      }
    </TouchableOpacity>
  );
}

const sb = StyleSheet.create({
  btn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: C.surface, paddingVertical: 14, borderRadius: 14,
    gap: 8, borderWidth: 1.5, borderColor: C.border,
  },
  dark:    { backgroundColor: '#1877F2', borderColor: '#1877F2' },
  txt:     { fontSize: 14, fontWeight: '600', color: C.ink },
  txtDark: { color: '#FFF' },
});

// ─── Main Screen ───────────────────────────────────────────────────────────────
export default function SignIn({ navigation }: any) {
  const { width, height } = useWindowDimensions();
  const isSmall  = height < 680;
  const isTablet = width >= 600;

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPwd, setShowPwd]           = useState(false);
  const [loading, setLoading]           = useState(false);
  const [googleLoading, setGoogleLoading]   = useState(false);
  const [fbLoading, setFbLoading]       = useState(false);
  const [errors, setErrors]             = useState<{ email?: string; password?: string }>({});
  const [authError, setAuthError]       = useState('');

  const validate = () => {
    const e: typeof errors = {};
    if (!email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Enter a valid email';
    if (!password) e.password = 'Password is required';
    return e;
  };

  const handleLogin = async () => {
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true); setAuthError('');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(), password,
      });
      if (error) { setAuthError(error.message); return; }
      if (!data.user) { setAuthError('Login failed'); return; }

      const { data: profile, error: pErr } = await supabase
        .from('users').select('*').eq('id', data.user.id).maybeSingle();
      if (pErr || !profile) { setAuthError('Profile not found. Please sign up again.'); return; }
      if (profile.status !== 'active') { setAuthError('Account inactive. Contact support.'); return; }

      navigation.replace(profile.role === 'admin' ? 'AdminDashboard' : 'Main');
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: 'https://crcrgkskhoruqcbssvaw.supabase.co/auth/v1/callback' },
      });
      if (error) Alert.alert('Google Error', error.message);
    } catch { Alert.alert('Error', 'Google sign in failed'); }
    finally { setGoogleLoading(false); }
  };

  const handleFacebook = async () => {
    setFbLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: 'your-app-scheme://login-callback' },
      });
      if (error) Alert.alert('Facebook Error', error.message);
    } catch { Alert.alert('Error', 'Facebook sign in failed'); }
    finally { setFbLoading(false); }
  };

  const cardW = isTablet ? Math.min(480, width * 0.7) : '100%';

  return (
    <View style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.flex}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header Image */}
          <View style={s.imageContainer}>
            <Image 
              source={require('../../assets/Signin.jpg')} 
              style={s.topImage}
              resizeMode="cover"
            />
            <View style={s.imageOverlay}>
              <Text style={s.eyebrow}>— Sacred Heritage Collection</Text>
              <Text style={[s.title, { fontSize: isSmall ? 30 : 38 }]}>Welcome</Text>
            </View>
          </View>

          {/* Floating Form Card */}
          <View style={[s.formContainer, { width: cardW, alignSelf: 'center' }]}>
            <View style={s.handle} />
            <Text style={s.subtitle}>Sign in to continue your journey</Text>

            {/* ── Fields (Top) ── */}
            <Field
              label="Email Address" value={email}
              onChangeText={t => { setEmail(t); setErrors(e => ({ ...e, email: '' })); setAuthError(''); }}
              placeholder="you@example.com" keyboardType="email-address"
              error={errors.email}
            />
            <Field
              label="Password" value={password}
              onChangeText={t => { setPassword(t); setErrors(e => ({ ...e, password: '' })); setAuthError(''); }}
              placeholder="Your password"
              secure showToggle show={showPwd} onToggle={() => setShowPwd(v => !v)}
              error={errors.password}
            />

            {/* Auth error */}
            {authError ? (
              <View style={s.authErr}>
                <Icon name="alert-circle" size={18} color={C.error} />
                <Text style={s.authErrTxt}>{authError}</Text>
              </View>
            ) : null}

            {/* Forgot */}
            <TouchableOpacity style={s.forgot} onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={s.forgotTxt}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Main Sign In btn */}
            <TouchableOpacity
              style={[s.btn, loading && s.btnOff]}
              onPress={handleLogin} disabled={loading} activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <>
                    <Text style={s.btnTxt}>Sign In</Text>
                    <Icon name="arrow-forward" size={17} color="#FFF" style={{ marginLeft: 6 }} />
                  </>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divRow}>
              <View style={s.divLine} />
              <Text style={s.divTxt}>OR CONTINUE WITH</Text>
              <View style={s.divLine} />
            </View>

            {/* Social Buttons (Bottom) */}
            <View style={s.socialRow}>
              <SocialBtn label="Google"   iconName="google"     brand onPress={handleGoogle}   loading={googleLoading} />
              <SocialBtn label="Facebook" iconName="facebook-f" brand onPress={handleFacebook} loading={fbLoading} dark />
            </View>

            {/* Footer */}
            <View style={s.footer}>
              <Text style={s.footerTxt}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={s.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:  { flex: 1, backgroundColor: C.bg },
  flex:  { flex: 1 },
  scroll:{ flexGrow: 1 },

  // Image Header
  imageContainer: { height: 300, width: '100%' },
  topImage: { width: '100%', height: '100%' },
  imageOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(26, 22, 18, 0.45)', 
    justifyContent: 'flex-end',
    padding: 28,
    paddingBottom: 60
  },
  eyebrow: { fontSize: 11, letterSpacing: 2, color: '#FFF', marginBottom: 12 },
  title:    { fontWeight: '800', color: '#FFF', lineHeight: 42, letterSpacing: -1 },

  // Form Card
  formContainer: { 
    flex: 1, 
    backgroundColor: C.bg, 
    marginTop: -40, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    paddingHorizontal: 28, 
    paddingTop: 10,
    paddingBottom: 40 
  },
  handle: { width: 40, height: 4, backgroundColor: C.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  subtitle: { fontSize: 14, color: C.inkMid, marginBottom: 24, textAlign: 'center' },

  // Social
  socialRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },

  // Divider
  divRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  divLine:{ flex: 1, height: 1, backgroundColor: C.border },
  divTxt: { marginHorizontal: 12, color: C.inkLight, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  // Auth error
  authErr: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.errorBg,
    borderWidth: 1.5, borderColor: C.errorBdr,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 16,
  },
  authErrTxt: { flex: 1, fontSize: 13, color: C.error, fontWeight: '500', lineHeight: 18 },

  // Forgot
  forgot:    { alignSelf: 'flex-end', marginTop: -8, marginBottom: 20 },
  forgotTxt: { fontSize: 13, fontWeight: '700', color: C.gold },

  // Button
  btn: {
    backgroundColor: C.ink, paddingVertical: 17, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
    shadowColor: C.ink, shadowOpacity: 0.25, shadowOffset: { width: 0, height: 6 }, shadowRadius: 14, elevation: 5,
  },
  btnOff: { opacity: 0.55 },
  btnTxt: { color: '#FFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },

  // Footer
  footer:    { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerTxt: { color: C.inkMid, fontSize: 14 },
  footerLink:{ color: C.gold, fontWeight: '800', fontSize: 14 },
});