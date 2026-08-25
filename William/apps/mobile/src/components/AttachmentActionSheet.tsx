import { SpringButton } from '../components/SpringButton';
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { Camera, FileText, Image as ImageIcon, Clipboard, X, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';
import { Colors } from '../theme/colors';

interface AttachmentActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectOption: (option: string) => void;
}

export function AttachmentActionSheet({
  visible,
  onClose,
  onSelectOption,
}: AttachmentActionSheetProps) {
  if (!visible) return null;

  const OPTIONS = [
    {
      id: 'camera',
      title: 'Camera Scan',
      subtitle: 'Inspect physical documents, whiteboards & notes',
      icon: Camera,
      badge: 'OCR Visual',
    },
    {
      id: 'document',
      title: 'Executive Vault Document',
      subtitle: 'Attach architecture specs, PDFs or code bases',
      icon: FileText,
      badge: 'Deep Index',
    },
    {
      id: 'image',
      title: 'Visual Mockup / Screenshot',
      subtitle: 'Parse UI layouts, wireframes & design designs',
      icon: ImageIcon,
      badge: 'UI Vision',
    },
    {
      id: 'clipboard',
      title: 'Clipboard Memory Stack',
      subtitle: 'Analyze copied snippet, JSON or link',
      icon: Clipboard,
      badge: 'Auto Parse',
    },
  ];

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onSelectOption(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          entering={FadeInUp.springify().damping(18).stiffness(140)}
          exiting={FadeOutDown.duration(200)}
          style={styles.sheetContainer}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.sparkleIconWrapper}>
                <Sparkles size={14} color={Colors.signalAmber} />
              </View>
              <Text style={styles.headerTitle}>What would you like me to inspect?</Text>
            </View>
            <SpringButton
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onClose();
              }}
              style={styles.closeBtn}
            >
              <X size={18} color={Colors.textSecondary} />
            </SpringButton>
          </View>

          <Text style={styles.headerSub}>
            Orion will parse context and link it directly into your memory graph.
          </Text>

          {/* Inspection Options */}
          <View style={styles.optionsList}>
            {OPTIONS.map((item) => {
              const IconComp = item.icon;
              return (
                <SpringButton
                  key={item.id}
                  activeOpacity={0.75}
                  onPress={() => handleSelect(item.id)}
                  style={styles.optionCard}
                >
                  <View style={styles.iconCircle}>
                    <IconComp size={18} color={Colors.obsidian} />
                  </View>
                  <View style={styles.optionContent}>
                    <View style={styles.optionTitleRow}>
                      <Text style={styles.optionTitle}>{item.title}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.badge}</Text>
                      </View>
                    </View>
                    <Text style={styles.optionSub}>{item.subtitle}</Text>
                  </View>
                </SpringButton>
              );
            })}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 13, 18, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.porcelain,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    shadowColor: Colors.obsidian,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sparkleIconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(217, 164, 65, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 20,
    lineHeight: 17,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.porcelainSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.porcelainCard,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.porcelainSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionContent: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  badge: {
    backgroundColor: 'rgba(11, 13, 18, 0.05)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  optionSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
});
