import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Line, Circle } from 'react-native-svg';
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
import { ConstellationNode } from '../store/useOrionStore';
import { SpringButton } from './SpringButton';
import { Colors } from '../theme/colors';

const { width, height } = Dimensions.get('window');
const AnimatedLine = Animated.createAnimatedComponent(Line);

interface ConstellationNodesProps {
  nodes: ConstellationNode[];
  onSelectNode: (node: ConstellationNode) => void;
}

// Ambient background stars
const AMBIENT_STARS = Array.from({ length: 40 }).map((_, i) => ({
  id: i,
  x: Math.random() * width,
  y: Math.random() * height,
  size: Math.random() * 3 + 1,
  duration: Math.random() * 2500 + 1500,
  maxOpacity: Math.random() * 0.7 + 0.15,
}));

const StarDot: React.FC<{ star: (typeof AMBIENT_STARS)[0] }> = ({ star }) => {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      Math.random() * 1200,
      withRepeat(
        withSequence(
          withTiming(star.maxOpacity, { duration: star.duration * 0.4 }),
          withTiming(0.05, { duration: star.duration * 0.6 })
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

// Node component with glow pulse
const NodeTag: React.FC<{ node: ConstellationNode; onSelect: () => void; index: number }> = ({
  node,
  onSelect,
  index,
}) => {
  const pulse = useSharedValue(0.6);
  const entranceOpacity = useSharedValue(0);
  const entranceTranslateY = useSharedValue(20);

  useEffect(() => {
    entranceOpacity.value = withDelay(
      index * 120 + 150,
      withTiming(1, { duration: 500 })
    );
    entranceTranslateY.value = withDelay(
      index * 120 + 150,
      withTiming(0, { duration: 600, easing: Easing.out(Easing.back(1.2)) })
    );

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
  }, [pulse, entranceOpacity, entranceTranslateY, node, index]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: pulse.value,
    transform: [{ scale: 0.8 + pulse.value * 0.5 }],
  }));

  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entranceOpacity.value,
    transform: [{ translateY: entranceTranslateY.value }],
  }));

  const posX = (node.xPercent / 100) * width;
  const posY = (node.yPercent / 100) * height;

  return (
    <Animated.View style={[styles.nodeContainer, { left: posX - 70, top: posY - 20 }, entranceStyle]}>
      <SpringButton
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

// Animated connecting SVG web line between pairs of nodes
const ConstellationEdge: React.FC<{
  n1: ConstellationNode;
  n2: ConstellationNode;
}> = ({ n1, n2 }) => {
  const lineProgress = useSharedValue(0);

  useEffect(() => {
    lineProgress.value = withDelay(
      400,
      withTiming(1, { duration: 1000, easing: Easing.out(Easing.ease) })
    );
  }, [lineProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeOpacity: lineProgress.value * 0.7,
  }));

  const x1 = (n1.xPercent / 100) * width;
  const y1 = (n1.yPercent / 100) * height;
  const x2 = (n2.xPercent / 100) * width;
  const y2 = (n2.yPercent / 100) * height;

  return (
    <AnimatedLine
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={Colors.textSecondary}
      strokeWidth={1.5}
      animatedProps={animatedProps}
    />
  );
};

export const ConstellationNodes: React.FC<ConstellationNodesProps> = ({
  nodes,
  onSelectNode,
}) => {
  // Generate web connections between all node pairs
  const edges = [
    [nodes[0], nodes[1]], // Primary ↔ Wallmart
    [nodes[0], nodes[2]], // Primary ↔ Agenda
    [nodes[0], nodes[3]], // Primary ↔ Weekend
    [nodes[1], nodes[2]], // Wallmart ↔ Agenda
    [nodes[2], nodes[3]], // Agenda ↔ Weekend
  ];

  return (
    <View style={styles.container}>
      {/* Ambient background stars */}
      {AMBIENT_STARS.map((s) => (
        <StarDot key={s.id} star={s} />
      ))}

      {/* SVG Illuminated Web Layer connecting ALL nodes */}
      <Svg width={width} height={height} style={styles.svgLayer} pointerEvents="none">
        {edges.map(([n1, n2], idx) => (
          <ConstellationEdge key={`edge-${idx}`} n1={n1} n2={n2} />
        ))}
      </Svg>

      {/* Topic Node Clusters */}
      {nodes.map((node, idx) => (
        <NodeTag
          key={node.id}
          node={node}
          index={idx}
          onSelect={() => onSelectNode(node)}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.obsidian,
    position: 'relative',
  },
  svgLayer: {
    position: 'absolute',
    inset: 0,
  },
  star: {
    position: 'absolute',
    backgroundColor: Colors.porcelain,
    shadowColor: Colors.porcelain,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
  },
  nodeContainer: {
    position: 'absolute',
    width: 140,
    alignItems: 'center',
    zIndex: 10,
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
    shadowColor: Colors.signalAmber,
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
    backgroundColor: Colors.porcelain,
    shadowColor: Colors.porcelain,
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
    color: Colors.porcelain,
    fontWeight: '600',
  },
});
