import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { TOKENS } from '../constants/tokens';

const { width, height } = Dimensions.get('window');

const STARS = Array.from({ length: 14 }).map((_, i) => ({
  id: i,
  x: Math.random() * width,
  y: Math.random() * height,
  size: Math.random() * 2 + 1.5,
  speed: Math.random() * 8000 + 6000,
  initialOpacity: Math.random() * 0.4 + 0.2,
}));

const StarItem: React.FC<{ star: (typeof STARS)[0] }> = ({ star }) => {
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: star.speed }),
        withTiming(0, { duration: star.speed })
      ),
      -1,
      true
    );
  }, [anim, star.speed]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = star.initialOpacity + anim.value * 0.4;
    const translateY = -15 * anim.value;
    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  return (
    <Animated.View
      style={[
        styles.star,
        {
          left: star.x,
          top: star.y,
          width: star.size,
          height: star.size,
          borderRadius: star.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

export const Starfield: React.FC = () => {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {STARS.map((star) => (
        <StarItem key={star.id} star={star} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  star: {
    position: 'absolute',
    backgroundColor: TOKENS.colors.textPrimary,
  },
});
