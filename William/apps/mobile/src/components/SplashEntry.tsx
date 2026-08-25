/**
 * SplashEntry — Natural AI-inspired entry screen
 *
 * Visual references:
 *  - Natural AI (Mobbin public description): opening light→dark transition,
 *    soft translucent 3D orb, wordmark fades in, then slides out upward.
 *  - Orion adaptation: warm dark bg, Orion orb (ApertureLogo), lowercase wordmark.
 *
 * Sequence (cold start):
 *   0ms   — bg black, orb scale 0.6 opacity 0
 *   300ms — orb springs to 1.0 + fade in (600ms ease-out)
 *   900ms — wordmark fades + slides up from +12px (400ms ease-out)
 *   2000ms — whole container fades out (500ms) → onComplete()
 *
 * Warm start: 280ms pulse + instant dismiss.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  Text,
  Dimensions,
  AccessibilityInfo,
} from 'react-native';
import { Colors } from '../theme/colors';
import { OrionLogo } from './OrionLogo';

const { width } = Dimensions.get('window');

interface SplashEntryProps {
  onComplete: () => void;
  isColdStart?: boolean;
}

export function SplashEntry({ onComplete, isColdStart = true }: SplashEntryProps) {
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const orbScale       = useRef(new Animated.Value(isColdStart ? 0.55 : 1)).current;
  const orbOpacity     = useRef(new Animated.Value(isColdStart ? 0   : 1)).current;
  const orbGlowScale   = useRef(new Animated.Value(isColdStart ? 0.4 : 0.8)).current;
  const wordOpacity    = useRef(new Animated.Value(0)).current;
  const wordY          = useRef(new Animated.Value(isColdStart ? 14 : 0)).current;

  useEffect(() => {
    // Respect reduced-motion system setting
    AccessibilityInfo.isReduceMotionEnabled().then((reduced) => {
      if (reduced || !isColdStart) {
        // Immediate: show briefly, dismiss
        orbOpacity.setValue(1);
        orbScale.setValue(1);
        wordOpacity.setValue(1);
        wordY.setValue(0);
        containerOpacity.setValue(1);

        setTimeout(() => {
          Animated.timing(containerOpacity, {
            toValue: 0,
            duration: 280,
            useNativeDriver: true,
          }).start(() => onComplete());
        }, isColdStart ? 400 : 180);
        return;
      }

      // ── Cold start full sequence ──────────────────────────────
      Animated.sequence([
        // Phase 1: Orb materializes (spring-like via timing)
        Animated.parallel([
          Animated.timing(orbOpacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(orbScale, {
            toValue: 1,
            damping: 12,
            stiffness: 80,
            useNativeDriver: true,
          }),
          Animated.timing(orbGlowScale, {
            toValue: 1.15,
            duration: 900,
            useNativeDriver: true,
          }),
        ]),

        // Phase 2: Wordmark slides up and in (Natural AI style)
        Animated.parallel([
          Animated.timing(wordOpacity, {
            toValue: 1,
            duration: 420,
            useNativeDriver: true,
          }),
          Animated.timing(wordY, {
            toValue: 0,
            duration: 420,
            useNativeDriver: true,
          }),
          // Glow ring breathes
          Animated.timing(orbGlowScale, {
            toValue: 1.0,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),

        // Phase 3: Hold
        Animated.delay(600),

        // Phase 4: Fade out entire screen
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 460,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onComplete();
      });
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: containerOpacity }]}>
      {/* Ambient glow ring — Natural AI translucent orb effect */}
      <Animated.View
        style={[
          styles.glowRing,
          { transform: [{ scale: orbGlowScale }], opacity: orbOpacity },
        ]}
      />

      {/* Orion orb mark */}
      <Animated.View
        style={[
          styles.orbContainer,
          { opacity: orbOpacity, transform: [{ scale: orbScale }] },
        ]}
      >
        <OrionLogo
          size={72}
          animated={false}
        />
      </Animated.View>

      {/* Wordmark — Pillowtalk lowercase brand voice */}
      <Animated.View
        style={[
          styles.wordmarkContainer,
          {
            opacity: wordOpacity,
            transform: [{ translateY: wordY }],
          },
        ]}
      >
        <Text style={styles.wordmark} accessibilityRole="header">
          orion
        </Text>
        <View style={styles.taglineDot} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.bg,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.accentMuted,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 40,
  },
  orbContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmarkContainer: {
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  wordmark: {
    fontSize: 32,
    fontWeight: '300',
    color: Colors.textPrimary,
    letterSpacing: 6,
    textTransform: 'lowercase',
  },
  taglineDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
});
