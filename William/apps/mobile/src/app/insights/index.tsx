/**
 * InsightsScreen — Pillowtalk style patterns and summaries
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Colors } from '../../theme/colors';
import { ExecutiveDock } from '../../components/ExecutiveDock';

export default function InsightsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>insights</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.summarySection}>
          <Text style={styles.sectionLabel}>recent themes</Text>
          <View style={styles.themeChips}>
            <View style={[styles.chip, { backgroundColor: Colors.sectionTeal }]}>
              <Text style={styles.chipText}>architecture (12)</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: Colors.sectionLavender }]}>
              <Text style={styles.chipText}>velocity (8)</Text>
            </View>
            <View style={[styles.chip, { backgroundColor: Colors.sectionSage }]}>
              <Text style={styles.chipText}>burnout (3)</Text>
            </View>
          </View>
        </View>

        <View style={styles.insightCard}>
          <Text style={styles.insightIcon}>✨</Text>
          <Text style={styles.insightHeadline}>you've been focused on systems.</Text>
          <Text style={styles.insightBody}>
            over the last week, 60% of your entries revolve around improving internal systems rather than output. this indicates a shift in your priority towards leverage.
          </Text>
        </View>

        <View style={styles.insightCard}>
          <Text style={styles.insightIcon}>💡</Text>
          <Text style={styles.insightHeadline}>afternoon anxiety spike.</Text>
          <Text style={styles.insightBody}>
            you frequently record entries categorized as "anxiety" or "overwhelm" between 2 PM and 4 PM. consider taking a proactive break during this block.
          </Text>
        </View>

      </ScrollView>

      <ExecutiveDock />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '300',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 120, // Space for dock
  },
  summarySection: {
    marginBottom: 40,
  },
  sectionLabel: {
    fontSize: 14,
    color: Colors.textMuted,
    fontWeight: '500',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  themeChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipText: {
    color: '#0B0D08',
    fontSize: 13,
    fontWeight: '600',
  },
  insightCard: {
    backgroundColor: Colors.bgElevated,
    borderRadius: 32,
    padding: 32,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  insightIcon: {
    fontSize: 32,
    marginBottom: 16,
  },
  insightHeadline: {
    fontSize: 22,
    fontWeight: '400',
    color: Colors.textPrimary,
    marginBottom: 12,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  insightBody: {
    fontSize: 15,
    fontWeight: '300',
    color: Colors.textSecondary,
    lineHeight: 24,
  },
});
