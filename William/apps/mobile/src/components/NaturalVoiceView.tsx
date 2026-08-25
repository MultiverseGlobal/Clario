import { SpringButton } from '../components/SpringButton';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet,  Dimensions, ActivityIndicator } from 'react-native';
import { MicOff } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import * as Haptics from 'expo-haptics';
import { webrtcService } from '../services/webrtcService';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface NaturalVoiceViewProps {
  queryText?: string;
  onVoiceComplete: () => void;
}

// High-visibility dust particles floating above the wave crest
const DUST_PARTICLES = Array.from({ length: 40 }).map((_, i) => ({
  id: i,
  startX: width * 0.15 + Math.random() * (width * 0.7),
  size: Math.random() * 3 + 2.5,
  duration: Math.random() * 2000 + 1200,
  maxOpacity: Math.random() * 0.3 + 0.6,
  driftY: -(Math.random() * 60 + 30),
  driftX: (Math.random() - 0.5) * 40,
}));

const DustParticle: React.FC<{ p: (typeof DUST_PARTICLES)[0] }> = ({ p }) => {
  const progress = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = Math.random() * 800;
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: p.duration, easing: Easing.out(Easing.quad) }),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(p.maxOpacity, { duration: p.duration * 0.3 }),
          withTiming(0, { duration: p.duration * 0.7 })
        ),
        -1,
        false
      )
    );
  }, [progress, opacity, p]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: progress.value * p.driftY },
      { translateX: progress.value * p.driftX },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.dustDot,
        {
          left: p.startX,
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

export const NaturalVoiceView: React.FC<NaturalVoiceViewProps> = ({
  queryText,
  onVoiceComplete,
}) => {
  const [isActive, setIsActive] = useState(false);
  const [rtcState, setRtcState] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'error'>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');

  const activeText = liveTranscript || queryText || 'Tap mic to connect to Orion...\nUltra-low latency active.';
  
  const cursorOpacity = useSharedValue(1);
  const wavePhase = useSharedValue(0);
  const waveAmp = useSharedValue(8);

  // WebRTC Hooks
  useEffect(() => {
    webrtcService.onStateChange = (state) => {
      setRtcState(state);
    };
    webrtcService.onTranscriptChange = (text) => {
      setLiveTranscript(text);
    };

    return () => {
      webrtcService.stop();
    };
  }, []);

  // Animations
  useEffect(() => {
    cursorOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 450 }),
        withTiming(1, { duration: 450 })
      ),
      -1,
      true
    );

    // Speed up waves when speaking
    const duration = rtcState === 'speaking' ? 2000 : 4000;
    wavePhase.value = withRepeat(
      withTiming(Math.PI * 2, { duration, easing: Easing.linear }),
      -1,
      false
    );

    const baseAmp = rtcState === 'speaking' ? 24 : 14;
    const minAmp = rtcState === 'speaking' ? 12 : 6;

    waveAmp.value = withRepeat(
      withSequence(
        withTiming(baseAmp, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(minAmp, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [cursorOpacity, wavePhase, waveAmp, rtcState]);

  const wavePath1Props = useAnimatedProps(() => {
    const p = wavePhase.value;
    const a = waveAmp.value;
    const baseY = 60;
    const peakY = baseY - a * (1 + Math.sin(p) * 0.3);
    const shoulderL = baseY - a * 0.3 * Math.cos(p * 0.8);
    const shoulderR = baseY - a * 0.3 * Math.sin(p * 0.6);

    const d = `M 0 ${baseY + 2} `
      + `C ${width * 0.2} ${shoulderL}, ${width * 0.35} ${peakY - 4}, ${width * 0.5} ${peakY} `
      + `C ${width * 0.65} ${peakY + 4}, ${width * 0.8} ${shoulderR}, ${width} ${baseY + 2} `
      + `L ${width} 120 L 0 120 Z`;
    return { d };
  });

  const wavePath2Props = useAnimatedProps(() => {
    const p = wavePhase.value + 0.8;
    const a = waveAmp.value * 0.5;
    const baseY = 65;
    const peakY = baseY - a * (1 + Math.cos(p) * 0.4);

    const d = `M 0 ${baseY} `
      + `C ${width * 0.3} ${peakY + 2}, ${width * 0.5} ${peakY}, ${width * 0.7} ${peakY + 3} `
      + `C ${width * 0.85} ${baseY - 2}, ${width * 0.95} ${baseY}, ${width} ${baseY + 1} `
      + `L ${width} 120 L 0 120 Z`;
    return { d };
  });

  const lines = activeText.split('\n');

  const handleToggleVoice = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    // Voice mode deferred
  };

  const renderButtonContent = () => {
    return (
      <>
        <View style={styles.micCircle}>
          <MicOff size={16} color={Colors.porcelainCard} />
        </View>
        <Text style={styles.chatGptVoiceText}>Voice Mode — Coming Soon</Text>
      </>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.textWrapper}>
        {lines.map((line, lineIdx) => (
          <View key={lineIdx} style={styles.lineRow}>
            {line.split(' ').map((word, wordIdx) => {
              const isLastWord = lineIdx === 0 && wordIdx === line.split(' ').length - 1 && lines.length > 1;
              return (
                <Text
                  key={wordIdx}
                  style={[
                    styles.queryWord,
                    lineIdx === 1 && styles.queryWordSecondLine,
                    isLastWord && styles.queryWordTyping,
                  ]}
                >
                  {word}{' '}
                </Text>
              );
            })}
          </View>
        ))}
      </View>

      {/* Dust particles */}
      <View style={styles.dustArea} pointerEvents="none">
        {DUST_PARTICLES.map((p) => (
          <DustParticle key={p.id} p={p} />
        ))}
      </View>

      {/* Waves rendered only when connected */}
      {isActive && rtcState !== 'connecting' && (
        <View style={styles.waveContainer} pointerEvents="none">
           <Svg style={StyleSheet.absoluteFill}>
            <AnimatedPath animatedProps={wavePath2Props} fill="rgba(17, 24, 39, 0.03)" />
            <AnimatedPath animatedProps={wavePath1Props} fill="rgba(17, 24, 39, 0.05)" />
          </Svg>
        </View>
      )}

      {/* Voice Button Pill */}
      <View style={styles.voiceBtnWrapper}>
        <SpringButton
          activeOpacity={0.85}
          style={[styles.chatGptVoiceBtn, isActive && styles.activeListeningBtn]}
          onPress={handleToggleVoice}
        >
          {renderButtonContent()}
        </SpringButton>
        
        {isActive && (
          <SpringButton 
            style={styles.doneBtn}
            onPress={() => {
              handleToggleVoice();
              onVoiceComplete();
            }}
          >
             <Text style={styles.doneBtnText}>Send to Dashboard</Text>
          </SpringButton>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrapper: {
    alignItems: 'center',
    paddingHorizontal: 40,
    marginBottom: 80,
    zIndex: 10,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  queryWord: {
    fontSize: 20,
    fontWeight: '400',
    fontStyle: 'italic',
    color: Colors.textPrimary,
    letterSpacing: -0.1,
  },
  queryWordSecondLine: {
    fontSize: 20,
    fontWeight: '400',
    fontStyle: 'italic',
    color: Colors.textPrimary,
  },
  queryWordTyping: {
    color: Colors.signalAmber,
  },
  waveContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    zIndex: 1,
  },
  dustArea: {
    position: 'absolute',
    bottom: 90,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 2,
  },
  dustDot: {
    position: 'absolute',
    bottom: 0,
    backgroundColor: Colors.textPrimary,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  voiceBtnWrapper: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  chatGptVoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 26,
    gap: 10,
    shadowColor: Colors.textPrimary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  activeListeningBtn: {
    backgroundColor: Colors.textPrimary,
    borderColor: '#60A5FA',
    borderWidth: 1,
  },
  micCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMicCircle: {
    backgroundColor: '#1E40AF',
  },
  chatGptVoiceText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.porcelainCard,
    letterSpacing: 0.2,
  },
  doneBtn: {
    marginTop: 16,
  },
  doneBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  }
});
