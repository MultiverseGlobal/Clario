/**
 * RootLayout — injects SplashEntry (Natural AI-inspired) instead of BootSequence
 * Uses warm dark background throughout.
 */
import { Colors } from '../theme/colors';
import React, { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SplashEntry } from '../components/SplashEntry';
// import * as Notifications from 'expo-notifications';
// import { registerForPushNotificationsAsync } from '../services/notificationService';
import { useOrionStore } from '../store/useOrionStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

const LAST_OPENED_KEY = 'orion_last_opened_date';

export default function RootLayout() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isColdStart, setIsColdStart] = useState(true);
  const { handlePushNotification } = useOrionStore();

  useEffect(() => {
    // let responseListener: Notifications.Subscription;
    // let notificationListener: Notifications.Subscription;

    async function prepare() {
      try {
        // Determine cold vs warm start
        const today = new Date().toDateString();
        const lastOpened = await AsyncStorage.getItem(LAST_OPENED_KEY);
        if (lastOpened === today) {
          setIsColdStart(false);
        } else {
          setIsColdStart(true);
          await AsyncStorage.setItem(LAST_OPENED_KEY, today);
        }

        // Push notifications disabled for Expo Go compatibility
        // const token = await registerForPushNotificationsAsync();
        // if (token) {
        //   await AsyncStorage.setItem('orion_push_token', token);
        // }

        // notificationListener = Notifications.addNotificationReceivedListener(() => {});
        // responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
        //   handlePushNotification({ ... });
        // });

        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      } catch (err) {
        setIsReady(true);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    prepare();

    return () => {
      // if (responseListener) responseListener.remove();
      // if (notificationListener) notificationListener.remove();
    };
  }, []);

  if (!isReady) return null;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: 260,
          contentStyle: { backgroundColor: Colors.bg },
        }}
      />
      {showSplash && (
        <SplashEntry
          isColdStart={isColdStart}
          onComplete={async () => {
            setShowSplash(false);
            const onboarded = await AsyncStorage.getItem('orion_onboarded');
            if (onboarded !== 'true') {
              router.replace('/onboarding');
            }
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}
