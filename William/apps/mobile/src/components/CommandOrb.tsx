import { SpringButton } from '../components/SpringButton';
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { TOKENS } from '../constants/tokens';

interface CommandOrbProps {
  isZoomed: boolean;
  onPress?: () => void;
}

export const CommandOrb: React.FC<CommandOrbProps> = ({ isZoomed, onPress }) => {
  // Breathing animation shared values
  const breatheAnim = useSharedValue(1);
  const glowAnim = useSharedValue(0.4);

  // Zoom animation shared values
  const zoomScale = useSharedValue(1);
  const zoomTranslateY = useSharedValue(0);

  useEffect(() => {
    // Continuous breathing loop
    breatheAnim.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 3000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(0.94, { duration: 3000, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      true
    );

    glowAnim.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 3000, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        withTiming(0.35, { duration: 3000, easing: Easing.bezier(0.4, 0, 0.2, 1) })
      ),
      -1,
      true
    );
  }, [breatheAnim, glowAnim]);

  useEffect(() => {
    zoomScale.value = withTiming(isZoomed ? 1.6 : 1, {
      duration: TOKENS.animation.entranceDuration,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
    zoomTranslateY.value = withTiming(isZoomed ? -75 : 0, {
      duration: TOKENS.animation.entranceDuration,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [isZoomed, zoomScale, zoomTranslateY]);

  const orbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: zoomTranslateY.value },
      { scale: breatheAnim.value * zoomScale.value },
    ],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowAnim.value,
  }));

  return (
    <SpringButton
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.touchContainer}
    >
      <Animated.View style={[styles.orbWrapper, orbAnimatedStyle]}>
        {/* Soft Radial Glow Bloom Background */}
        <Animated.View style={[styles.glowBloom, glowAnimatedStyle]} />

        {/* Outer Ring */}
        <View style={styles.outerRing} />

        {/* Middle Concentric Ring */}
        <View style={styles.middleRing} />

        {/* Inner Core Ring */}
        <View style={styles.innerCore} />
      </Animated.View>
    </SpringButton>
  );
};

const styles = StyleSheet.create({
  touchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  orbWrapper: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  glowBloom: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: TOKENS.colors.accent,
    opacity: 0.4,
    shadowColor: TOKENS.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 40,
    elevation: 20,
  },
  outerRing: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 151, 76, 0.35)',
  },
  middleRing: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 151, 76, 0.65)',
    backgroundColor: 'rgba(201, 151, 76, 0.08)',
  },
  innerCore: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: TOKENS.colors.accent,
    shadowColor: TOKENS.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
});
