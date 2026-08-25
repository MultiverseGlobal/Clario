import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';
import { useOrionStore } from '../store/useOrionStore';
import { Colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');

interface ParticleSphereProps {
  onComplete: () => void;
}

// 180 Fibonacci 3D point-cloud particles — pure hardware-accelerated rendering
const PARTICLE_COUNT = 180;
const SPHERE_PARTICLES = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = goldenAngle * i;
  const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const baseRadius = 85 + (i % 5) * 2;

  return {
    id: i,
    x3d: radiusAtY * Math.cos(theta) * baseRadius,
    y3d: y * baseRadius,
    z3d: radiusAtY * Math.sin(theta) * baseRadius,
    size: 1.5 + Math.random() * 1.8,
  };
});

// Ambient background star field
const AMBIENT_STARS = Array.from({ length: 24 }).map((_, i) => ({
  id: i,
  x: Math.random() * width,
  y: Math.random() * height,
  size: Math.random() * 2 + 1,
  maxOpacity: Math.random() * 0.5 + 0.2,
  duration: Math.random() * 2500 + 1500,
}));

const AmbientStar: React.FC<{ star: (typeof AMBIENT_STARS)[0] }> = ({ star }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      Math.random() * 1000,
      withRepeat(
        withSequence(
          withTiming(star.maxOpacity, { duration: star.duration * 0.5 }),
          withTiming(0.05, { duration: star.duration * 0.5 })
        ),
        -1,
        true
      )
    );
  }, [opacity, star]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ambientStar,
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

type AnimSharedValue = ReturnType<typeof useSharedValue<number>>;

// Lightweight 3D particle node (zero SVG overhead)
const SphereParticleNode: React.FC<{
  p: (typeof SPHERE_PARTICLES)[0];
  spin: AnimSharedValue;
  userZoom: AnimSharedValue;
  burstProgress: AnimSharedValue;
  sphereScale: AnimSharedValue;
}> = ({ p, spin, userZoom, burstProgress, sphereScale }) => {
  const animatedStyle = useAnimatedStyle(() => {
    const angle = spin.value;
    const cosA = Math.cos(angle + p.id * 0.003);
    const sinA = Math.sin(angle + p.id * 0.003);

    const rotatedX = p.x3d * cosA - p.z3d * sinA;
    const rotatedZ = p.x3d * sinA + p.z3d * cosA;
    const rotatedY = p.y3d;

    const perspective = 350;
    const zScale = perspective / (perspective + rotatedZ);
    const projectedX = rotatedX * zScale * userZoom.value;
    const projectedY = rotatedY * zScale * userZoom.value;

    const normalizedZ = (rotatedZ + 90) / 180; // 0 (back) to 1 (front)
    const depthOpacity = 0.25 + normalizedZ * 0.75; // Front particles bright, back dim

    const scatter = 1 + burstProgress.value * 5;
    const burstOpacity = 1 - burstProgress.value;

    return {
      opacity: depthOpacity * burstOpacity * sphereScale.value,
      transform: [
        { translateX: projectedX * scatter },
        { translateY: projectedY * scatter },
        { scale: zScale * (0.6 + normalizedZ * 0.8) * userZoom.value * (1 + burstProgress.value * 0.5) },
      ],
      backgroundColor: Colors.porcelain,
    };
  });

  return (
    <Animated.View
      style={[
        styles.sphereDot,
        {
          width: p.size,
          height: p.size,
          borderRadius: p.size / 2,
        },
        animatedStyle,
      ]}
    />
  );
};

export const ParticleSphere: React.FC<ParticleSphereProps> = ({ onComplete }) => {
  const stage = useOrionStore((s) => s.stage);
  
  const spin = useSharedValue(0);
  const sphereScale = useSharedValue(0);
  const burstProgress = useSharedValue(0);
  const coreGlowOpacity = useSharedValue(0.85);
  const pulseGlow = useSharedValue(1);

  // Pinch-to-zoom & double-tap gesture tracking
  const userZoom = useSharedValue(1);
  const savedZoom = useSharedValue(1);

  useEffect(() => {
    // Stage-based animation state morphing
    if (stage === 'LISTENING') {
      // Radial wave expansion
      sphereScale.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      spin.value = withRepeat(
        withTiming(spin.value + Math.PI * 2, { duration: 12000, easing: Easing.linear }),
        -1,
        false
      );
      coreGlowOpacity.value = withTiming(0.4, { duration: 800 });
      pulseGlow.value = withTiming(1.0);
    } else if (stage === 'PROCESSING' || stage === 'CHAT') {
      // Thinking/Working: Very fast rotation and pulsing Amber glow
      sphereScale.value = withSpring(1.0, { damping: 15, stiffness: 120 });
      spin.value = withRepeat(
        withTiming(spin.value + Math.PI * 2, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
      coreGlowOpacity.value = withTiming(1.0, { duration: 800 });
      pulseGlow.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      // Idle: Gentle continuous breathing
      sphereScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
          withTiming(1.0, { duration: 3000, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      );
      spin.value = withRepeat(
        withTiming(spin.value + Math.PI * 2, { duration: 36000, easing: Easing.linear }),
        -1,
        false
      );
      coreGlowOpacity.value = withTiming(0.6, { duration: 800 });
      pulseGlow.value = withTiming(1.0);
    }
  }, [stage, spin, sphereScale, coreGlowOpacity, pulseGlow]);

  const triggerBurst = () => {
    if (burstProgress.value > 0) return;
    burstProgress.value = withTiming(
      1,
      { duration: 800, easing: Easing.bezier(0.16, 1, 0.3, 1) },
      (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      }
    );
  };

  // Pinch Gesture for Google Earth-style zoom in/out
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      userZoom.value = Math.min(Math.max(savedZoom.value * e.scale, 0.6), 2.4);
      if (userZoom.value > 2.0 && burstProgress.value === 0) {
        runOnJS(triggerBurst)();
      }
    })
    .onEnd(() => {
      savedZoom.value = userZoom.value;
    });

  // Single Tap to advance stage
  const tapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      runOnJS(triggerBurst)();
    });

  // Double Tap to toggle zoom preset (1.0x <-> 1.6x)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (userZoom.value > 1.2) {
        userZoom.value = withTiming(1.0);
        savedZoom.value = 1.0;
      } else {
        userZoom.value = withTiming(1.6);
        savedZoom.value = 1.6;
      }
    });

  const composedGestures = Gesture.Race(doubleTapGesture, Gesture.Simultaneous(pinchGesture, tapGesture));

  const orbAnimatedStyle = useAnimatedStyle(() => {
    const isWorking = stage === 'PROCESSING' || stage === 'CHAT';
    return {
      transform: [{ scale: userZoom.value }],
      backgroundColor: isWorking ? Colors.signalAmber : Colors.porcelain,
      opacity: coreGlowOpacity.value,
      shadowRadius: 40 * pulseGlow.value,
      shadowOpacity: (isWorking ? 0.9 : 0.8) * pulseGlow.value,
    };
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={composedGestures}>
        <View style={styles.container}>
          {/* Ambient background stars */}
          {AMBIENT_STARS.map((s) => (
            <AmbientStar key={s.id} star={s} />
          ))}

          {/* Central glowing white core matching reference frame 110 */}
          <Animated.View style={[styles.glowCore, orbAnimatedStyle]} />

          {/* Pure 3D White Point Cloud Sphere */}
          <View style={styles.sphereCenter}>
            {SPHERE_PARTICLES.map((p) => (
              <SphereParticleNode
                key={p.id}
                p={p}
                spin={spin}
                userZoom={userZoom}
                burstProgress={burstProgress}
                sphereScale={sphereScale}
              />
            ))}
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.obsidian,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ambientStar: {
    position: 'absolute',
    backgroundColor: Colors.porcelainCard,
  },
  glowCore: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: Colors.porcelain,
    shadowColor: Colors.signalAmber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 40,
    elevation: 10,
  },
  sphereCenter: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sphereDot: {
    position: 'absolute',
    backgroundColor: Colors.porcelain,
    shadowColor: Colors.porcelain,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
  },
});
