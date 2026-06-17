import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GetStarted from '../screens/auth/GetStarted';
import SignIn from '../screens/auth/SignIn';
import SignUp from '../screens/auth/SignUp';
import VerifyOTP from '../screens/auth/VerifyOTP';
import TabNavigator from './TabNavigator';
import AppIntro from '../screens/auth/AppIntro';
import { supabase } from '../services/supabase';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const [session, setSession] = useState<any | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setSession(data.session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, newSession) => {
      if (isMounted) setSession(newSession);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) { setHasOnboarded(null); return; }
    AsyncStorage.getItem(`onboarded_${session.user.id}`).then(val => {
      setHasOnboarded(val === 'true');
    });
  }, [session?.user?.id]);

  async function completeOnboarding() {
    if (session?.user) {
      await AsyncStorage.setItem(`onboarded_${session.user.id}`, 'true');
      setHasOnboarded(true);
    }
  }

  const isLoggedIn = Boolean(session?.user);

  // Wait for onboard check before rendering logged-in flow
  if (isLoggedIn && hasOnboarded === null) return null;

  return (
    <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false }}>
      {isLoggedIn && !hasOnboarded ? (
        <>
          <Stack.Screen name="GetStarted" component={GetStarted} />
          <Stack.Screen name="AppIntro">
            {(props) => <AppIntro {...props} onOnboardingComplete={completeOnboarding} />}
          </Stack.Screen>
        </>
      ) : isLoggedIn ? (
        <Stack.Screen name="Main" component={TabNavigator} />
      ) : (
        <>
          <Stack.Screen name="GetStarted" component={GetStarted} />
          <Stack.Screen name="AppIntro" component={AppIntro} />
          <Stack.Screen name="SignIn" component={SignIn} />
          <Stack.Screen name="SignUp" component={SignUp} />
          <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
        </>
      )}
    </Stack.Navigator>
  );
}

