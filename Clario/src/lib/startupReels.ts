// ─── Startup Reels & A-Roll / B-Roll Inspiration Vault ───────────────────────
// Curated high-performance creator reel blueprints from top startups & founders.
// Reference handles are real creators whose footage archetype matches each preset.
// Clario never auto-fetches — user pastes a post URL, Cobalt downloads it.

export type ReferencePlatform = 'tiktok' | 'instagram' | 'youtube' | 'x';

export interface ReferenceHandle {
  platform: ReferencePlatform;
  handle: string;           // @username
  profileUrl: string;       // direct profile link
  contentType: 'founder-talking-head' | 'bts-vlog' | 'product-demo' | 'benchmark' | 'aesthetic';
  viewCountRange: string;   // e.g. "200K–5M per reel"
  editingStyle: string;     // one-line description of their cut style
  whyItWorks: string;       // why this creator's footage maps to this blueprint
}

export interface StartupReelPreset {
  id: string;
  name: string;
  startup: string;
  handle: string;
  website: string;
  category: 'high-energy' | 'dev-tools' | 'minimal-saas' | 'bts' | 'fintech';
  archetype: string;
  badge: string;
  accentColor: string;
  gradientBg: string;
  tagline: string;
  hookRating: number;
  cutFrequency: string;
  scriptBeats: string[];
  editingRecipe: {
    hookStyle: string;
    bRollType: string;
    audioPacing: string;
    textStyle: string;
    zoomEffect: string;
  };
  referenceUrls: Array<{ platform: ReferencePlatform; label: string; url: string }>;
  referenceHandles: ReferenceHandle[];
  tags: string[];
}

/** Returns a human-readable label for a platform */
export function platformLabel(p: ReferencePlatform): string {
  return { tiktok: 'TikTok', instagram: 'Instagram', youtube: 'YouTube', x: 'X / Twitter' }[p];
}

/** Returns the platform accent color */
export function platformColor(p: ReferencePlatform): string {
  return { tiktok: '#FF004F', instagram: '#E1306C', youtube: '#FF0000', x: '#e2e8f0' }[p];
}


export const STARTUP_REELS_VAULT: StartupReelPreset[] = [
  {
    id: 'genesis-three-years',
    name: 'Genesis Post 1 · Three Years (The Plot & Awakening)',
    startup: 'Genesis 01: Three Years',
    handle: '@ben.becoming',
    website: 'https://instagram.com/sei.come.sei',
    category: 'bts',
    archetype: 'Cinematic Manifesto & Truth Declaration',
    badge: '✦ Genesis 01',
    accentColor: '#111318',
    gradientBg: 'linear-gradient(135deg, #111318 0%, #1F242D 100%)',
    tagline: 'I don’t want to wake up one day and realise I spent my youth rehearsing for a life I never lived.',
    hookRating: 9.9,
    cutFrequency: '2.0 – 2.8s (Atmospheric Pacing)',
    scriptBeats: [
      "I've spent the last three years trying to build things. Apps. Companies. Ideas.",
      "I've learned how to code. I've learned how to use AI. I've learned how to build things that look impressive.",
      "And somehow, I still don't feel like I've built much.",
      "That's the part nobody tells you about starting young.",
      "You can spend years preparing to become someone... and accidentally spend those years pretending you already are.",
      "So I'm changing the experiment. I'm going to document the process. Not the version where everything works. The actual one.",
      "I don't know where this goes. I just know I don't want to wake up one day and realise I spent my youth rehearsing for a life I never lived.",
    ],
    editingRecipe: {
      hookStyle: "Old screenshots of projects, GitHub commits, and laptop opening in dim room",
      bRollType: "Abuja streets, walking alone, laptop reflection on face, hands on keyboard, 35mm grain",
      audioPacing: "Voice-led quiet cadence with deep low-end resonance and studio presence",
      textStyle: "Porcelain Swiss typography card: 'I'm figuring it out in public.'",
      zoomEffect: "Slow subtle 100% -> 104% push-in on key statements",
    },
    referenceUrls: [
      { platform: 'instagram', label: 'Sei Come Sei Manifesto Style', url: 'https://www.instagram.com/sei.come.sei/' },
      { platform: 'instagram', label: 'Chris Mansour Abstract Cuts', url: 'https://www.instagram.com/chrismansour__/' },
    ],
    referenceHandles: [
      {
        platform: 'instagram',
        handle: '@sei.come.sei',
        profileUrl: 'https://www.instagram.com/sei.come.sei/',
        contentType: 'aesthetic',
        viewCountRange: '200K–3M per reel',
        editingStyle: 'Deep minimalist manifesto with quiet, intense authenticity and elegant typography',
        whyItWorks: 'Treats the journey as living evidence rather than manufactured authority',
      },
    ],
    tags: ['Genesis', 'Manifesto', 'Documentary', 'Three Years', 'Voice-First'],
  },
  {
    id: 'genesis-becoming',
    name: 'Genesis Post 2 · Becoming (The Internal Transformation)',
    startup: 'Genesis 02: Becoming',
    handle: '@ben.becoming',
    website: 'https://instagram.com/eostudio.official',
    category: 'high-energy',
    archetype: 'Intellectual Inquiry & Habit Deconstruction',
    badge: '✦ Genesis 02',
    accentColor: '#4E6CF2',
    gradientBg: 'linear-gradient(135deg, #182245 0%, #0F172A 100%)',
    tagline: 'Becoming better can become another way of avoiding yourself.',
    hookRating: 9.8,
    cutFrequency: '1.8 – 2.4s',
    scriptBeats: [
      "There is a strange thing about trying to become better.",
      "At some point... becoming better can become another way of avoiding yourself.",
      "You make a new routine. A new goal. A new identity. A new version of yourself to chase.",
      "And suddenly you're not living. You're constantly preparing to become the person who finally starts living.",
      "I've done that. More than I'd like to admit.",
      "So I'm trying something different. Less fantasy. More evidence. Less thinking about who I could become. More asking what I actually did today.",
      "Because maybe becoming isn't one giant transformation. Maybe it's just the accumulated consequences of what you keep doing when nobody is watching.",
    ],
    editingRecipe: {
      hookStyle: "Morning alarm -> gym shoes -> opening terminal window -> notebook sketch",
      bRollType: "Campus, gym weights, deleting bad code, starting again, late-night desk lamp",
      audioPacing: "Thoughtful, deliberate pauses on 'avoiding yourself' and 'when nobody is watching'",
      textStyle: "Minimalist bold slide: 'Who are you becoming when nobody is watching?'",
      zoomEffect: "Micro-cuts on habit actions",
    },
    referenceUrls: [
      { platform: 'instagram', label: 'EO Studio Cinematic Narrative', url: 'https://www.instagram.com/eostudio.official/' },
    ],
    referenceHandles: [
      {
        platform: 'instagram',
        handle: '@eostudio.official',
        profileUrl: 'https://www.instagram.com/eostudio.official/',
        contentType: 'founder-talking-head',
        viewCountRange: '300K–2M per reel',
        editingStyle: 'Cinematic documentary framing with ambient lighting and narrative progression',
        whyItWorks: 'Balances philosophical substance with high-craft editorial aesthetic',
      },
    ],
    tags: ['Genesis', 'Becoming', 'Habits', 'Discipline', 'Internal Shift'],
  },
  {
    id: 'genesis-something',
    name: 'Genesis Post 3 · Something (The Sacred Ambition)',
    startup: 'Genesis 03: Something',
    handle: '@ben.becoming',
    website: 'https://instagram.com/founded',
    category: 'minimal-saas',
    archetype: 'Raw Introspection & The Sacred Ambition',
    badge: '✦ Genesis 03',
    accentColor: '#10B981',
    gradientBg: 'linear-gradient(135deg, #06281E 0%, #0F172A 100%)',
    tagline: 'I want to become something real. Something that survives when nobody is impressed.',
    hookRating: 9.9,
    cutFrequency: '2.2 – 3.0s (Sparse & Poignant)',
    scriptBeats: [
      "I don't want to be famous. At least... I don't think that's what I'm actually looking for.",
      "I want to become something. Something real. Something that survives when nobody is impressed.",
      "I want to build things that matter. Understand things deeply. Make enough money that the people I love don't have to worry.",
      "See the world. Become physically strong. Think clearly.",
      "And somehow... not lose myself trying to do all of it. That's probably the hardest part.",
      "Because ambition can build you. But it can also consume you.",
      "So this isn't really a story about becoming successful. I don't know what success will look like yet.",
      "It's a story about finding out what kind of person is worth becoming. And seeing whether I can actually become him.",
    ],
    editingRecipe: {
      hookStyle: "Walking alone on quiet street at dusk, camera behind, looking at sky",
      bRollType: "Abuja streets, hands typing on laptop, books, 2-second candid glance, gym chalk",
      audioPacing: "Intimate, quiet voiceover with zero fake hype or loud background music",
      textStyle: "Porcelain end card: 'The journey starts before you know where it ends.'",
      zoomEffect: "Gentle drift / handheld stillness",
    },
    referenceUrls: [
      { platform: 'instagram', label: 'Founded Narrative Storytelling', url: 'https://www.instagram.com/founded/' },
    ],
    referenceHandles: [
      {
        platform: 'instagram',
        handle: '@founded',
        profileUrl: 'https://www.instagram.com/founded/',
        contentType: 'bts-vlog',
        viewCountRange: '100K–1M per reel',
        editingStyle: 'Vulnerable narrative arc with archival fragments and poignant pauses',
        whyItWorks: 'Establishes the character mythology before asking for an audience',
      },
    ],
    tags: ['Genesis', 'Something', 'Ambition', 'Identity', 'Truth'],
  },
  {
    id: 'eo-studio-editorial',
    name: 'EO Studio · Cinematic Founder Case Study & Agency Reel',
    startup: 'EO Studio',
    handle: '@eostudio.official',
    website: 'https://instagram.com/eostudio.official',
    category: 'bts',
    archetype: 'Cinematic High-Production Studio Film',
    badge: '🎬 Studio Production',
    accentColor: '#10B981',
    gradientBg: 'linear-gradient(135deg, #06231A 0%, #020F0B 100%)',
    tagline: 'Deep anamorphic framing, studio lighting, ambient score, and authoritative founder storytelling.',
    hookRating: 9.7,
    cutFrequency: '2.2 – 2.8s',
    scriptBeats: [
      '[Hook] Most agencies sell deliverables. The top 1% sell category dominance.',
      '[Problem] When your brand looks like everyone else in your space, you compete on price instead of prestige.',
      '[Dopamine Drop] We re-engineered the complete brand architecture from typography to physical packaging.',
      '[Proof] The rebrand generated 4x inbound enterprise deal sizes in the first quarter post-launch.',
      '[CTA] Explore the full case study breakdown at the link in bio.',
    ],
    editingRecipe: {
      hookStyle: 'Cinematic wide crop opening with soft natural studio lighting and warm voiceover',
      bRollType: 'Macro lens shots of brand guidelines, high-end monitor sweeps, color-grade perfection',
      audioPacing: 'Subtle atmospheric ambient score building into refined percussion accents',
      textStyle: 'Understated serif / grotesque hybrid tracking in crisp porcelain white',
      zoomEffect: 'Slow 1.5% focal drift over complete sequences',
    },
    referenceUrls: [
      { platform: 'instagram', label: 'EO Studio Instagram', url: 'https://instagram.com/eostudio.official' },
    ],
    referenceHandles: [
      {
        platform: 'instagram',
        handle: '@eostudio.official',
        profileUrl: 'https://instagram.com/eostudio.official',
        contentType: 'bts-vlog',
        viewCountRange: '50K–1M per reel',
        editingStyle: 'High-production studio lighting, cinema camera grain, refined pacing, brand case studies',
        whyItWorks: 'Establishes instant premium positioning and enterprise authority through cinematic visual craft.',
      },
    ],
    tags: ['agency', 'branding', 'cinematic', 'case-study', 'high-production'],
  },
  {
    id: 'founded-culture-reel',
    name: 'Founded · War Room Momentum & Founder Culture Reel',
    startup: 'Founded',
    handle: '@founded',
    website: 'https://instagram.com/founded',
    category: 'bts',
    archetype: 'Raw Founder Momentum & Quote Punch',
    badge: '⚡ Founder Culture',
    accentColor: '#F59E0B',
    gradientBg: 'linear-gradient(135deg, #2B1800 0%, #0E0800 100%)',
    tagline: 'Handheld gritty war room footage, bold typography quotes, and relentless founder grit.',
    hookRating: 9.6,
    cutFrequency: '1.6 – 2.2s',
    scriptBeats: [
      '[Hook] You do not need a 50-person team to build a category-defining startup.',
      '[Problem] Bloated headcounts and endless meetings are where great software goes to die.',
      '[Dopamine Drop] 3 engineers, 1 war room, and relentless execution beats 100 corporate managers every single time.',
      '[Proof] We shipped the entire v2 architecture in 14 days by stripping away every non-essential feature.',
      '[CTA] Tag your co-founder and get back to shipping.',
    ],
    editingRecipe: {
      hookStyle: 'Hard cut cold open on candid founder dialogue with monochrome film grain',
      bRollType: 'Whiteboard sprint diagrams, late night monitor glows, coffee mugs, handheld motion',
      audioPacing: 'Low-frequency drone with punchy sub impacts on thesis statements',
      textStyle: 'High-contrast stark typography badges with monospace coordinates',
      zoomEffect: 'Organic handheld camera drift and quick micro-snap cuts',
    },
    referenceUrls: [
      { platform: 'instagram', label: 'Founded Instagram', url: 'https://instagram.com/founded' },
    ],
    referenceHandles: [
      {
        platform: 'instagram',
        handle: '@founded',
        profileUrl: 'https://instagram.com/founded',
        contentType: 'founder-talking-head',
        viewCountRange: '80K–2M per reel',
        editingStyle: 'High-contrast typography quotes, war-room documentary clips, candid founder audio',
        whyItWorks: 'Taps into the raw psychological drive of builders: gritty, unapologetic, high-velocity.',
      },
    ],
    tags: ['founded', 'culture', 'war-room', 'grit', 'builder'],
  },
  {
    id: 'sei-come-sei-editorial',
    name: 'Sei Come Sei · Bold Creative Direction & Cultural Reel',
    startup: 'Sei Come Sei',
    handle: '@sei.come.sei',
    website: 'https://instagram.com/sei.come.sei',
    category: 'minimal-saas',
    archetype: 'Avant-Garde Cultural & Brand Direction',
    badge: '✨ Sei Come Sei',
    accentColor: '#EC4899',
    gradientBg: 'linear-gradient(135deg, #2B0D1C 0%, #0F040A 100%)',
    tagline: 'Kinetic typography, Italian design sensibility, striking high-contrast visuals, and cultural rhythm.',
    hookRating: 9.8,
    cutFrequency: '1.5 – 2.0s',
    scriptBeats: [
      '[Hook] Design is not how it looks. It is the emotion it provokes in the first 200 milliseconds.',
      '[Problem] Generic template aesthetics make your brand completely invisible in crowded feeds.',
      '[Dopamine Drop] Break the grid. Bold brutalist typography, authentic identity, uncompromising vision.',
      '[Proof] When identity is unmistakable, customer loyalty becomes a cultural movement.',
      '[CTA] Follow @sei.come.sei for the new era of creative direction.',
    ],
    editingRecipe: {
      hookStyle: 'Flash frame visual cut with oversized editorial typography and rhythmic beat drop',
      bRollType: 'Studio lookbooks, print design texture, dynamic product spins, architectural lines',
      audioPacing: 'Electronic/house pulse synchronized strictly to frame cuts',
      textStyle: 'Avant-garde bold serif/sans combinations with inverted color boxes',
      zoomEffect: 'Instant flash frame cuts on 120BPM musical rhythm',
    },
    referenceUrls: [
      { platform: 'instagram', label: 'Sei Come Sei Instagram', url: 'https://instagram.com/sei.come.sei' },
    ],
    referenceHandles: [
      {
        platform: 'instagram',
        handle: '@sei.come.sei',
        profileUrl: 'https://instagram.com/sei.come.sei',
        contentType: 'aesthetic',
        viewCountRange: '40K–800K per reel',
        editingStyle: 'High-fashion editorial pacing, synchronized beat cuts, avant-garde typography, cultural direction',
        whyItWorks: 'Creates unmistakable brand distinction that feels elevated, cultured, and aspirational.',
      },
    ],
    tags: ['sei-come-sei', 'editorial', 'fashion', 'creative-direction', 'aesthetic'],
  },
  {
    id: 'sei-founder-hook',
    name: 'Sei · High-Energy Founder Hook & Multi-Presenter Reel',
    startup: 'Sei Network',
    handle: '@sei / sei.io',
    website: 'https://sei.io',
    category: 'high-energy',
    archetype: 'Fast Jump-Cut Founder Hook',
    badge: '🔥 Sei Studio Style',
    accentColor: '#FF2D55',
    gradientBg: 'linear-gradient(135deg, #2A0812 0%, #0D0508 100%)',
    tagline: 'Ultra-fast jump cuts on first syllables, +8% zoom punches, and high-contrast neon accents.',
    hookRating: 9.8,
    cutFrequency: '1.6 – 2.0s',
    scriptBeats: [
      '[Hook] We built the fastest EVM blockchain in crypto — here is what that actually means in code.',
      '[Problem] Most Layer-1s choke on 500 transactions per second and fee spikes kill user experience.',
      '[Dopamine Drop] Sei parallelizes state execution. 28,000 TPS with 390 millisecond finality.',
      '[Proof] Look at this live benchmark: 400ms parallel execution, zero mempool bloat, sub-cent gas.',
      '[CTA] Drop a comment with "SEI" or join the dev Discord to build on parallelized consensus.',
    ],
    editingRecipe: {
      hookStyle: 'Punch-in zoom on syllable 1 with sub-bass drop and neon red flash',
      bRollType: 'Speed-ramped terminal benchmarks + multi-presenter split screen',
      audioPacing: 'Zero dead-air, whoosh transition on every cut (-12dB)',
      textStyle: 'Word-by-word kinetic captions with yellow/crimson highlight',
      zoomEffect: '100% → 108% scale punch every 2 seconds',
    },
    referenceUrls: [
      { platform: 'x', label: 'Sei Network on X', url: 'https://x.com/SeiNetwork' },
      { platform: 'youtube', label: 'Sei Parallel EVM Keynote', url: 'https://youtube.com' },
      { platform: 'tiktok', label: 'Sei Creator Hooks', url: 'https://tiktok.com/@sei' },
    ],
    referenceHandles: [
      {
        platform: 'tiktok',
        handle: '@levelsio',
        profileUrl: 'https://tiktok.com/@levelsio',
        contentType: 'founder-talking-head',
        viewCountRange: '300K–8M per reel',
        editingStyle: 'Fast jump-cut, metric-first hook, no-fluff pacing, solo phone setup',
        whyItWorks: 'Archetypal fast-hook founder format — opens on a punchy stat, holds zero dead air. Direct blueprint for Sei high-energy talking-head.',
      },
      {
        platform: 'x',
        handle: '@SeiNetwork',
        profileUrl: 'https://x.com/SeiNetwork',
        contentType: 'benchmark',
        viewCountRange: '50K–2M per post',
        editingStyle: 'Data-first screen captures, live benchmark cuts, ecosystem announcements',
        whyItWorks: 'Official benchmark and TPS comparison clips — direct A-Roll reference for the proof segment of this blueprint.',
      },
      {
        platform: 'youtube',
        handle: '@ycombinator',
        profileUrl: 'https://youtube.com/@ycombinator',
        contentType: 'founder-talking-head',
        viewCountRange: '200K–3M per video',
        editingStyle: 'Tight founder interviews, cross-cut with product demos, clean studio lighting',
        whyItWorks: 'YC-style high-credibility founder delivery — tone and pacing reference for the Problem + Proof beats.',
      },
    ],
    tags: ['sei', 'crypto', 'high-energy', 'founder-talking-head', 'benchmark'],
  },
  {
    id: 'sei-bts-war-room',
    name: 'Sei BTS · Engineering War Room & Hackathon Vlog',
    startup: 'Sei HQ',
    handle: '@sei',
    website: 'https://sei.io',
    category: 'bts',
    archetype: 'Cinematic Startup Behind-The-Scenes',
    badge: '🎬 BTS War Room',
    accentColor: '#F59E0B',
    gradientBg: 'linear-gradient(135deg, #2B1800 0%, #0E0800 100%)',
    tagline: 'Handheld dynamic B-roll, whiteboard sprints, coffee pours, and intense developer momentum.',
    hookRating: 9.4,
    cutFrequency: '2.0 – 2.4s',
    scriptBeats: [
      '[Hook] 48 hours inside the Sei engineering war room before mainnet upgrade.',
      '[Problem] Shipping parallelized consensus at scale means zero sleep and 100+ PRs merged simultaneously.',
      '[Dopamine Drop] Watch what happens when the stress test hits 30,000 simulated validator nodes.',
      '[Proof] Latency drops straight to 380ms. The whole room explodes.',
      '[CTA] What feature should our core engineering team build next? Drop it below.',
    ],
    editingRecipe: {
      hookStyle: 'Cold open on urgent engineer dialogue with fast shutter B-roll',
      bRollType: 'Desk setups, mechanical keyboard ASMR, whiteboard architecture sketches',
      audioPacing: 'Ambient lo-fi synthesizer building into energetic riser drop',
      textStyle: 'Clean monospace terminal timestamp badge in top corner [02:44 AM]',
      zoomEffect: 'Handheld organic micro-shake with slow 4% drift',
    },
    referenceUrls: [
      { platform: 'x', label: 'Sei Dev Updates', url: 'https://x.com/SeiNetwork' },
      { platform: 'youtube', label: 'Startup War Room BTS', url: 'https://youtube.com' },
    ],
    referenceHandles: [
      {
        platform: 'youtube',
        handle: '@ycombinator',
        profileUrl: 'https://youtube.com/@ycombinator',
        contentType: 'bts-vlog',
        viewCountRange: '100K–1.5M per video',
        editingStyle: 'Unfiltered startup war-room vlogs, overnight sprint footage, raw team moments',
        whyItWorks: 'Canonical BTS startup format — handheld feel, urgency, authentic engineering grind. Maps 1:1 to this blueprint.',
      },
      {
        platform: 'tiktok',
        handle: '@heyitsalexkim',
        profileUrl: 'https://tiktok.com/@heyitsalexkim',
        contentType: 'bts-vlog',
        viewCountRange: '80K–2M per reel',
        editingStyle: 'Day-in-the-life founder vlog, fast cuts on action, ambient sound design',
        whyItWorks: 'BTS founder energy with authentic workspace B-roll — perfect cut style reference for the engineering war room arc.',
      },
      {
        platform: 'instagram',
        handle: '@startupschool',
        profileUrl: 'https://instagram.com/startupschool',
        contentType: 'bts-vlog',
        viewCountRange: '30K–500K per reel',
        editingStyle: 'Short BTS cuts with overlaid founder monologue, product decision moments',
        whyItWorks: 'Archetype for the engineering dialogue hook — opens on a real decision, not a rehearsed pitch.',
      },
    ],
    tags: ['sei', 'bts', 'engineering', 'war-room', 'vlog', 'hackathon'],
  },
  {
    id: 'linear-minimal-drop',
    name: 'Linear · Ultra-Minimalist Dark Mode Product Drop',
    startup: 'Linear',
    handle: '@linear / linear.app',
    website: 'https://linear.app',
    category: 'minimal-saas',
    archetype: 'Minimalist Aesthetic SaaS Walkthrough',
    badge: '✨ Linear Dark Mode',
    accentColor: '#5E6AD2',
    gradientBg: 'linear-gradient(135deg, #131424 0%, #090A10 100%)',
    tagline: '50ms snappy transitions, glassmorphism UI recordings, dark purple accents, and whisper-smooth delivery.',
    hookRating: 9.2,
    cutFrequency: '2.2 – 2.8s',
    scriptBeats: [
      '[Hook] Project management software is usually bloated and slow. We rebuilt it from first principles.',
      '[Problem] 5-second load times and 40 dropdown menus ruin your engineering flow state every single day.',
      '[Dopamine Drop] Linear opens in 50 milliseconds. Keyboard shortcuts for everything. Pure flow.',
      '[Proof] Cycles, roadmap milestones, and Git integration with zero context switching.',
      '[CTA] Switch your team over to Linear today. Link in bio.',
    ],
    editingRecipe: {
      hookStyle: 'Ultra-crisp 4K screen recording zoom on keyboard shortcut [CMD+K]',
      bRollType: 'Silky smooth 60fps cursor pan and dark mode glass cards',
      audioPacing: 'Subtle mechanical switch clicks, deep sub whoosh, calm founder voice',
      textStyle: 'Inter / Plus Jakarta Sans bold tracking with purple accent pill',
      zoomEffect: 'Smooth focal push into active UI modal',
    },
    referenceUrls: [
      { platform: 'x', label: 'Linear App Releases', url: 'https://x.com/linear' },
      { platform: 'youtube', label: 'Linear Release Reel', url: 'https://youtube.com' },
    ],
    referenceHandles: [
      {
        platform: 'x',
        handle: '@linear',
        profileUrl: 'https://x.com/linear',
        contentType: 'product-demo',
        viewCountRange: '20K–800K per post',
        editingStyle: '60fps screen recordings, crisp dark mode UI, zero voiceover, music only',
        whyItWorks: 'The gold standard for minimal SaaS demo footage — exact aesthetic reference for the UI recording segments.',
      },
      {
        platform: 'x',
        handle: '@rauchg',
        profileUrl: 'https://x.com/rauchg',
        contentType: 'founder-talking-head',
        viewCountRange: '15K–400K per post',
        editingStyle: 'Calm, measured delivery with deep technical credibility. Zero hype pacing.',
        whyItWorks: 'Tone reference for the minimal SaaS founder voice — authoritative but not breathless.',
      },
      {
        platform: 'youtube',
        handle: '@Fireship',
        profileUrl: 'https://youtube.com/@Fireship',
        contentType: 'product-demo',
        viewCountRange: '500K–5M per video',
        editingStyle: 'Ultra-tight code/screen demo cuts, dark UI aesthetic, deadpan wit',
        whyItWorks: 'Speed and density of cuts maps to Linear\'s fast keyboard-shortcut demo segments.',
      },
    ],
    tags: ['linear', 'minimalist', 'saas', 'dark-mode', 'ui-recording'],
  },
  {
    id: 'cursor-10x-dev',
    name: 'Cursor · 10x Dev Speed Live-Coding B-Roll',
    startup: 'Cursor',
    handle: '@cursor_ai / cursor.com',
    website: 'https://cursor.com',
    category: 'dev-tools',
    archetype: 'Split-Screen Live Coding & AI Copilot Punch',
    badge: '💻 10x AI Dev',
    accentColor: '#10B981',
    gradientBg: 'linear-gradient(135deg, #06231A 0%, #020F0B 100%)',
    tagline: 'Terminal cuts, split-screen code completion, dopamine typing ASMR, and high-tempo creator pacing.',
    hookRating: 9.6,
    cutFrequency: '1.8 – 2.2s',
    scriptBeats: [
      '[Hook] I just refactored an entire backend in 90 seconds using AI inside Cursor.',
      '[Problem] Writing boilerplate CRUD endpoints and manual SQL migrations takes 4 hours of your afternoon.',
      '[Dopamine Drop] CMD+K generates the migration, types the schema, and writes tests in 1 keystroke.',
      '[Proof] Watch this entire auth system generate live with zero hallucinated imports.',
      '[CTA] Tag a developer who needs to see this workflow.',
    ],
    editingRecipe: {
      hookStyle: 'Rapid split screen: Creator talking head on left, rapid AI code stream on right',
      bRollType: 'Terminal build logs, syntax highlighted diffs (green/red), VSCode tabs',
      audioPacing: 'High-speed keyboard clacks synced to code generation tokens',
      textStyle: 'JetBrains Mono green code callouts with animated border pulse',
      zoomEffect: 'Punch zoom into generated function signature',
    },
    referenceUrls: [
      { platform: 'x', label: 'Cursor AI Demo on X', url: 'https://x.com/cursor_ai' },
      { platform: 'tiktok', label: 'Cursor Dev Speedruns', url: 'https://tiktok.com' },
    ],
    referenceHandles: [
      {
        platform: 'tiktok',
        handle: '@theo',
        profileUrl: 'https://tiktok.com/@theo',
        contentType: 'founder-talking-head',
        viewCountRange: '100K–3M per reel',
        editingStyle: 'High-energy dev rants, live reactions to code output, authentic unfiltered delivery',
        whyItWorks: 'Archetype for the excited developer hook — raw energy, screen + face split, high credibility with dev audience.',
      },
      {
        platform: 'x',
        handle: '@cursor_ai',
        profileUrl: 'https://x.com/cursor_ai',
        contentType: 'product-demo',
        viewCountRange: '50K–2M per post',
        editingStyle: 'Live AI generation screen captures, before/after code comparisons',
        whyItWorks: 'Official A-Roll reference — exact CMD+K generation and diff views used in the Proof beat.',
      },
      {
        platform: 'youtube',
        handle: '@CodeWithChris',
        profileUrl: 'https://youtube.com/@CodeWithChris',
        contentType: 'product-demo',
        viewCountRange: '200K–1.5M per video',
        editingStyle: 'Step-by-step code walkthroughs with clean screen recording, animated callouts',
        whyItWorks: 'Tutorial-format B-Roll reference — clean syntax highlighting and terminal cut style.',
      },
    ],
    tags: ['cursor', 'ai-code', 'dev-tools', 'split-screen', 'tutorial'],
  },
  {
    id: 'vercel-ship-keynote',
    name: 'Vercel · Keynote & Ship-Every-Day Founder Reel',
    startup: 'Vercel',
    handle: '@vercel / vercel.com',
    website: 'https://vercel.com',
    category: 'dev-tools',
    archetype: 'High-Production Keynote & Ship Reel',
    badge: '▲ Vercel Ship Style',
    accentColor: '#FFFFFF',
    gradientBg: 'linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%)',
    tagline: 'Bold monochrome black/white branding, keynote presentation cuts, and dynamic edge speed.',
    hookRating: 9.3,
    cutFrequency: '2.0 – 2.5s',
    scriptBeats: [
      '[Hook] Deploying to production shouldn\'t take a 45-minute CI/CD pipeline.',
      '[Problem] Broken preview environments and slow server cold starts kill your team velocity.',
      '[Dopamine Drop] Push to git. Global edge deployment in 2 seconds. Zero server management.',
      '[Proof] 100,000 requests handled globally with sub-50ms TTFB across all 300 edge nodes.',
      '[CTA] Ship your next app on the edge today.',
    ],
    editingRecipe: {
      hookStyle: 'Minimal stark black screen with bold white typography flash and bass kick',
      bRollType: 'Stage presentation clips, globe traffic visualization, Git push terminal',
      audioPacing: 'Deep cinematic impact sub-bass and crisp whooshes',
      textStyle: 'Geist / Inter Bold 56px high-contrast white text with black backdrop',
      zoomEffect: 'Instant hard cuts on beat transitions',
    },
    referenceUrls: [
      { platform: 'x', label: 'Vercel Releases', url: 'https://x.com/vercel' },
      { platform: 'youtube', label: 'Next.js Conf Keynote', url: 'https://youtube.com' },
    ],
    referenceHandles: [
      {
        platform: 'x',
        handle: '@vercel',
        profileUrl: 'https://x.com/vercel',
        contentType: 'product-demo',
        viewCountRange: '30K–1M per post',
        editingStyle: 'Monochrome product announcements, globe deployment animations, bold typography',
        whyItWorks: 'Official visual language — black/white high contrast, bold type, no-fluff. Direct A-Roll for the Hook and CTA beats.',
      },
      {
        platform: 'youtube',
        handle: '@theo',
        profileUrl: 'https://youtube.com/@t3dotgg',
        contentType: 'benchmark',
        viewCountRange: '200K–3M per video',
        editingStyle: 'Product reaction keynote takes, speed comparisons, technical breakdown format',
        whyItWorks: 'Keynote-style take format — Theo\s reactions to Vercel launches are the canonical audience reference for this archetype.',
      },
      {
        platform: 'youtube',
        handle: '@jherr',
        profileUrl: 'https://youtube.com/@jherr',
        contentType: 'product-demo',
        viewCountRange: '100K–1M per video',
        editingStyle: 'Clean screen capture Next.js tutorials with fast-paced voiceover',
        whyItWorks: 'Next.js deployment B-Roll reference — production-grade Git push to Vercel flow footage.',
      },
    ],
    tags: ['vercel', 'nextjs', 'keynote', 'founder', 'infrastructure'],
  },
  {
    id: 'notion-granola-aesthetic',
    name: 'Notion & Granola · Aesthetic Workspace & Founder Day-in-the-Life',
    startup: 'Notion & Granola',
    handle: '@notionhq / granola.so',
    website: 'https://granola.so',
    category: 'bts',
    archetype: 'Aesthetic Desk Setup & Productivity Flow',
    badge: '☕ Workspace Aesthetic',
    accentColor: '#F472B6',
    gradientBg: 'linear-gradient(135deg, #2B0D1C 0%, #0F040A 100%)',
    tagline: 'Warm natural morning light, mechanical keyboard ASMR, iPad sketches, and calm founder voiceover.',
    hookRating: 9.1,
    cutFrequency: '2.4 – 3.0s',
    scriptBeats: [
      '[Hook] How I organize my entire $50k/month solo business in 1 clean workspace.',
      '[Problem] Disorganized notes and scattered Google Drives cost you 2 hours every morning.',
      '[Dopamine Drop] Here is my exact second-brain OS and AI meeting transcription stack.',
      '[Proof] Granola takes the notes automatically and syncs directly to my Notion client CRM.',
      '[CTA] Comment "SYSTEM" and I\'ll DM you the exact duplicate template.',
    ],
    editingRecipe: {
      hookStyle: 'Slow cinematic push-in on coffee mug + iPad workspace setup',
      bRollType: 'Natural sunlight, minimalist desk accessories, typing ASMR',
      audioPacing: 'Warm acoustic / lo-fi chill beat with gentle sound effects',
      textStyle: 'Clean rounded pill tags with pastel pink / cream tones',
      zoomEffect: 'Gentle 2% slow zoom over entire clip length',
    },
    referenceUrls: [
      { platform: 'instagram', label: 'Desk Aesthetic Reel', url: 'https://instagram.com' },
      { platform: 'tiktok', label: 'Founder Morning Routine', url: 'https://tiktok.com' },
    ],
    referenceHandles: [
      {
        platform: 'instagram',
        handle: '@notionhq',
        profileUrl: 'https://instagram.com/notionhq',
        contentType: 'aesthetic',
        viewCountRange: '50K–800K per reel',
        editingStyle: 'Warm editorial, workspace flatlays, soft natural light, no harsh cuts',
        whyItWorks: 'The originating aesthetic — cream tones, clean desk surfaces, warm morning light. Paste any Notion reel post for the B-Roll beats.',
      },
      {
        platform: 'tiktok',
        handle: '@aliabdaal',
        profileUrl: 'https://tiktok.com/@aliabdaal',
        contentType: 'founder-talking-head',
        viewCountRange: '500K–10M per reel',
        editingStyle: 'Calm, knowledgeable founder delivery with B-Roll workspace cutaways',
        whyItWorks: 'Productivity founder archetype — warm tone, credible framing, mechanical keyboard ASMR layering.',
      },
      {
        platform: 'instagram',
        handle: '@granolahq',
        profileUrl: 'https://instagram.com/granolahq',
        contentType: 'product-demo',
        viewCountRange: '10K–200K per reel',
        editingStyle: 'Minimal meeting transcription UX demo, warm editorial framing',
        whyItWorks: 'Direct product reference — Granola\'s own reels show the exact AI meeting note UI for the Proof beat.',
      },
    ],
    tags: ['notion', 'granola', 'productivity', 'workspace', 'asmr', 'aesthetic'],
  },
  {
    id: 'ramp-growth-breakdown',
    name: 'Ramp · Fintech Growth Metrics & Startup Expense Tear-Down',
    startup: 'Ramp',
    handle: '@ramp / ramp.com',
    website: 'https://ramp.com',
    category: 'fintech',
    archetype: 'Data-Backed Founder Breakdown',
    badge: '📈 Ramp Finance Metric',
    accentColor: '#10B981',
    gradientBg: 'linear-gradient(135deg, #052618 0%, #01120B 100%)',
    tagline: 'Animated metric chart overlays, green ticker pulses, and authoritative founder breakdown rhythm.',
    hookRating: 9.5,
    cutFrequency: '1.8 – 2.4s',
    scriptBeats: [
      '[Hook] We analyzed 10,000 startup budgets — here is where founders waste $200k every year.',
      '[Problem] Zombie SaaS subscriptions and unnegotiated cloud bills silently drain your runway.',
      '[Dopamine Drop] Ramp auto-negotiates vendor contracts and kills unused seats automatically.',
      '[Proof] The average company saves 5% of their total spend in the first 30 days.',
      '[CTA] Claim your $500 startup credit at the link in bio.',
    ],
    editingRecipe: {
      hookStyle: 'Green ticker graph animation pulsing on screen over talking-head speaker',
      bRollType: 'Live finance dashboards, SaaS audit charts, credit card tap B-roll',
      audioPacing: 'Punchy cash register chimes and clean modern upbeat soundtrack',
      textStyle: 'High-contrast emerald numbers with dynamic +$24,000 counter roll',
      zoomEffect: 'Scale push +10% on key statistics',
    },
    referenceUrls: [
      { platform: 'x', label: 'Ramp Growth Metrics', url: 'https://x.com/ramp' },
      { platform: 'youtube', label: 'Startup Financial Teardown', url: 'https://youtube.com' },
    ],
    referenceHandles: [
      {
        platform: 'x',
        handle: '@ramp',
        profileUrl: 'https://x.com/ramp',
        contentType: 'benchmark',
        viewCountRange: '20K–500K per post',
        editingStyle: 'Data-first metric graphs, customer savings callouts, clean corporate B-Roll',
        whyItWorks: 'Official benchmark footage — animated spend savings graphs and vendor negotiation case studies for the Proof beat.',
      },
      {
        platform: 'youtube',
        handle: '@moonfrogmedia',
        profileUrl: 'https://youtube.com/@moonfrogmedia',
        contentType: 'founder-talking-head',
        viewCountRange: '100K–2M per video',
        editingStyle: 'Corporate finance teardown with animated chart overlays and punchy metric callouts',
        whyItWorks: 'Fintech explainer archetype — green metric ticker format, authoritative breakdown delivery, animated data overlays.',
      },
      {
        platform: 'tiktok',
        handle: '@beatrizinfante_',
        profileUrl: 'https://tiktok.com/@beatrizinfante_',
        contentType: 'founder-talking-head',
        viewCountRange: '200K–5M per reel',
        editingStyle: 'Fast financial advice hook with text-overlay stat reveals and punchy editing',
        whyItWorks: 'Fintech creator pacing reference — metric reveals with jump-cut stat animation maps to the Dopamine Drop and Proof beats.',
      },
    ],
    tags: ['ramp', 'fintech', 'metrics', 'case-study', 'growth'],
  },
];

// ─── Instant Procedural Video File Generator ───────────────────────────────────
// Creates real, high-quality 9:16 vertical sample video files in-browser via Canvas + MediaRecorder
// so creators can immediately test the timeline and extraction engine with startup footage!

export async function generateStartupSampleFootage(
  preset: StartupReelPreset
): Promise<{ aRoll: File; bRoll: File }> {
  const fps = 24;
  const durationSec = 4;
  const totalFrames = fps * durationSec;

  const renderVideo = async (isARoll: boolean): Promise<File> => {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d')!;

    const stream = canvas.captureStream(fps);

    // Audio tone track for realistic energy analysis
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const dest = audioCtx.createMediaStreamDestination();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = isARoll ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(isARoll ? 180 : 220, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);

    // Add pulsed envelope to simulate speech energy spikes
    for (let t = 0.5; t < durationSec; t += 0.8) {
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime + t);
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime + t + 0.3);
    }

    osc.connect(gain);
    gain.connect(dest);
    osc.start();

    const combinedTracks = [...stream.getVideoTracks(), ...dest.stream.getAudioTracks()];
    const combinedStream = new MediaStream(combinedTracks);

    const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
      ? 'video/mp4;codecs=avc1'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';

    const recorder = new MediaRecorder(combinedStream, { mimeType });
    const chunks: Blob[] = [];

    recorder.ondataavailable = e => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const completion = new Promise<Blob>(resolve => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    recorder.start();

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / fps;

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 720, 1280);
      if (isARoll) {
        grad.addColorStop(0, '#0F1015');
        grad.addColorStop(0.5, '#181A24');
        grad.addColorStop(1, '#090A0E');
      } else {
        grad.addColorStop(0, '#0A0E1A');
        grad.addColorStop(0.5, '#131A2E');
        grad.addColorStop(1, '#050810');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 720, 1280);

      // Subtle dynamic grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.lineWidth = 1;
      const gridOffset = (frame * 1.5) % 40;
      for (let x = 0; x < 720; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 1280);
        ctx.stroke();
      }
      for (let y = gridOffset; y < 1280; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(720, y);
        ctx.stroke();
      }

      // Startup Badge Top Center
      ctx.fillStyle = preset.accentColor;
      ctx.shadowColor = preset.accentColor;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.roundRect(40, 60, 220, 44, 22);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(preset.badge, 150, 88);

      // Timecode Ticker
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = '14px JetBrains Mono, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`00:0${time.toFixed(2)} / 00:0${durationSec}.00`, 680, 88);

      if (isARoll) {
        // A-Roll: Talking-Head Silhouette / Avatar Card + Waveform
        const pulse = 1 + Math.sin(frame * 0.25) * 0.04;

        ctx.save();
        ctx.translate(360, 480);
        ctx.scale(pulse, pulse);

        // Halo circle
        const haloGrad = ctx.createRadialGradient(0, 0, 50, 0, 0, 180);
        haloGrad.addColorStop(0, `${preset.accentColor}44`);
        haloGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(0, 0, 180, 0, Math.PI * 2);
        ctx.fill();

        // Presenter Circle
        ctx.fillStyle = '#1E202D';
        ctx.strokeStyle = preset.accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 110, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px Space Grotesk, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(preset.startup.slice(0, 4).toUpperCase(), 0, 12);
        ctx.restore();

        // Speech Waveform Bar Graphic
        ctx.fillStyle = preset.accentColor;
        const numBars = 24;
        const startX = 140;
        for (let b = 0; b < numBars; b++) {
          const barH = Math.abs(Math.sin((frame * 0.2) + b * 0.5)) * 60 + 10;
          ctx.beginPath();
          ctx.roundRect(startX + b * 18, 700 - barH / 2, 8, barH, 4);
          ctx.fill();
        }

        // Script Hook Line
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 28px Space Grotesk, sans-serif';
        ctx.textAlign = 'center';
        const line = preset.scriptBeats[0]?.replace(/^\[Hook\]\s*/i, '') || preset.name;
        const wrappedLines = line.length > 32 ? [line.slice(0, 32) + '…'] : [line];
        ctx.fillText(wrappedLines[0], 360, 820);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '500 16px Inter, sans-serif';
        ctx.fillText('🎤 PRIMARY A-ROLL FOUNDER TAKE', 360, 870);
      } else {
        // B-Roll: UI Card / Terminal Benchmark Demo
        const panY = 320 + Math.sin(frame * 0.1) * 30;

        ctx.fillStyle = '#131620';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(60, panY, 600, 380, 20);
        ctx.fill();
        ctx.stroke();

        // Terminal dots
        ctx.fillStyle = '#EF4444'; ctx.beginPath(); ctx.arc(90, panY + 28, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#F59E0B'; ctx.beginPath(); ctx.arc(110, panY + 28, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10B981'; ctx.beginPath(); ctx.arc(130, panY + 28, 6, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = preset.accentColor;
        ctx.font = 'bold 18px JetBrains Mono, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`$ ${preset.startup.toLowerCase()} --benchmark-tps`, 90, panY + 75);

        ctx.fillStyle = '#E2E8F0';
        ctx.font = '15px JetBrains Mono, monospace';
        ctx.fillText('✔ State parallelization active', 90, panY + 120);
        ctx.fillText('✔ Consensus latency: 390ms', 90, panY + 155);
        ctx.fillText('✔ Throughput: 28,400 TPS', 90, panY + 190);

        // Big Metric Callout
        ctx.fillStyle = preset.accentColor;
        ctx.font = '800 48px Space Grotesk, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('28,000 TPS', 360, panY + 280);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.font = '500 16px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎬 B-ROLL BENCHMARK FOOTAGE', 360, 840);
      }

      await new Promise(r => setTimeout(r, 1000 / fps));
    }

    recorder.stop();
    osc.stop();
    audioCtx.close();

    const blob = await completion;
    const filename = isARoll
      ? `${preset.id}_A_Roll.mp4`
      : `${preset.id}_B_Roll.mp4`;

    return new File([blob], filename, { type: 'video/mp4', lastModified: Date.now() });
  };

  const [aRoll, bRoll] = await Promise.all([renderVideo(true), renderVideo(false)]);
  return { aRoll, bRoll };
}
