import { Colors } from '../theme/colors';
import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Link2, Clock } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

export function SystemStatusRow() {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500 }),
        withTiming(0.4, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.statusPill}>
        <Animated.View style={[styles.dot, animatedStyle]} />
        <Text style={styles.text}>Connected to Atlas</Text>
      </View>
      <View style={styles.statusPill}>
        <Check size={10} color="#10B981" />
        <Text style={styles.text}>Calendar Synced</Text>
      </View>
      <View style={styles.statusPill}>
        <Check size={10} color="#10B981" />
        <Text style={styles.text}>Context Fresh</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.porcelainSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  text: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
