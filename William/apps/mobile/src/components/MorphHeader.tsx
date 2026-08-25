/**
 * MorphHeader — Pillowtalk mark-first hierarchy
 *
 * Reference: Pillowtalk places its logo mark top-left (24px inset)
 * with content-first layout. The header is minimal, dark, no title prominence.
 * Edit mode slides action toolbar in — same morph behavior as before but re-skinned.
 */
import { SpringButton } from '../components/SpringButton';
import { Colors } from '../theme/colors';
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ArrowLeft, Trash2, Share2, PlusCircle, Check, Edit2 } from 'lucide-react-native';

interface MorphHeaderProps {
  title: string;
  fileCount: number;
  isEditMode: boolean;
  onBack: () => void;
  onToggleEdit: () => void;
  onDeleteAction?: () => void;
  onShareAction?: () => void;
  onAddAction?: () => void;
}

export const MorphHeader: React.FC<MorphHeaderProps> = ({
  title,
  fileCount,
  isEditMode,
  onBack,
  onToggleEdit,
  onDeleteAction,
  onShareAction,
  onAddAction,
}) => {
  const defaultStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isEditMode ? 0 : 1, { duration: 260, easing: Easing.ease }),
    transform: [
      { translateY: withTiming(isEditMode ? -8 : 0, { duration: 300, easing: Easing.out(Easing.ease) }) },
    ],
  }));

  const editStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isEditMode ? 1 : 0, { duration: 260, easing: Easing.ease }),
    transform: [
      { translateY: withTiming(isEditMode ? 0 : 8, { duration: 300, easing: Easing.out(Easing.ease) }) },
    ],
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        {/* Left: back */}
        <SpringButton style={styles.iconBtn} onPress={onBack} activeOpacity={0.6}>
          <ArrowLeft size={18} color={Colors.textSecondary} />
        </SpringButton>

        {/* Center: title morph */}
        <View style={styles.centerArea}>
          <Animated.View
            style={[styles.titleGroup, defaultStyle]}
            pointerEvents={isEditMode ? 'none' : 'auto'}
          >
            {/* Lowercase brand voice — Pillowtalk pattern */}
            <Text style={styles.title}>{title.toLowerCase()}</Text>
            <Text style={styles.subtitle}>{fileCount} entries</Text>
          </Animated.View>

          <Animated.View
            style={[styles.toolbarGroup, editStyle]}
            pointerEvents={isEditMode ? 'auto' : 'none'}
          >
            <SpringButton style={styles.toolBtn} onPress={onDeleteAction} activeOpacity={0.6}>
              <Trash2 size={16} color={Colors.textSecondary} />
            </SpringButton>
            <SpringButton style={styles.toolBtn} onPress={onShareAction} activeOpacity={0.6}>
              <Share2 size={16} color={Colors.textSecondary} />
            </SpringButton>
            <SpringButton style={styles.toolBtn} onPress={onAddAction} activeOpacity={0.6}>
              <PlusCircle size={18} color={Colors.textSecondary} />
            </SpringButton>
          </Animated.View>
        </View>

        {/* Right: edit toggle */}
        <SpringButton style={styles.iconBtn} onPress={onToggleEdit} activeOpacity={0.6}>
          {isEditMode ? (
            <Check size={18} color={Colors.accent} />
          ) : (
            <Edit2 size={15} color={Colors.textMuted} />
          )}
        </SpringButton>
      </View>
    </SafeAreaView>
  );
};

/** Pillowtalk-style pill "tap to reflect" footer */
export const FloatingFooter: React.FC<{ onPress: () => void; label?: string }> = ({
  onPress,
  label = 'speak your thoughts',
}) => (
  <View style={styles.footerWrapper} pointerEvents="box-none">
    <SpringButton activeOpacity={0.8} style={styles.footerPill} onPress={onPress}>
      <Text style={styles.footerText}>{label}</Text>
    </SpringButton>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: Colors.bg,
    zIndex: 50,
  },
  headerBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerArea: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  titleGroup: {
    position: 'absolute',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.textPrimary,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  toolbarGroup: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 28,
  },
  toolBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Floating footer pill — Pillowtalk "try it free" style
  footerWrapper: {
    position: 'absolute',
    bottom: 96,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 60,
  },
  footerPill: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    backgroundColor: Colors.accent,
    borderRadius: 50,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  footerText: {
    fontSize: 13,
    color: Colors.accentText,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});
