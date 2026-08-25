/**
 * Onboarding — Pillowtalk-layout adaptation
 *
 * Visual references:
 *  - Pillowtalk: warm dark bg #231B18, large lowercase brand voice questions,
 *    pale-lime pill CTAs (#E3FF92), minimal single-question-per-screen progression.
 *
 * Orion adaptation:
 *  - bg: #0E0B09, accent pill: #D4F57A, lowercase copy style,
 *    Orion mark top-left (Pillowtalk logo position), progress dots top-right.
 */

import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { OrionLogo } from '../components/OrionLogo';
import { Colors } from '../theme/colors';

const { width } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  {
    key: 'name',
    question: 'what should i call you?',
    placeholder: 'your name or pseudonym',
    note: null,
  },
  {
    key: 'identity',
    question: 'who are you striving to become?',
    placeholder: 'architect, builder, creator…',
    note: null,
  },
  {
    key: 'values',
    question: 'what core values guide your decisions?',
    placeholder: 'autonomy, mastery, relentless focus…',
    note: null,
  },
  {
    key: 'building',
    question: 'what are you building right now?',
    placeholder: 'your main project or mission…',
    note: null,
  },
  {
    key: 'principles',
    question: 'name one principle you refuse to break.',
    placeholder: 'systems over willpower…',
    note: 'this will anchor every orion response',
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [input, setInput] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  const current = ONBOARDING_STEPS[step];
  const progress = (step + 1) / ONBOARDING_STEPS.length;

  const animateTransition = (dir: 'forward' | 'back', cb: () => void) => {
    const outX = dir === 'forward' ? -width * 0.08 : width * 0.08;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: outX,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      cb();
      slideAnim.setValue(dir === 'forward' ? width * 0.06 : -width * 0.06);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (!input.trim()) return;
    Haptics.selectionAsync().catch(() => {});

    const newAnswers = { ...answers, [current.key]: input.trim() };
    setAnswers(newAnswers);

    if (step < ONBOARDING_STEPS.length - 1) {
      animateTransition('forward', () => {
        setStep(step + 1);
        const nextKey = ONBOARDING_STEPS[step + 1].key;
        setInput(newAnswers[nextKey] || '');
      });
    } else {
      completeOnboarding(newAnswers);
    }
  };

  const handleBack = () => {
    if (step === 0) return;
    Haptics.selectionAsync().catch(() => {});
    const newAnswers = { ...answers, [current.key]: input };
    animateTransition('back', () => {
      setStep(step - 1);
      const prevKey = ONBOARDING_STEPS[step - 1].key;
      setInput(newAnswers[prevKey] || '');
    });
    setAnswers(newAnswers);
  };

  const completeOnboarding = async (finalAnswers: Record<string, string>) => {
    const portrait = {
      name:       finalAnswers.name || 'Orion User',
      identity:   finalAnswers.identity || 'Systems Architect',
      values:     finalAnswers.values || 'Autonomy, mastery',
      principles: finalAnswers.principles || 'Systems over willpower',
      strengths:  'Rapid execution',
      blind_spots:'Over-engineering',
      dreams:     finalAnswers.building || 'High agency execution',
      relationships: 'Core collaborators',
    };
    await AsyncStorage.setItem('orion_portrait', JSON.stringify(portrait));
    await AsyncStorage.setItem('orion_onboarded', 'true');
    router.replace('/');
  };

  const isLast = step === ONBOARDING_STEPS.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Top bar — mark left, dots right (Pillowtalk logo + nav pattern) */}
        <View style={styles.topBar}>
          <OrionLogo size={28} animated={false} />
          <View style={styles.dots}>
            {ONBOARDING_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  i === step && styles.dotActive,
                  i < step && styles.dotDone,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Question area */}
        <Animated.View
          style={[
            styles.questionArea,
            { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
          ]}
        >
          {/* Step counter — Pillowtalk uses small muted uppercase labels */}
          <Text style={styles.stepLabel}>{step + 1} / {ONBOARDING_STEPS.length}</Text>

          <Text style={styles.question}>{current.question}</Text>

          {current.note && (
            <Text style={styles.questionNote}>{current.note}</Text>
          )}

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder={current.placeholder}
            placeholderTextColor={Colors.textMuted}
            autoFocus
            returnKeyType={isLast ? 'done' : 'next'}
            onSubmitEditing={handleNext}
            multiline={false}
          />
        </Animated.View>

        {/* Bottom controls */}
        <View style={styles.bottomBar}>
          {step > 0 ? (
            <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
              <Text style={styles.backText}>← back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backBtn} />
          )}

          {/* Pillowtalk-style pale-lime pill CTA */}
          <TouchableOpacity
            style={[styles.pillBtn, !input.trim() && styles.pillBtnDisabled]}
            onPress={handleNext}
            disabled={!input.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.pillText}>
              {isLast ? 'start →' : 'continue →'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  kav: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 8,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.borderLight,
  },
  dotActive: {
    backgroundColor: Colors.accent,
    width: 18,
  },
  dotDone: {
    backgroundColor: Colors.accentMuted,
  },

  // Question area
  questionArea: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  stepLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 2,
    textTransform: 'lowercase',
    marginBottom: 28,
  },
  question: {
    fontSize: 30,
    fontWeight: '300',
    color: Colors.textPrimary,
    lineHeight: 38,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  questionNote: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 32,
    fontStyle: 'italic',
  },
  input: {
    marginTop: 32,
    fontSize: 20,
    fontWeight: '300',
    color: Colors.textPrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 12,
    letterSpacing: -0.3,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: Platform.OS === 'ios' ? 16 : 32,
    paddingTop: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 4,
    minWidth: 60,
  },
  backText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '300',
  },

  // Pillowtalk pill CTA — #D4F57A, border-radius 50, padding 12 40
  pillBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 50,
    paddingHorizontal: 40,
    paddingVertical: 14,
  },
  pillBtnDisabled: {
    opacity: 0.3,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.accentText,
    letterSpacing: 0.3,
  },
});
