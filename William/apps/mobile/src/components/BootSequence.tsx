import { Colors } from '../theme/colors';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ASYNC_STORAGE_KEY = 'orion_last_opened_date';

interface BootSequenceProps {
  onComplete: () => void;
}

export function BootSequence({ onComplete }: BootSequenceProps) {
  const [isReady, setIsReady] = useState(false);
  const [isColdStart, setIsColdStart] = useState(true);

  // Animation values
  const containerOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue('-15deg');

  useEffect(() => {
    const checkStartType = async () => {
      try {
        const today = new Date().toDateString();
        const lastOpened = await AsyncStorage.getItem(ASYNC_STORAGE_KEY);
        
        if (lastOpened === today) {
          setIsColdStart(false);
        } else {
          setIsColdStart(true);
          await AsyncStorage.setItem(ASYNC_STORAGE_KEY, today);
        }
      } catch (e) {
        setIsColdStart(true);
      } finally {
        setIsReady(true);
      }
    };
    checkStartType();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    if (isColdStart) {
      // COLD START: ChatGPT style geometric ease
      // 1. Fade in and smoothly scale/rotate into place
      logoOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
      logoScale.value = withSpring(1, { damping: 15, stiffness: 90 });
      logoRotate.value = withSpring('0deg', { damping: 14, stiffness: 80 });

      // 2. Fade out container cleanly
      containerOpacity.value = withDelay(1800, withTiming(0, { duration: 500 }, (finished) => {
        if (finished) runOnJS(onComplete)();
      }));

    } else {
      // WARM START: Just a tiny pulse and instant dismiss
      logoOpacity.value = 1;
      logoScale.value = 1;
      logoRotate.value = '0deg';

      logoScale.value = withSequence(
        withTiming(1.03, { duration: 150 }),
        withTiming(1, { duration: 150 })
      );

      containerOpacity.value = withDelay(300, withTiming(0, { duration: 300 }, (finished) => {
        if (finished) runOnJS(onComplete)();
      }));
    }
  }, [isReady, isColdStart]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [
      { scale: logoScale.value },
      { rotate: logoRotate.value }
    ],
  }));

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <Animated.Image 
        source={require('../../assets/images/icon.png')} 
        style={[styles.logo, logoStyle]} 
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.textPrimary, // Pitch black/charcoal
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 90,
    height: 90,
    borderRadius: 20, // Give it a slight rounded edge if it isn't transparent
  }
});
