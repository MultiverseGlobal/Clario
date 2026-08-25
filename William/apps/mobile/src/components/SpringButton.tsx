import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface SpringButtonProps extends PressableProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  hapticFeedback?: boolean;
  activeOpacity?: number; // legacy from TouchableOpacity
}

export function SpringButton({
  children,
  style,
  onPressIn,
  onPressOut,
  onPress,
  hapticFeedback = true,
  ...rest
}: SpringButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  const handlePressIn = (e: any) => {
    scale.value = withSpring(0.97, { damping: 20, stiffness: 150 });
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPressIn) onPressIn(e);
  };

  const handlePressOut = (e: any) => {
    scale.value = withSpring(1, { damping: 20, stiffness: 150 });
    if (onPressOut) onPressOut(e);
  };

  const handlePress = (e: any) => {
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (onPress) onPress(e);
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[animatedStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
