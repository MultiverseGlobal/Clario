/**
 * ExecutiveDock — Pillowtalk-style minimal toolbar
 * Reduced to 3 core tabs: Journal, Record (Center), Insights
 */
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { LayoutList, BarChart2 } from 'lucide-react-native';
import { useRouter, usePathname } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

import { useOrionStore } from '../store/useOrionStore';
import { Colors } from '../theme/colors';
import { OrionLogo } from './OrionLogo';
import { SpringButton } from './SpringButton';

interface ExecutiveDockProps {
  onResetOrb?: () => void;
}

function DockItem({
  icon: Icon,
  route,
  isActive,
  onPress,
}: {
  icon: any;
  route: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const dotScale = useSharedValue(isActive ? 1 : 0);

  React.useEffect(() => {
    dotScale.value = withSpring(isActive ? 1 : 0, { damping: 16, stiffness: 200 });
  }, [isActive]);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotScale.value,
  }));

  return (
    <TouchableOpacity style={styles.dockItem} onPress={onPress} activeOpacity={0.7}>
      <Icon
        size={22}
        color={isActive ? Colors.textPrimary : Colors.textMuted}
        strokeWidth={isActive ? 2.5 : 2}
      />
      <Animated.View style={[styles.activeDot, dotStyle]} />
    </TouchableOpacity>
  );
}

export function ExecutiveDock({ onResetOrb }: ExecutiveDockProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { setStage } = useOrionStore();

  const isHome = pathname === '/';

  return (
    <View style={styles.dockWrapper} pointerEvents="box-none">
      <View style={styles.dockBar}>
        {/* Left: Journal (formerly Chronicle) */}
        <DockItem
          icon={LayoutList}
          route="/chronicle"
          isActive={pathname.startsWith('/chronicle')}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.push('/chronicle');
          }}
        />

        {/* Center: Record (Home) */}
        <SpringButton
          style={styles.centerBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            setStage('LISTENING');
            onResetOrb?.();
            if (pathname !== '/') router.push('/');
          }}
        >
          <View style={[styles.centerInner, isHome && styles.centerInnerActive]}>
            <OrionLogo
              size={24}
              animated={isHome}
            />
          </View>
        </SpringButton>

        {/* Right: Insights */}
        <DockItem
          icon={BarChart2}
          route="/insights"
          isActive={pathname.startsWith('/insights')}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.push('/insights');
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dockWrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 32 : 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 90,
  },
  dockBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28, 24, 22, 0.85)', // Slightly translucent warm dark
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: 16,
  },
  dockItem: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.accent,
  },
  centerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  centerInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  centerInnerActive: {
    backgroundColor: '#2A2421',
    borderColor: Colors.accentMuted,
  },
});
