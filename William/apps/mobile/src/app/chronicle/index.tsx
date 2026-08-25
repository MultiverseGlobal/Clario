/**
 * JournalScreen (Chronicle) — Pillowtalk testimonial-card timeline
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { Clock, MessageCircle, Mic, Star } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../theme/colors';
import { ExecutiveDock } from '../../components/ExecutiveDock';

// Dummy journal data for UI reflection
const DUMMY_JOURNAL = [
  {
    id: '1',
    date: 'today',
    time: '2 mins',
    tag: 'clarity',
    text: "i need to stop focusing on the microscopic details of the atlas migration and look at the broader architectural impact.",
    color: Colors.sectionTeal,
  },
  {
    id: '2',
    date: 'yesterday',
    time: '4 mins',
    tag: 'anxiety',
    text: "feeling overwhelmed by the sheer volume of context required for the new pipeline model. stepping back to breathe.",
    color: Colors.sectionLavender,
  },
  {
    id: '3',
    date: 'tuesday',
    time: '1 min',
    tag: 'idea',
    text: "what if we just removed the entire middle layer and let the clients talk directly to the store? might be crazy, might work.",
    color: Colors.sectionSage,
  },
  {
    id: '4',
    date: 'monday',
    time: '5 mins',
    tag: 'reflection',
    text: "good session today. feeling much more aligned with the team's core velocity.",
    color: Colors.sectionPeach,
  },
];

export default function JournalScreen() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 600);
  }, []);

  const getTagIcon = (tag: string, color: string) => {
    switch (tag) {
      case 'clarity': return <Star size={14} color={color} />;
      case 'idea': return <MessageCircle size={14} color={color} />;
      default: return <Mic size={14} color={color} />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>your journal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator style={{ marginTop: 60 }} size="small" color={Colors.textPrimary} />
        ) : (
          <View style={styles.timeline}>
            {DUMMY_JOURNAL.map((entry) => {
              const textColor = '#0B0D08'; 
              
              return (
                <View key={entry.id} style={[styles.card, { backgroundColor: entry.color }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.tagBadge}>
                      {getTagIcon(entry.tag, textColor)}
                      <Text style={[styles.tagText, { color: textColor }]}>
                        {entry.tag}
                      </Text>
                    </View>
                    <View style={styles.metaData}>
                      <Text style={[styles.metaText, { color: textColor }]}>{entry.date} • {entry.time}</Text>
                    </View>
                  </View>
                  <Text style={[styles.entryText, { color: textColor }]}>"{entry.text}"</Text>
                </View>
              );
            })}
          </View>
        )}
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120, // Space for dock
  },
  timeline: {
    gap: 16,
  },
  card: {
    borderRadius: 32,
    padding: 24,
    minHeight: 140,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  metaData: {
    opacity: 0.6,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  entryText: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '400',
    letterSpacing: -0.2,
  },
});
