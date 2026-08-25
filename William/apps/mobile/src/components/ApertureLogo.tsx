import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../theme/colors';
import { useOrionStore } from '../store/useOrionStore';

interface ApertureLogoProps {
  size?: number;
  color?: string;
  accentColor?: string;
  animated?: boolean;
}

export function ApertureLogo({
  size = 28,
  color = Colors.textPrimary,
  accentColor = Colors.accent,
  animated = true,
}: ApertureLogoProps) {
  const stage = useOrionStore((s) => s.stage);
  
  const rotation = useSharedValue(0);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (!animated) return;

    if (stage === 'LISTENING') {
      // Faster rotation + pulsing scale
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, {
          duration: 4000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
      scale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else if (stage === 'PROCESSING' || stage === 'CHAT') {
      // Very fast processing rotation
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, {
          duration: 2000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
      scale.value = withTiming(1.0, { duration: 300 });
    } else {
      // Idle: slow gentle rotation
      rotation.value = withRepeat(
        withTiming(rotation.value + 360, {
          duration: 24000,
          easing: Easing.linear,
        }),
        -1,
        false
      );
      scale.value = withTiming(1.0, { duration: 800 });
    }
  }, [animated, stage, rotation, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { scale: scale.value }
    ],
  }));

  const strokeWidth = size * 0.07;
  const radius = (size - strokeWidth * 2) / 2;
  
  const isWorking = stage === 'PROCESSING' || stage === 'CHAT';
  const dynamicAccent = (animated && isWorking) ? Colors.accent : accentColor;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Animated.View style={animated ? animatedStyle : undefined}>
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <G fill="none" stroke={color} strokeWidth="6">
            {/* Outer Precision Ring */}
            <Circle cx="50" cy="50" r="44" strokeWidth="4" opacity={0.25} />
            <Circle cx="50" cy="50" r="44" strokeWidth="5" strokeDasharray="12 8" />

            {/* Inner Precision Aperture Blades */}
            <Path d="M 50 14 L 74 38 M 74 38 L 86 62 M 86 62 L 62 86 M 62 86 L 38 74 M 38 74 L 14 50 M 14 50 L 38 26" strokeWidth="4.5" strokeLinecap="round" opacity={0.8} />

            {/* Focal Point Accent Center */}
            <Circle cx="50" cy="50" r="10" fill={dynamicAccent} stroke="none" />
            <Circle cx="50" cy="50" r="4" fill={Colors.bg} stroke="none" />
          </G>
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
