export interface IcpSuggestion {
  id: string;
  label: string;
  query: string;
  category: "trending" | "daily" | "ai" | "agency" | "hiring" | "ops" | "saas";
  trendingSignal: string;
  sourceBadge: string;
  dayOfWeek?: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  headcountRange?: string;
  channel: "yc" | "clutch" | "hn" | "starter_story" | "custom";
  hotMetric?: string;
}

export const ICP_CATEGORIES = [
  { id: "all", label: "All Suggestions", icon: "Sparkles" },
  { id: "daily", label: "Today's Cadence", icon: "Calendar" },
  { id: "trending", label: "Market Buzz", icon: "Flame" },
  { id: "ai", label: "AI & Agents", icon: "Bot" },
  { id: "agency", label: "Agencies & Studios", icon: "Layers" },
  { id: "hiring", label: "Hiring on HN", icon: "Users" },
  { id: "ops", label: "Ops & Bottlenecks", icon: "Target" },
] as const;

export const DAILY_THEMES: Record<number, { dayName: string; focusTheme: string; subtitle: string }> = {
  0: { dayName: "Sunday", focusTheme: "Creator & Indie SaaS", subtitle: "Bootstrapped founders planning week kickoff sprints" },
  1: { dayName: "Monday", focusTheme: "Executive Pipeline Kickoff", subtitle: "Targeting Seed & Series-A founders setting weekly outbound" },
  2: { dayName: "Tuesday", focusTheme: "B2B Design & Creative Agencies", subtitle: "Agency owners scaling from 10 to 50 client delivery retainers" },
  3: { dayName: "Wednesday", focusTheme: "Engineering Teams on Hacker News", subtitle: "High-growth tech teams actively hiring and scaling infrastructure" },
  4: { dayName: "Thursday", focusTheme: "Operational & RevOps Friction", subtitle: "Founders struggling with manual onboarding and churn bottlenecks" },
  5: { dayName: "Friday", focusTheme: "YC & Venture Allocations", subtitle: "Newly announced funded startups deploying capital into tooling" },
  6: { dayName: "Saturday", focusTheme: "Micro-SaaS & Automation", subtitle: "Indie builders automating customer support and delivery" },
};

export const ICP_SUGGESTIONS: IcpSuggestion[] = [
  // ── Today's Cadence / Daily Highlights ────────────────────────────────────
  {
    id: "icp-mon-seed-ai",
    label: "Seed AI Startups (YC)",
    query: "Target YC seed AI startups scaling SDR pipeline and outbound demos",
    category: "daily",
    trendingSignal: "YC W24 teams hitting demo day with seed capital to deploy",
    sourceBadge: "YC W24",
    dayOfWeek: [1, 5],
    headcountRange: "5-20 staff",
    channel: "yc",
    hotMetric: "+42% outbound response",
  },
  {
    id: "icp-tue-design-agencies",
    label: "B2B Design Agencies (Clutch)",
    query: "Cold outreach to creative design agency founders 10-50 headcount scaling retainers",
    category: "agency",
    trendingSignal: "Clutch top-ranked agencies facing client onboarding friction",
    sourceBadge: "Clutch 100",
    dayOfWeek: [2],
    headcountRange: "10-50 staff",
    channel: "clutch",
    hotMetric: "High Retainer ACV",
  },
  {
    id: "icp-wed-hn-hiring",
    label: "Engineering Teams (Hacker News)",
    query: "Find B2B SaaS teams hiring engineers on Hacker News who need developer toolchains",
    category: "hiring",
    trendingSignal: "Monthly HN 'Who is Hiring' thread surge — active headcount budgets",
    sourceBadge: "Hacker News",
    dayOfWeek: [3],
    headcountRange: "15-75 staff",
    channel: "hn",
    hotMetric: "94% verified tech lead",
  },
  {
    id: "icp-thu-operational-bottlenecks",
    label: "Operational Bottlenecks",
    query: "Target founders with manual client onboarding friction and slow cycle times",
    category: "ops",
    trendingSignal: "Founders vocal on Twitter/LinkedIn about manual copy-paste Zapier limits",
    sourceBadge: "RevOps Signal",
    dayOfWeek: [4],
    headcountRange: "8-40 staff",
    channel: "custom",
    hotMetric: "Pain-Point Interrupt",
  },

  // ── Market Buzz / What People Are Talking About ───────────────────────────
  {
    id: "icp-ai-voice-sdr",
    label: "Autonomous Voice & AI SDR Labs",
    query: "Target AI automation founders building voice agents and outbound dialers",
    category: "ai",
    trendingSignal: "Massive spike in AI voice tooling adoption across enterprise sales",
    sourceBadge: "Market Surge",
    dayOfWeek: [1, 2, 3, 4, 5],
    headcountRange: "5-30 staff",
    channel: "yc",
    hotMetric: "Top Viral Topic",
  },
  {
    id: "icp-devin-agentic-dev",
    label: "Agentic DevTool Startups",
    query: "Reach founders building autonomous coding agents, LLM evals, and prompt pipelines",
    category: "ai",
    trendingSignal: "Devin / Claude 3.5 Sonnet agent ecosystem explosion",
    sourceBadge: "Trending on X",
    dayOfWeek: [2, 3, 5],
    headcountRange: "4-25 staff",
    channel: "hn",
    hotMetric: "+88% engagement",
  },
  {
    id: "icp-creative-production-studios",
    label: "Video & Motion Studios (Clutch)",
    query: "Cold email creative directors at motion design studios scaling commercial client rosters",
    category: "agency",
    trendingSignal: "Studios actively replacing manual editing with AI pre-cut engines",
    sourceBadge: "Clutch Global",
    dayOfWeek: [2, 4],
    headcountRange: "10-35 staff",
    channel: "clutch",
    hotMetric: "High Margin",
  },
  {
    id: "icp-shopify-plus-brands",
    label: "Shopify Enterprise DTC Brands",
    query: "Target 8-figure e-commerce DTC brands migrating to headless Shopify setups",
    category: "trending",
    trendingSignal: "Q3 ad spend scale: DTC operators demanding custom retention automations",
    sourceBadge: "Ecom Pulse",
    dayOfWeek: [1, 4],
    headcountRange: "15-60 staff",
    channel: "custom",
    hotMetric: "$10k+ Retainers",
  },
  {
    id: "icp-soc2-compliance-friction",
    label: "SOC2 & Security Gateways",
    query: "Reach B2B SaaS CTOs and compliance leads unblocking enterprise sales cycles",
    category: "saas",
    trendingSignal: "Startups blocked in procurement due to enterprise vendor diligence",
    sourceBadge: "Enterprise Deal",
    dayOfWeek: [3, 4],
    headcountRange: "20-100 staff",
    channel: "hn",
    hotMetric: "Urgent Pain Point",
  },
  {
    id: "icp-cold-email-deliverability",
    label: "Outbound Deliverability Drop",
    query: "Target outbound SDR agency owners dealing with Google and Yahoo spam filter updates",
    category: "ops",
    trendingSignal: "Spam enforcement updates crashing standard domain inbox deliverability",
    sourceBadge: "Industry Crisis",
    dayOfWeek: [1, 2, 4],
    headcountRange: "5-25 staff",
    channel: "clutch",
    hotMetric: "Instant Reply Angle",
  },
  {
    id: "icp-bootstrapped-micro-saas",
    label: "Profitable Indie SaaS (StarterStory)",
    query: "Find bootstrapped SaaS founders doing $20k-$100k MRR wanting customer acquisition engines",
    category: "saas",
    trendingSignal: "Indie Hackers & Starter Story founders operating lean with zero sales reps",
    sourceBadge: "Starter Story",
    dayOfWeek: [0, 6],
    headcountRange: "1-10 staff",
    channel: "starter_story",
    hotMetric: "Fast Decision Maker",
  },
  {
    id: "icp-fintech-kyc-fraud",
    label: "Fintech Compliance & Onboarding",
    query: "Target fintech and neobank operations leads fixing KYC conversion drop-off",
    category: "saas",
    trendingSignal: "Fintechs slashing customer onboarding verification latency",
    sourceBadge: "Fintech Radar",
    dayOfWeek: [3, 5],
    headcountRange: "25-150 staff",
    channel: "hn",
    hotMetric: "High ACV",
  },
];

export function getTodayIcpFocus(): { theme: { dayName: string; focusTheme: string; subtitle: string }; suggestions: IcpSuggestion[] } {
  const currentDay = new Date().getDay();
  const theme = DAILY_THEMES[currentDay] || DAILY_THEMES[1];
  
  // Get suggestions matching today's day of week, or fallback to top daily items
  const matched = ICP_SUGGESTIONS.filter(
    (s) => s.dayOfWeek && s.dayOfWeek.includes(currentDay)
  );

  const fallback = ICP_SUGGESTIONS.slice(0, 4);
  const suggestions = matched.length >= 3 ? matched : [...matched, ...fallback.filter(f => !matched.some(m => m.id === f.id))].slice(0, 6);

  return { theme, suggestions };
}

export function searchIcpSuggestions(query: string, category: string = "all"): IcpSuggestion[] {
  const q = query.toLowerCase().trim();
  const currentDay = new Date().getDay();

  return ICP_SUGGESTIONS.filter((item) => {
    // Category match
    if (category !== "all") {
      if (category === "daily") {
        if (!item.dayOfWeek?.includes(currentDay) && item.category !== "daily") return false;
      } else if (item.category !== category) {
        return false;
      }
    }

    // Query match
    if (!q) return true;

    return (
      item.label.toLowerCase().includes(q) ||
      item.query.toLowerCase().includes(q) ||
      item.trendingSignal.toLowerCase().includes(q) ||
      item.sourceBadge.toLowerCase().includes(q) ||
      (item.headcountRange && item.headcountRange.toLowerCase().includes(q))
    );
  });
}
