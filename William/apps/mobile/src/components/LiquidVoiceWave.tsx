import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedPath = Animated.createAnimatedComponent(Path);

const { width } = Dimensions.get('window');
const WAVE_HEIGHT = 120;
const MID_Y = 60;

interface LiquidVoiceWaveProps {
  isListening?: boolean;
  intensity?: number; // 0 to 1 based on voice volume
}

export const LiquidVoiceWave: React.FC<LiquidVoiceWaveProps> = ({
  isListening = true,
  intensity = 0.5,
}) => {
  const phase = useSharedValue(0);
  const amplitude = useSharedValue(15);

  useEffect(() => {
    // Continuous liquid oscillation loop
    phase.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: 3500,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [phase]);

  useEffect(() => {
    const targetAmp = isListening ? 25 + intensity * 35 : 12;
    amplitude.value = withTiming(targetAmp, {
      duration: 400,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    });
  }, [isListening, intensity, amplitude]);

  // Animated path props for 3 fluid wave layers matching Glebich's design
  const waveProps1 = useAnimatedProps(() => {
    const p = phase.value;
    const a = amplitude.value;
    const cp1Y = MID_Y - Math.sin(p) * a * 1.2;
    const cp2Y = MID_Y + Math.cos(p) * a * 1.1;
    const endY = MID_Y - Math.sin(p + 1) * (a * 0.4);

    const d = `M 0 ${MID_Y} C ${width * 0.25} ${cp1Y}, ${width * 0.75} ${cp2Y}, ${width} ${endY} L ${width} ${WAVE_HEIGHT} L 0 ${WAVE_HEIGHT} Z`;
    return { d };
  });

  const waveProps2 = useAnimatedProps(() => {
    const p = phase.value + 1.2;
    const a = amplitude.value * 0.85;
    const cp1Y = MID_Y - Math.cos(p) * a * 1.1;
    const cp2Y = MID_Y + Math.sin(p) * a * 1.3;
    const endY = MID_Y - Math.cos(p + 0.8) * (a * 0.3);

    const d = `M 0 ${MID_Y + 5} C ${width * 0.3} ${cp1Y}, ${width * 0.7} ${cp2Y}, ${width} ${endY} L ${width} ${WAVE_HEIGHT} L 0 ${WAVE_HEIGHT} Z`;
    return { d };
  });

  const waveProps3 = useAnimatedProps(() => {
    const p = phase.value + 2.5;
    const a = amplitude.value * 0.6;
    const cp1Y = MID_Y - Math.sin(p * 1.3) * a;
    const cp2Y = MID_Y + Math.cos(p * 1.2) * a;
    const endY = MID_Y - Math.sin(p + 1.5) * (a * 0.2);

    const d = `M 0 ${MID_Y - 4} C ${width * 0.35} ${cp1Y}, ${width * 0.65} ${cp2Y}, ${width} ${endY} L ${width} ${WAVE_HEIGHT} L 0 ${WAVE_HEIGHT} Z`;
    return { d };
  });

  return (
    <View style={styles.container}>
      <Svg width={width} height={WAVE_HEIGHT} viewBox={`0 0 ${width} ${WAVE_HEIGHT}`}>
        <Defs>
          <LinearGradient id="waveGradDark" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#1E1F22" stopOpacity={0.85} />
            <Stop offset="100%" stopColor="#37393F" stopOpacity={0.3} />
          </LinearGradient>
          <LinearGradient id="waveGradMid" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#555861" stopOpacity={0.6} />
            <Stop offset="100%" stopColor="#808491" stopOpacity={0.15} />
          </LinearGradient>
          <LinearGradient id="waveGradLight" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#9DA1AC" stopOpacity={0.4} />
            <Stop offset="100%" stopColor="#E2E4E8" stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {/* Back wave layer */}
        <AnimatedPath animatedProps={waveProps3} fill="url(#waveGradLight)" />

        {/* Middle wave layer */}
        <AnimatedPath animatedProps={waveProps2} fill="url(#waveGradMid)" />

        {/* Front dark wave ribbon */}
        <AnimatedPath animatedProps={waveProps1} fill="url(#waveGradDark)" />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: WAVE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
