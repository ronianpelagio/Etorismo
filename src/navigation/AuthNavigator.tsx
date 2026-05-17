import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import GetStarted from '../screens/auth/GetStarted';
import SignIn from '../screens/auth/SignIn';
import SignUp from '../screens/auth/SignUp';
import TabNavigator from './TabNavigator';
import AppIntro from '../screens/auth/AppIntro';
import { supabase } from '../services/supabase';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  const [session, setSession] = useState<any | null>(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const isLoggedIn = Boolean(session?.user);

  return (
    <Stack.Navigator id="AuthStack" screenOptions={{ headerShown: false }}>
      {isLoggedIn ? (
        <Stack.Screen name="Main" component={TabNavigator} />
      ) : (
        <>
          <Stack.Screen name="GetStarted" component={GetStarted} />
          <Stack.Screen name="AppIntro" component={AppIntro} options={{ headerShown: false }} />
          <Stack.Screen name="SignIn" component={SignIn} />
          <Stack.Screen name="SignUp" component={SignUp} />
        </>
      )}
    </Stack.Navigator>
  );
}

