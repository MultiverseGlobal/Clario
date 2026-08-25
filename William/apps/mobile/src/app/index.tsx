/**
 * HomeScreen — Pillowtalk Core Voice Layout
 * Pure, distraction-free voice capture home.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { useOrionStore } from '../store/useOrionStore';
import { Colors } from '../theme/colors';
import { OrionLogo } from '../components/OrionLogo';
import { OrionAudioWave } from '../components/OrionAudioWave';
import { ExecutiveDock } from '../components/ExecutiveDock';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { stage, setStage } = useOrionStore();
  const [isRecording, setIsRecording] = useState(false);
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  // Breathing animation for the background aura
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 3000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleToggleRecord = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (isRecording) {
      setIsRecording(false);
      setStage('PROCESSING');
      // Simulate processing finishing
      setTimeout(() => setStage('LISTENING'), 2000);
    } else {
      setIsRecording(true);
    }
  };

  const auraScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.1],
  });

  const auraOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      {/* Mark top-left */}
      <View style={styles.topBar}>
        <OrionLogo size={28} animated={false} />
      </View>

      <View style={styles.content}>
        {stage === 'PROCESSING' ? (
          <View style={styles.centerStage}>
            <OrionLogo size={64} animated />
            <Text style={styles.statusText}>saving reflection...</Text>
          </View>
        ) : (
          <View style={styles.centerStage}>
            {/* Dynamic visual aura */}
            <OrionAudioWave isRecording={isRecording} />
            
            <Text style={styles.headline}>
              {isRecording ? "i'm listening..." : "a quiet place\nto capture your thoughts."}
            </Text>

            <TouchableOpacity
              style={[styles.pillBtn, isRecording && styles.pillBtnRecording]}
              onPress={handleToggleRecord}
              activeOpacity={0.8}
            >
              <Text style={[styles.pillText, isRecording && styles.pillTextRecording]}>
                {isRecording ? 'stop recording' : 'tap to reflect'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ExecutiveDock onResetOrb={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  topBar: {
    position: 'absolute',
    top: 54,
    left: 24,
    zIndex: 10,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerStage: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 24,
    height: '100%',
  },
  headline: {
    fontSize: 28,
    fontWeight: '300',
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 38,
    letterSpacing: -0.3,
    marginBottom: 48,
    zIndex: 2,
  },
  statusText: {
    marginTop: 32,
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
  pillBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 50,
    paddingHorizontal: 48,
    paddingVertical: 16,
    zIndex: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  pillBtnRecording: {
    backgroundColor: Colors.bgCard,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    shadowOpacity: 0,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.accentText,
    letterSpacing: 0.3,
  },
  pillTextRecording: {
    color: '#FF6B6B',
  },
});