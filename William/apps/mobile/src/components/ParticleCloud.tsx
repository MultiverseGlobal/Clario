import { Colors } from '../theme/colors';
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const PARTICLES = Array.from({ length: 28 }).map((_, i) => ({
  id: i,
  x: width * 0.15 + Math.random() * (width * 0.7),
  baseY: Math.random() * 40 - 20,
  size: Math.random() * 2.5 + 1.2,
  duration: Math.random() * 2500 + 2000,
  delay: Math.random() * 1500,
  maxOpacity: Math.random() * 0.5 + 0.2,
  floatY: -(Math.random() * 35 + 25),
}));

const ParticleItem: React.FC<{ particle: (typeof PARTICLES)[0] }> = ({ particle }) => {
  const float = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, {
        duration: particle.duration,
        easing: Easing.bezier(0.25, 1, 0.5, 1),
      }),
      -1,
      false
    );

    opacity.value = withRepeat(
      withSequence(
        withTiming(particle.maxOpacity, { duration: particle.duration * 0.4 }),
        withTiming(0, { duration: particle.duration * 0.6 })
      ),
      -1,
      false
    );
  }, [float, opacity, particle]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateY: particle.baseY + float.value * particle.floatY },
      { translateX: Math.sin(float.value * Math.PI * 2) * 6 },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          left: particle.x,
          width: particle.size,
          height: particle.size,
          borderRadius: particle.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

export const ParticleCloud: React.FC = () => {
  return (
    <View style={styles.container} pointerEvents="none">
      {PARTICLES.map((p) => (
        <ParticleItem key={p.id} particle={p} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: -50,
    height: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    backgroundColor: Colors.textPrimary,
  },
});
