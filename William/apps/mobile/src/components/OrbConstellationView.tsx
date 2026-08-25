import { SpringButton } from '../components/SpringButton';
import { Colors } from '../theme/colors';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet,  TextInput, Dimensions } from 'react-native';
import { ArrowLeft, Search, XCircle } from 'lucide-react-native';
import Svg, { Line } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { ConstellationNode } from '../store/useOrionStore';

const { width, height } = Dimensions.get('window');
const AnimatedLine = Animated.createAnimatedComponent(Line);

interface OrbConstellationViewProps {
  nodes: ConstellationNode[];
  onSelectNode: (node: ConstellationNode) => void;
  onBack?: () => void;
  autoExplode?: boolean;
}

// 48 3D Point-Cloud Particles (Ultra-Fast 120 FPS Native Performance)
const PARTICLE_COUNT = 48;
const SPHERE_PARTICLES = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = goldenAngle * i;
  const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
  const radiusAtY = Math.sqrt(1 - y * y);
  const baseRadius = 85 + (i % 5) * 2;

  // Pre-assign each particle to target node coordinates for morphing explosion
  const targetNodeIdx = i % 4;

  return {
    id: i,
    x3d: radiusAtY * Math.cos(theta) * baseRadius,
    y3d: y * baseRadius,
    z3d: radiusAtY * Math.sin(theta) * baseRadius,
    targetNodeIdx,
    size: 1.8 + Math.random() * 1.8,
  };
});

// Ambient background star field (Optimized)
const AMBIENT_STARS: any[] = [];

const StarDot: React.FC<{ star: (typeof AMBIENT_STARS)[0] }> = ({ star }) => {
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

type AnimSharedValue = ReturnType<typeof useSharedValue<number>>;

// Individual particle node that spins inside Orb, then explodes outwards into Constellation Node points
const MorphParticle: React.FC<{
  p: (typeof SPHERE_PARTICLES)[0];
  nodes: ConstellationNode[];
  spin: AnimSharedValue;
  explosionProgress: AnimSharedValue;
}> = ({ p, nodes, spin, explosionProgress }) => {
  const targetNode = nodes[p.targetNodeIdx % nodes.length] || nodes[0];
  const targetX = (targetNode.xPercent / 100) * width - width / 2;
  const targetY = (targetNode.yPercent / 100) * height - height / 2;

  const animatedStyle = useAnimatedStyle(() => {
    const angle = spin.value;
    const cosA = Math.cos(angle + p.id * 0.003);
    const sinA = Math.sin(angle + p.id * 0.003);

    const rotatedX = p.x3d * cosA - p.z3d * sinA;
    const rotatedZ = p.x3d * sinA + p.z3d * cosA;
    const rotatedY = p.y3d;

    const perspective = 350;
    const zScale = perspective / (perspective + rotatedZ);
    const orbX = rotatedX * zScale;
    const orbY = rotatedY * zScale;

    // Clean structured constellation halo ring around target node
    const ringAngle = (p.id / PARTICLE_COUNT) * Math.PI * 2;
    const ringRadius = 14 + (p.id % 4) * 6; // neat 14px-32px orbital ring
    const nodeHaloX = targetX + Math.cos(ringAngle) * ringRadius;
    const nodeHaloY = targetY + Math.sin(ringAngle) * ringRadius;

    // Smooth direct trajectory from Orb sphere coordinates to clean Node orbital rings
    const currentX = interpolate(
      explosionProgress.value,
      [0, 1],
      [orbX, nodeHaloX],
      Extrapolation.CLAMP
    );

    const currentY = interpolate(
      explosionProgress.value,
      [0, 1],
      [orbY, nodeHaloY],
      Extrapolation.CLAMP
    );

    const normalizedZ = (rotatedZ + 90) / 180;
    const orbOpacity = 0.25 + normalizedZ * 0.75;
    
    const opacity = interpolate(
      explosionProgress.value,
      [0, 0.3, 0.8, 1],
      [orbOpacity, 0.9, 0.6, 0.3],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [
        { translateX: currentX },
        { translateY: currentY },
        { scale: zScale * (0.6 + normalizedZ * 0.8) },
      ],
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

// Node Label tag that soft fades in as particles settle (reference frame 154)
const NodeLabelItem: React.FC<{
  node: ConstellationNode;
  onSelect: () => void;
  index: number;
  explosionProgress: AnimSharedValue;
}> = ({ node, onSelect, index, explosionProgress }) => {
  const pulse = useSharedValue(0.6);

  useEffect(() => {
    if (node.isPrimary) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    }
  }, [pulse, node]);

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      explosionProgress.value,
      [0.6, 1],
      [0, 1],
      Extrapolation.CLAMP
    );
    const translateY = interpolate(
      explosionProgress.value,
      [0.6, 1],
      [15, 0],
      Extrapolation.CLAMP
    );

    return {
      opacity,
      transform: [{ translateY }],
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.8 + pulse.value * 0.5 }],
  }));

  const posX = (node.xPercent / 100) * width;
  const posY = (node.yPercent / 100) * height;

  return (
    <Animated.View
      style={[styles.nodeContainer, { left: posX - 70, top: posY - 20 }, animatedStyle]}
      pointerEvents={explosionProgress.value > 0.8 ? 'auto' : 'none'}
    >
      <SpringButton
        activeOpacity={0.7}
        onPress={onSelect}
        style={styles.nodeTouchable}
      >
        <View style={styles.nodeGlowWrapper}>
          <Animated.View style={[styles.glowRing, glowStyle]} />
          <View style={[styles.nodeDot, node.isPrimary && styles.primaryDot]} />
        </View>

        <Text style={[styles.nodeLabel, node.isPrimary && styles.primaryLabel]}>
          {node.label}
        </Text>
      </SpringButton>
    </Animated.View>
  );
};

export const OrbConstellationView: React.FC<OrbConstellationViewProps> = ({
  nodes,
  onSelectNode,
  onBack,
  autoExplode = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const spin = useSharedValue(0);
  const explosionProgress = useSharedValue(0);

  const handleHeaderBack = () => {
    if (explosionProgress.value > 0.5) {
      // Step back from Constellation Nodes to Spinning Orb
      explosionProgress.value = withTiming(0, { duration: 600, easing: Easing.bezier(0.16, 1, 0.3, 1) });
    } else {
      // Step back from Spinning Orb to Home Prompt View
      onBack?.();
    }
  };

  const safeNodes = nodes || [];
  const filteredNodes = safeNodes.filter(n => n.label.toLowerCase().includes(searchQuery.toLowerCase()));

  useEffect(() => {
    // 60 FPS spinning loop
    spin.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 5500, easing: Easing.linear }),
      -1,
      false
    );

    // Auto explode orb particles into nodes after 1.5s (matching Dribbble reference)
    if (autoExplode) {
      const timer = setTimeout(() => {
        triggerExplosion();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [spin, autoExplode]);

  const triggerExplosion = () => {
    if (explosionProgress.value > 0) return;
    explosionProgress.value = withTiming(1, {
      duration: 1100,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  };

  const glowCoreStyle = useAnimatedStyle(() => {
    const scale = interpolate(explosionProgress.value, [0, 0.4, 1], [1, 2.5, 0]);
    const opacity = interpolate(explosionProgress.value, [0, 0.5, 1], [0.85, 0.4, 0]);
    return {
      opacity,
      transform: [{ scale }],
    };
  });

  return (
    <SpringButton
      activeOpacity={1}
      style={styles.container}
      onPress={triggerExplosion}
    >
      {/* Ambient twinkling background stars */}
      {AMBIENT_STARS.map((s) => (
        <StarDot key={s.id} star={s} />
      ))}

      {/* Embedded In-Orb Back Arrow & Search Bar */}
      <View style={styles.inOrbSearchWrapper}>
        {onBack && (
          <SpringButton onPress={handleHeaderBack} style={styles.backBtn}>
            <ArrowLeft size={18} color={Colors.textPrimary} />
          </SpringButton>
        )}
        <View style={styles.inOrbSearchBar}>
          <Search size={14} color={Colors.textSecondary} />
          <TextInput
            style={styles.inOrbSearchInput}
            placeholder="Search nodes or properties..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              triggerExplosion();
            }}
          />
          {searchQuery.length > 0 && (
            <SpringButton onPress={() => setSearchQuery('')}>
              <XCircle size={14} color={Colors.textMuted} />
            </SpringButton>
          )}
        </View>
      </View>

      {/* Central Glowing Orb Core */}
      <Animated.View style={[styles.glowCore, glowCoreStyle]} />

      {/* Morphing 3D Particle Cloud */}
      <View style={styles.centerContainer}>
        {SPHERE_PARTICLES.map((p) => (
          <MorphParticle
            key={p.id}
            p={p}
            nodes={filteredNodes.length > 0 ? filteredNodes : nodes}
            spin={spin}
            explosionProgress={explosionProgress}
          />
        ))}
      </View>

      {/* Topic Node Clusters (Illuminating when particles settle) */}
      {(filteredNodes.length > 0 ? filteredNodes : nodes).map((node, idx) => (
        <NodeLabelItem
          key={node.id}
          node={node}
          index={idx}
          explosionProgress={explosionProgress}
          onSelect={() => onSelectNode(node)}
        />
      ))}
    </SpringButton>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.porcelain,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  star: {
    position: 'absolute',
    backgroundColor: Colors.porcelainCard,
  },
  glowCore: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    shadowColor: Colors.porcelainCard,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 10,
  },
  centerContainer: {
    width: 1,
    height: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sphereDot: {
    position: 'absolute',
    backgroundColor: Colors.porcelainCard,
    shadowColor: Colors.porcelainCard,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
  },
  nodeContainer: {
    position: 'absolute',
    width: 140,
    alignItems: 'center',
    zIndex: 20,
  },
  nodeTouchable: {
    alignItems: 'center',
  },
  nodeGlowWrapper: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  glowRing: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: Colors.porcelainCard,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 6,
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textMuted,
  },
  primaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.porcelainCard,
    shadowColor: Colors.porcelainCard,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  nodeLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '400',
    textAlign: 'center',
  },
  primaryLabel: {
    fontSize: 18,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  inOrbSearchWrapper: {
    position: 'absolute',
    top: 54,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    zIndex: 50,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  inOrbSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  inOrbSearchInput: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
});
