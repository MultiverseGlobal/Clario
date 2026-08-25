import React, { useEffect } from 'react';
import { Dimensions } from 'react-native';
import { Canvas, Path, LinearGradient, vec, Skia } from '@shopify/react-native-skia';
import { useSharedValue, withRepeat, withTiming, Easing, useDerivedValue } from 'react-native-reanimated';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');
const HEIGHT = 140;
const CENTER_Y = HEIGHT / 2;
const POINTS = 6;

export function OrionAudioWave({ isRecording }: { isRecording: boolean }) {
  const phase = useSharedValue(0);
  const amplitude = useSharedValue(10);

  useEffect(() => {
    // Continuous horizontal shift
    phase.value = withRepeat(
      withTiming(Math.PI * 2, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );

    if (isRecording) {
      amplitude.value = withRepeat(
        withTiming(45, { duration: 400, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      amplitude.value = withTiming(10, { duration: 800 });
    }
  }, [isRecording]);

  const path = useDerivedValue(() => {
    const p = Skia.Path.Make();
    p.moveTo(0, CENTER_Y);

    for (let i = 0; i <= POINTS; i++) {
      const x = (i / POINTS) * width;
      // Add a natural organic sine wave that moves
      const normalizedX = (i / POINTS) * Math.PI * 2;
      const yOffset = Math.sin(normalizedX + phase.value) * amplitude.value;
      
      if (i === 0) {
        p.lineTo(x, CENTER_Y + yOffset);
      } else {
        // Smooth bezier curves between points
        const prevX = ((i - 1) / POINTS) * width;
        const prevNormalizedX = ((i - 1) / POINTS) * Math.PI * 2;
        const prevYOffset = Math.sin(prevNormalizedX + phase.value) * amplitude.value;
        
        const cp1x = prevX + (x - prevX) / 2;
        const cp1y = CENTER_Y + prevYOffset;
        const cp2x = prevX + (x - prevX) / 2;
        const cp2y = CENTER_Y + yOffset;

        p.cubicTo(cp1x, cp1y, cp2x, cp2y, x, CENTER_Y + yOffset);
      }
    }

    p.lineTo(width, HEIGHT);
    p.lineTo(0, HEIGHT);
    p.close();
    return p;
  });

  return (
    <Canvas style={{ width, height: HEIGHT, position: 'absolute', bottom: 0, left: 0 }}>
      <Path path={path}>
        <LinearGradient
          start={vec(0, CENTER_Y - 50)}
          end={vec(0, HEIGHT)}
          colors={['rgba(212, 245, 122, 0.4)', 'rgba(212, 245, 122, 0)']}
        />
      </Path>
      
      {/* Secondary trailing wave for depth */}
      <Path 
        path={useDerivedValue(() => {
           const p2 = Skia.Path.Make();
           p2.moveTo(0, CENTER_Y);
           for (let i = 0; i <= POINTS; i++) {
             const x = (i / POINTS) * width;
             const normalizedX = (i / POINTS) * Math.PI * 2;
             const yOffset = Math.sin(normalizedX + phase.value + 1.5) * (amplitude.value * 0.6);
             if (i===0) p2.lineTo(x, CENTER_Y + yOffset);
             else {
               const prevX = ((i - 1) / POINTS) * width;
               const prevYOffset = Math.sin(((i-1)/POINTS)*Math.PI*2 + phase.value + 1.5) * (amplitude.value * 0.6);
               p2.cubicTo(prevX + (x-prevX)/2, CENTER_Y + prevYOffset, prevX + (x-prevX)/2, CENTER_Y + yOffset, x, CENTER_Y + yOffset);
             }
           }
           p2.lineTo(width, HEIGHT);
           p2.lineTo(0, HEIGHT);
           p2.close();
           return p2;
        })}
      >
        <LinearGradient
          start={vec(0, CENTER_Y - 50)}
          end={vec(0, HEIGHT)}
          colors={['rgba(212, 245, 122, 0.2)', 'rgba(212, 245, 122, 0)']}
        />
      </Path>
    </Canvas>
  );
}
