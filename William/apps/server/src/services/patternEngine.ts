import type { RealtimeInsight, Portrait, Journey } from '@william/types';

interface ChatEntry {
  sender: string;
  text: string;
  time: string;
}

// ─── Recurring Themes ─────────────────────────────────────────────────────────

const THEME_KEYWORDS: Record<string, string[]> = {
  'Procrastination':  ['procrastinate', 'procrastination', 'keep putting off', 'keep delaying', 'can\'t start', 'avoiding'],
  'Exhaustion':       ['exhausted', 'burned out', 'burnout', 'drained', 'tired', 'no energy', 'depleted'],
  'Overwhelm':        ['overwhelmed', 'too much', 'can\'t handle', 'drowning', 'swamped'],
  'Progress':         ['completed', 'finished', 'shipped', 'launched', 'built', 'done', 'accomplished'],
  'Frustration':      ['frustrated', 'stuck', 'blocked', 'annoyed', 'can\'t figure'],
  'Focus':            ['distracted', 'can\'t focus', 'losing focus', 'concentration', 'deep work'],
  'Isolation':        ['alone', 'isolated', 'no one', 'disconnected', 'lonely'],
  'Momentum':         ['on a roll', 'momentum', 'flow state', 'in the zone', 'unstoppable'],
  'Doubt':            ['doubt', 'unsure', 'not sure', 'don\'t know if', 'imposter', 'questioning'],
  'Clarity':          ['clear', 'figured out', 'finally understand', 'makes sense now', 'I see it'],
};

export function detectRecurringThemes(
  allChats: ChatEntry[],
  windowDays = 7
): RealtimeInsight[] {
  const insights: RealtimeInsight[] = [];
  const userMessages = allChats.filter(c => c.sender === 'user').map(c => c.text.toLowerCase());

  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    const matches = userMessages.filter(msg => keywords.some(kw => msg.includes(kw)));
    if (matches.length >= 2) {
      insights.push({
        type: 'recurring_theme',
        label: theme,
        detail: `You've mentioned ${theme.toLowerCase()} ${matches.length} time${matches.length > 1 ? 's' : ''} recently.`,
        count: matches.length,
        timeframe: `last ${windowDays} days`,
        confidence: Math.min(0.95, 0.6 + matches.length * 0.1)
      });
    }
  }

  return insights.sort((a, b) => (b.count ?? 0) - (a.count ?? 0)).slice(0, 3);
}

// ─── Contradictions ───────────────────────────────────────────────────────────

export function detectContradictions(
  recentChats: ChatEntry[],
  portrait: Portrait
): RealtimeInsight[] {
  const insights: RealtimeInsight[] = [];
  const userText = recentChats
    .filter(c => c.sender === 'user')
    .map(c => c.text.toLowerCase())
    .join(' ');

  // Check against active beliefs
  for (const belief of (portrait.activeBeliefs || [])) {
    const beliefLower = belief.belief.toLowerCase();

    // Detect contradictions: high strength beliefs being questioned
    if (belief.strength > 0.6) {
      const questionPatterns = ['but I', 'except', 'unless', 'don\'t think', 'not sure if', 'questioning'];
      if (questionPatterns.some(p => userText.includes(p))) {
        // Simple heuristic: if the belief topic appears near doubt language
        const beliefWords = beliefLower.split(' ').filter(w => w.length > 4);
        const beliefMentioned = beliefWords.some(w => userText.includes(w));
        if (beliefMentioned) {
          insights.push({
            type: 'contradiction',
            label: 'Belief under tension',
            detail: `Something you said may be in tension with your belief: "${belief.belief}"`,
            confidence: 0.65
          });
        }
      }
    }
  }

  return insights.slice(0, 2);
}

// ─── Progress Detection ───────────────────────────────────────────────────────

const PROGRESS_SIGNALS = [
  'finished', 'completed', 'shipped', 'launched', 'built', 'done with',
  'finally', 'just deployed', 'merged', 'released', 'published', 'closed'
];

export function detectProgress(recentChats: ChatEntry[], journeys: Journey[]): RealtimeInsight[] {
  const insights: RealtimeInsight[] = [];
  const userText = recentChats.filter(c => c.sender === 'user').map(c => c.text.toLowerCase()).join(' ');

  const hasProgress = PROGRESS_SIGNALS.some(sig => userText.includes(sig));
  if (hasProgress) {
    // Try to match to a journey
    const matchedJourney = journeys.find(j =>
      userText.includes(j.title.toLowerCase()) ||
      (j.milestones || []).some(m => userText.includes(m.text.toLowerCase().substring(0, 20)))
    );

    insights.push({
      type: 'progress_detected',
      label: matchedJourney ? `${matchedJourney.title} progress` : 'Progress detected',
      detail: matchedJourney
        ? `You've moved forward on "${matchedJourney.title}". Worth noting.`
        : 'You\'re describing completion. This matters — acknowledge it.',
      confidence: 0.8
    });
  }

  return insights;
}

// ─── Regression Detection ─────────────────────────────────────────────────────

const REGRESSION_SIGNALS = [
  'back to square one', 'gave up', 'stopped', 'quit', 'can\'t do it again',
  'same problem', 'still struggling', 'keeps happening', 'still stuck'
];

export function detectRegressions(
  recentChats: ChatEntry[],
  portrait: Portrait
): RealtimeInsight[] {
  const insights: RealtimeInsight[] = [];
  const userText = recentChats.filter(c => c.sender === 'user').map(c => c.text.toLowerCase()).join(' ');

  const hasRegression = REGRESSION_SIGNALS.some(sig => userText.includes(sig));
  const knownBlindSpots = (portrait.blind_spots || '').toLowerCase();

  if (hasRegression) {
    // Check if this regression overlaps with a known blind spot
    const blindWords = knownBlindSpots.split(/[,.\s]+/).filter(w => w.length > 4);
    const blindMatched = blindWords.find(w => userText.includes(w));

    insights.push({
      type: 'regression_detected',
      label: blindMatched ? `Pattern: ${blindMatched}` : 'Familiar struggle',
      detail: blindMatched
        ? `You're encountering "${blindMatched}" again. This is a known pattern — it's not new, which means you've navigated it before.`
        : 'You\'re revisiting a challenge from before. The fact you recognise it is progress.',
      confidence: 0.75
    });
  }

  return insights;
}

// ─── Emotional Shift ──────────────────────────────────────────────────────────

const POSITIVE_SIGNALS = ['great', 'excited', 'proud', 'happy', 'relieved', 'finally', 'love', 'amazing'];
const NEGATIVE_SIGNALS = ['terrible', 'awful', 'horrible', 'hate', 'can\'t', 'hopeless', 'pointless', 'worthless'];

export function detectEmotionalShifts(recentChats: ChatEntry[]): RealtimeInsight[] {
  const insights: RealtimeInsight[] = [];
  const userMsgs = recentChats.filter(c => c.sender === 'user');

  if (userMsgs.length < 3) return insights;

  // Look at first half vs second half sentiment
  const mid = Math.floor(userMsgs.length / 2);
  const early = userMsgs.slice(0, mid).map(c => c.text.toLowerCase()).join(' ');
  const late = userMsgs.slice(mid).map(c => c.text.toLowerCase()).join(' ');

  const earlyPositive = POSITIVE_SIGNALS.filter(s => early.includes(s)).length;
  const earlyNegative = NEGATIVE_SIGNALS.filter(s => early.includes(s)).length;
  const latePositive = POSITIVE_SIGNALS.filter(s => late.includes(s)).length;
  const lateNegative = NEGATIVE_SIGNALS.filter(s => late.includes(s)).length;

  const earlyTone = earlyPositive > earlyNegative ? 'positive' : earlyNegative > earlyPositive ? 'negative' : 'neutral';
  const lateTone = latePositive > lateNegative ? 'positive' : lateNegative > latePositive ? 'negative' : 'neutral';

  if (earlyTone !== lateTone && earlyTone !== 'neutral' && lateTone !== 'neutral') {
    const shift = lateTone === 'positive' ? 'upward' : 'downward';
    insights.push({
      type: 'emotional_shift',
      label: `Emotional shift: ${shift}`,
      detail: lateTone === 'positive'
        ? 'I notice you\'ve moved toward a more positive place through this conversation.'
        : 'The tone of this conversation has shifted downward. Worth pausing here.',
      confidence: 0.7
    });
  }

  return insights;
}

// ─── Main Entry Point ─────────────────────────────────────────────────────────

/**
 * Run all pattern detectors and return a consolidated, de-duplicated insight list.
 * Called from the reasoner after each message.
 */
export function analyzeConversation(
  allChats: ChatEntry[],
  recentChats: ChatEntry[],
  portrait: Portrait,
  journeys: Journey[]
): RealtimeInsight[] {
  const all: RealtimeInsight[] = [
    ...detectRecurringThemes(allChats),
    ...detectContradictions(recentChats, portrait),
    ...detectProgress(recentChats, journeys),
    ...detectRegressions(recentChats, portrait),
    ...detectEmotionalShifts(recentChats)
  ];

  // De-duplicate by label, keep highest confidence
  const seen = new Map<string, RealtimeInsight>();
  for (const insight of all) {
    const existing = seen.get(insight.label);
    if (!existing || insight.confidence > existing.confidence) {
      seen.set(insight.label, insight);
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 4); // Max 4 insights per response
}

// ─── Sentiment Helper ─────────────────────────────────────────────────────────

export function scoreSentiment(text: string): 'positive' | 'negative' | 'mixed' | 'neutral' {
  const t = text.toLowerCase();
  const pos = POSITIVE_SIGNALS.filter(s => t.includes(s)).length;
  const neg = NEGATIVE_SIGNALS.filter(s => t.includes(s)).length;
  if (pos > 0 && neg > 0) return 'mixed';
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}
