import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { ConstitutionRule, ContextState, Integration, Portrait, Journey, LibraryItem, RealtimeInsight, WorldModel } from '@william/types';
import { CommandPalette } from './CommandPalette';
import { CognitiveMap } from './CognitiveMap';
import { MetaphorBriefCard } from './MetaphorBriefCard';
import { GenerativeCard, type GenerativeCardPayload } from './GenerativeCards';
import { VoiceWaveformVisualizer } from './VoiceWaveformVisualizer';
import { DynamicQuickActions } from './DynamicQuickActions';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useMetaphorPipeline } from '../hooks/useMetaphorPipeline';
import { motion, AnimatePresence } from 'framer-motion';
import type { MemoryNode, MemoryEdge } from '@william/types';
import { 
  Sparkles, Brain, Compass, BookOpen, Target, Zap, Radio, MessageSquare,
  Command, LayoutGrid, Dumbbell, Lightbulb, Code2, Music, Heart,
  TrendingUp, Globe, Cpu, Feather, Flame, Star, Mic
} from 'lucide-react';

// Journey icon lookup — maps string keys from the DB to Lucide icon components
const JOURNEY_ICON_MAP: Record<string, React.FC<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Brain, Compass, BookOpen, Target, Zap, Sparkles, Radio, MessageSquare,
  Dumbbell, Lightbulb, Code2, Music, Heart, TrendingUp, Globe, Cpu,
  Feather, Flame, Star, LayoutGrid,
};
function JourneyIcon({ name, size = 22 }: { name: string; size?: number }) {
  const Icon = JOURNEY_ICON_MAP[name] ?? Target;
  return <Icon size={size} strokeWidth={1.5} />;
}



interface DashboardProps {
  initialData: {
    username: string;
    portrait: Portrait;
    journeys: Journey[];
    library: LibraryItem[];
    rules: ConstitutionRule[];
    context: Partial<ContextState>;
    integrations: Integration[];
  };
  onReset: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'william' | 'user';
  text: string;
  time: string;
  cardPayload?: GenerativeCardPayload;
}

interface TimelineItem {
  id: string;
  time: string;
  category: string;
  text: string;
}

// ─── Time-of-day theming helper ──────────────────────────────────────────────
function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'morning';
  if (h >= 12 && h < 17) return 'afternoon';
  if (h >= 17 && h < 22) return 'evening';
  return 'night';
}

const TIME_PALETTES = {
  morning:   { '--glow-color': 'radial-gradient(circle, rgba(99,179,237,0.15) 0%, transparent 70%)' },
  afternoon: { '--glow-color': 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)' },
  evening:   { '--glow-color': 'radial-gradient(circle, rgba(67,56,202,0.2) 0%, transparent 70%)' },
  night:     { '--glow-color': 'radial-gradient(circle, rgba(15,23,42,0.4) 0%, transparent 70%)' },
};

export const Dashboard: React.FC<DashboardProps> = ({ initialData, onReset }) => {
  const { pushActionLog } = useMetaphorPipeline();
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [deviceType, setDeviceType] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'home' | 'portrait' | 'journeys' | 'library' | 'settings' | 'world' | 'actions'>('home');
  const [mobileTab, setMobileTab] = useState<'chat' | 'journey' | 'portrait' | 'today'>('today');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSimPanel, setShowSimPanel] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Real voice capture hook
  const voiceRecorder = useVoiceRecorder((completedText) => {
    if (completedText.trim()) {
      setChatInput(completedText.trim());
    }
  });

  // Real-time insights
  const [activeInsights, setActiveInsights] = useState<RealtimeInsight[]>([]);
  const [dismissedInsight, setDismissedInsight] = useState(false);

  // Streaming
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const streamingRef = useRef('');

  // World model
  const [worldModel, setWorldModel] = useState<WorldModel | null>(null);

  // Proactive presence signal
  const [presenceSignal, setPresenceSignal] = useState<{ message: string; need: string; signalId?: string } | null>(null);

  // Poll presence signals on load and check periodically
  useEffect(() => {
    async function checkPresence() {
      const res = await fetchJson('/api/presence');
      if (res && res.checkIn) {
        setPresenceSignal({
          message: res.message,
          need: res.need,
          signalId: res.signalId
        });
      }
    }
    checkPresence();
    const interval = setInterval(checkPresence, 20000);
    return () => clearInterval(interval);
  }, []);

  // Handle ESC key to exit Focus Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Time of day adaptive theme
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay());
  useEffect(() => {
    const interval = setInterval(() => setTimeOfDay(getTimeOfDay()), 60000);
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
    const palette = TIME_PALETTES[timeOfDay];
    Object.entries(palette).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }, [timeOfDay]);

  // Cognitive map node and edge persistence functions
  const handleSaveNode = async (node: MemoryNode) => {
    await fetchJson('/api/world-model/node', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(node)
    });
  };

  const handleSaveEdge = async (edge: MemoryEdge) => {
    await fetchJson('/api/world-model/edge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(edge)
    });
  };

  const connectMetaphor = () => {
    const clientId = "william";
    const redirectUri = window.location.origin;
    
    const isProd = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1";
    const metaphorBase = isProd 
      ? "https://metaphor-backend.onrender.com/api/v1/mcp"
      : "http://localhost:8000/api/v1/mcp";
      
    const metaphorAuthUrl = `${metaphorBase}/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code`;
    window.location.href = metaphorAuthUrl;
  };


  // Core Monorepo States
  const [portrait, setPortrait] = useState<Portrait>(initialData.portrait);
  const [journeys, setJourneys] = useState<Journey[]>(initialData.journeys);
  const [library, setLibrary] = useState<LibraryItem[]>(initialData.library);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3005';

  const fetchJson = async (endpoint: string, options?: RequestInit) => {
    try {
      const res = await fetch(`${API_URL}${endpoint}`, options);
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn(`William Companion Server offline or loading locally:`, e);
    }
    return null;
  };

  // Timeline logs
  const [historyLogs, setHistoryLogs] = useState<TimelineItem[]>([]);

  // Load database values on component mount
  useEffect(() => {
    async function loadData() {
      const apiPortrait = await fetchJson('/api/portrait');
      if (apiPortrait) {
        setPortrait(apiPortrait);
      } else {
        await fetchJson('/api/portrait', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialData.portrait)
        });
      }
      
      const apiJourneys = await fetchJson('/api/journeys');
      if (apiJourneys && apiJourneys.length > 0) {
        setJourneys(apiJourneys);
      } else {
        for (const j of initialData.journeys) {
          await fetchJson('/api/journeys', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(j)
          });
        }
      }

      const apiLibrary = await fetchJson('/api/library');
      if (apiLibrary && apiLibrary.length > 0) {
        setLibrary(apiLibrary);
      } else {
        for (const item of initialData.library) {
          await fetchJson('/api/library', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item)
          });
        }
      }

      const apiChronicle = await fetchJson('/api/chronicle');
      if (apiChronicle && apiChronicle.length > 0) {
        setHistoryLogs(apiChronicle);
      }

      const dChats = await fetchJson('/api/chats?session=desktop');
      if (dChats && dChats.length > 0) {
        setDesktopChatLogs(dChats);
      }

      const mChats = await fetchJson('/api/chats?session=mobile');
      if (mChats && mChats.length > 0) {
        setMobileChatLogs(mChats);
      }

      // William speaks first — fetch a greeting if no prior desktop chats today
      const todayKey = new Date().toDateString();
      const greetedToday = sessionStorage.getItem('william_greeted');
      if (!greetedToday || greetedToday !== todayKey) {
        const greeting = await fetchJson('/api/reasoner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: '__GREETING__', session: 'desktop' })
        });
        if (greeting && greeting.reply) {
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setDesktopChatLogs(prev => [
            { id: `greeting_${Date.now()}`, sender: 'william', text: greeting.reply, time },
            ...prev
          ]);
          sessionStorage.setItem('william_greeted', todayKey);
        }
      }
    }
    loadData();
  }, []);

  // Sync theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);


  // Conversational logs
  const [desktopChatLogs, setDesktopChatLogs] = useState<ChatMessage[]>([]);
  const [mobileChatLogs, setMobileChatLogs] = useState<ChatMessage[]>([]);

  // Input bindings
  const [chatInput, setChatInput] = useState('');
  const [mobileChatInput, setMobileChatInput] = useState('');

  // Mobile Capturing state overlays
  const [mobileCaptureType, setMobileCaptureType] = useState<null | 'speak' | 'write' | 'capture'>(null);
  const [captureInputText, setCaptureInputText] = useState('');
  const [simWavePulse, setSimWavePulse] = useState(false);

  // Mobile Focus Tasks Checklist
  const [mobileTasks, setMobileTasks] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newMobileTaskText, setNewMobileTaskText] = useState('');

  // Selected sub-tabs / expanded details
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>('j1');
  const [selectedLibraryItem, setSelectedLibraryItem] = useState<LibraryItem | null>(null);

  // Study workspace interactive reflection dialog overlay
  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectionStep, setReflectionStep] = useState(0);
  
  // Reflection Engine Simulation States
  const [isReflectionLoading, setIsReflectionLoading] = useState(false);
  const [reflectionOverlayText, setReflectionOverlayText] = useState<string | null>(null);

  const triggerReflectionCycle = async () => {
    setIsReflectionLoading(true);
    const res = await fetchJson('/api/reflection-engine', { method: 'POST' });
    setIsReflectionLoading(false);
    if (res && res.success) {
      setReflectionOverlayText(res.reflection);
      // Reload portrait & chronicle logs
      const apiPortrait = await fetchJson('/api/portrait');
      if (apiPortrait) setPortrait(apiPortrait);
      const apiChronicle = await fetchJson('/api/chronicle');
      if (apiChronicle) setHistoryLogs(apiChronicle);
    } else {
      alert('Failed to trigger reflection cycle. Is the server running?');
    }
  };
  const [eveningSurprise, setEveningSurprise] = useState('');
  const [eveningBurden, setEveningBurden] = useState('');
  const [eveningAlign, setEveningAlign] = useState('');
  const [eveningRemember, setEveningRemember] = useState('');

  // Simulator controls
  const [simTimeOfDay, setSimTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('evening');
  const [simPeriod, setSimPeriod] = useState<'day1' | 'firstweek' | 'longterm'>('longterm');

  // Highlight effect trigger
  const [highlightedCategory, setHighlightedCategory] = useState<string | null>(null);

  const triggerHighlight = (cat: string) => {
    setHighlightedCategory(cat);
    setTimeout(() => setHighlightedCategory(null), 3000);
  };

  // Keyboard shortcut listeners
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
        return;
      }

      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'd') {
        setDeviceType('desktop');
      } else if (key === 'm') {
        setDeviceType('mobile');
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handlePaletteAction = (actionKey: string) => {
    switch (actionKey) {
      case 'go-home':
        setActiveTab('home');
        break;
      case 'go-memory':
        setActiveTab('portrait');
        break;
      case 'go-settings':
        setActiveTab('settings');
        break;
      case 'toggle-theme':
        toggleTheme();
        break;
      case 'reset':
        onReset();
        break;
      default:
        break;
    }
  };

  // Generative Payload Detector for in-stream Natural AI card summoning
  const detectGenerativePayload = useCallback((userQuery: string, williamReply?: string): GenerativeCardPayload | undefined => {
    const combined = `${userQuery} ${williamReply || ''}`.toLowerCase();

    if (combined.includes('journey') || combined.includes('pathway') || combined.includes('milestone') || combined.includes('atlas') || combined.includes('progress')) {
      const activeJ = journeys.find(j => j.id === selectedJourneyId) || journeys[0];
      if (activeJ) return { type: 'journey', data: activeJ };
    }

    if (combined.includes('belief') || combined.includes('conviction') || combined.includes('portrait') || combined.includes('principle')) {
      if (portrait.activeBeliefs && portrait.activeBeliefs.length > 0) {
        return { type: 'belief', data: portrait.activeBeliefs };
      }
    }

    if (combined.includes('entity') || combined.includes('entities') || combined.includes('world') || combined.includes('graph') || combined.includes('model')) {
      if (worldModel && worldModel.nodes.length > 0) {
        return { type: 'world', data: worldModel.nodes.slice(0, 4) };
      }
    }

    if (combined.includes('focus') || combined.includes('routine') || combined.includes('task') || combined.includes('todo')) {
      if (mobileTasks.length > 0) {
        return { type: 'focus', data: mobileTasks };
      }
    }

    if (combined.includes('library') || combined.includes('quote') || combined.includes('wisdom') || combined.includes('book') || combined.includes('read')) {
      if (library.length > 0) {
        return { type: 'library', data: library[0] };
      }
    }

    return undefined;
  }, [journeys, selectedJourneyId, portrait, worldModel, mobileTasks, library]);

  // Desktop Study chat send — streaming
  const handleSendDesktopChat = useCallback(async (e?: React.FormEvent, directText?: string) => {
    if (e) e.preventDefault();
    const query = (directText || chatInput).trim();
    if (!query || isStreaming) return;

    setChatInput('');
    setDismissedInsight(false);

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = { id: `duser_${Date.now()}`, sender: 'user', text: query, time };
    setDesktopChatLogs(prev => [...prev, userMsg]);

    // Try streaming first
    setIsStreaming(true);
    streamingRef.current = '';
    setStreamingText('');

    try {
      const res = await fetch(`${API_URL}/api/reasoner/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, session: 'desktop' })
      });

      if (res.ok && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'token') {
                streamingRef.current += data.token;
                setStreamingText(streamingRef.current);
              } else if (data.type === 'insights' && data.insights?.length > 0) {
                setActiveInsights(data.insights);
              } else if (data.type === 'done') {
                const finalText = data.fullReply || streamingRef.current;
                const genPayload = detectGenerativePayload(query, finalText);
                setDesktopChatLogs(prev => [...prev, {
                  id: `dwilliam_${Date.now()}`, sender: 'william', text: finalText, time, cardPayload: genPayload
                }]);
                setStreamingText('');
                streamingRef.current = '';
                const apiPortrait = await fetchJson('/api/portrait');
                if (apiPortrait) setPortrait(apiPortrait);
              }
            } catch (_) {}
          }
        }
      } else {
        throw new Error('Stream unavailable');
      }
    } catch (_) {
      // Fallback to non-streaming
      const res = await fetchJson('/api/reasoner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query, session: 'desktop' })
      });
      const genPayload = detectGenerativePayload(query, res?.reply);
      if (res && res.reply) {
        setDesktopChatLogs(prev => [...prev, { id: `dwilliam_${Date.now()}`, sender: 'william', text: res.reply, time, cardPayload: genPayload }]);
        if (res.insights?.length > 0) setActiveInsights(res.insights);
      } else {
        setDesktopChatLogs(prev => [...prev, {
          id: `dwilliam_${Date.now()}`,
          sender: 'william',
          text: "I am listening closely, holding your thoughts in local memory while the connection is restored.",
          time,
          cardPayload: genPayload
        }]);
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  }, [chatInput, isStreaming, API_URL, detectGenerativePayload]);

  // Mobile Chat send
  const handleSendMobileChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobileChatInput.trim()) return;

    const userText = mobileChatInput.trim();
    setMobileChatInput('');

    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMobileChatLogs(prev => [...prev, { id: `muser_${Date.now()}`, sender: 'user', text: userText, time }]);

    const res = await fetchJson('/api/reasoner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: userText, session: 'mobile' })
    });

    const genPayload = detectGenerativePayload(userText, res?.reply);

    if (res && res.reply) {
      setMobileChatLogs(prev => [...prev, {
        id: `mwilliam_${Date.now()}`,
        sender: 'william',
        text: res.reply,
        time,
        cardPayload: genPayload
      }]);
    } else {
      setMobileChatLogs(prev => [...prev, {
        id: `mwilliam_${Date.now()}`,
        sender: 'william',
        text: "I am listening closely, holding your thoughts in local memory.",
        time,
        cardPayload: genPayload
      }]);
    }
  };

  // Submit evening reflection from study
  const handleReflectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const summary = `Reflection surprise: ${eveningSurprise}. Burden: ${eveningBurden}. Alignment: ${eveningAlign}. Remember: ${eveningRemember}.`;
    
    // Add growth biography entry
    const updatedGrowth = [...portrait.growth, `Evening reflection: ${summary}`];
    const updatedPortrait = {
      ...portrait,
      growth: updatedGrowth,
      decision_patterns: [...portrait.decision_patterns, `Reflected on aligning actions to patient identity.`]
    };
    
    setPortrait(updatedPortrait);
    
    await fetchJson('/api/portrait', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPortrait)
    });

    await fetchJson('/api/chronicle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Submitted evening reflection.', category: 'reflection' })
    });

    // Optional: push to Metaphor OS Pipeline
    await pushActionLog({
      title: "William: Evening Reflection",
      summary: "User completed evening reflection and identity alignment.",
      content: summary
    });

    triggerHighlight('growth');
    triggerHighlight('decision_patterns');

    // Reset reflection
    setIsReflecting(false);
    setReflectionStep(0);
    setEveningSurprise('');
    setEveningBurden('');
    setEveningAlign('');
    setEveningRemember('');
  };

  // Add mobile task checklist
  const handleAddMobileTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMobileTaskText.trim()) return;

    setMobileTasks(prev => [
      ...prev,
      { id: `mt_${Date.now()}`, text: newMobileTaskText.trim(), completed: false }
    ]);
    setNewMobileTaskText('');
  };

  // Toggle mobile task completed
  const handleToggleMobileTask = (id: string) => {
    setMobileTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  // Mobile speech waveforms simulation
  useEffect(() => {
    let interval: number;
    if (mobileCaptureType === 'speak') {
      setSimWavePulse(true);
      interval = window.setInterval(() => {
        setSimWavePulse(prev => !prev);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [mobileCaptureType]);

  // Handle mobile thought upload
  const handleMobileCaptureSave = async () => {
    if (!captureInputText.trim()) return;
    const capturedText = captureInputText.trim();
    setCaptureInputText('');

    const typeLabel = mobileCaptureType === 'speak' ? 'Speech log' : mobileCaptureType === 'capture' ? 'Camera snap' : 'Note capture';
    const tag = mobileCaptureType === 'speak' ? 'audio' : mobileCaptureType === 'capture' ? 'image' : 'note';

    // Add Library item
    const newItem: LibraryItem = {
      id: `l_${Date.now()}`,
      type: 'note',
      title: `${typeLabel} - ${new Date().toLocaleDateString()}`,
      content: capturedText,
      dateAdded: 'Today',
      tags: [tag, 'mobile']
    };
    
    setLibrary((prev: LibraryItem[]) => [...prev, newItem]);
    
    await fetchJson('/api/library', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem)
    });

    // Update Portrait
    const updatedPortrait = {
      ...portrait,
      growth: [...portrait.growth, `Captured ${tag} presence: "${capturedText.substring(0, 50)}..."`]
    };
    setPortrait(updatedPortrait);
    
    await fetchJson('/api/portrait', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedPortrait)
    });
    triggerHighlight('growth');

    // Add journey milestone or timeline
    const updatedJourneys = journeys.map((j: Journey) => {
      if (j.id === 'j1') {
        const updatedJ = {
          ...j,
          timeline: [{ date: 'Today', text: `${typeLabel}: ${capturedText}` }, ...j.timeline]
        };
        fetchJson('/api/journeys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedJ)
        });
        return updatedJ;
      }
      return j;
    });
    setJourneys(updatedJourneys);

    await fetchJson('/api/chronicle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `Captured [${typeLabel}]: "${capturedText}"`, category: 'thought' })
    });

    setMobileCaptureType(null);
  };

  const triggerObserverSync = async (provider: string) => {
    const res = await fetchJson('/api/observer/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider })
    });
    if (res && res.success) {
      alert(`Observer: ${res.log}`);
      const apiPortrait = await fetchJson('/api/portrait');
      if (apiPortrait) setPortrait(apiPortrait);
      const apiChronicle = await fetchJson('/api/chronicle');
      if (apiChronicle) setHistoryLogs(apiChronicle);
    }
  };

  const handleToggleMilestone = async (journeyId: string, milestoneId: string) => {
    const updatedJourneys = journeys.map((j: Journey) => {
      if (j.id === journeyId) {
        const updatedJ = {
          ...j,
          milestones: j.milestones.map(m => m.id === milestoneId ? { ...m, completed: !m.completed } : m)
        };
        const completedCount = updatedJ.milestones.filter(m => m.completed).length;
        updatedJ.progress = Math.round((completedCount / updatedJ.milestones.length) * 100);

        fetchJson('/api/journeys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedJ)
        });
        return updatedJ;
      }
      return j;
    });
    setJourneys(updatedJourneys);
  };

  // Render simulated control deck
  const renderFloatingSimulationPanel = () => {
    return (
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 500,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: 'var(--shadow-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '300px',
          backdropFilter: 'blur(10px)'
        }}
      >
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Simulation Dashboard
        </span>

        {/* Device toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Choose Interface Perspective:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setDeviceType('desktop')}
              style={{
                flex: 1,
                fontSize: '0.6875rem',
                padding: '6px 0',
                borderRadius: '4px',
                border: '1px solid var(--border-hairline)',
                background: (deviceType as string) === 'desktop' ? 'var(--text-primary)' : 'transparent',
                color: (deviceType as string) === 'desktop' ? 'var(--bg-surface)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              Desktop Study
            </button>
            <button
              onClick={() => setDeviceType('mobile')}
              style={{
                flex: 1,
                fontSize: '0.6875rem',
                padding: '6px 0',
                borderRadius: '4px',
                border: '1px solid var(--border-hairline)',
                background: (deviceType as string) === 'mobile' ? 'var(--text-primary)' : 'transparent',
                color: (deviceType as string) === 'mobile' ? 'var(--bg-surface)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              Mobile Walk
            </button>
          </div>
        </div>

        {/* Time of Day Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Simulate Time of Day:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['morning', 'afternoon', 'evening'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSimTimeOfDay(t)}
                style={{
                  flex: 1,
                  fontSize: '0.625rem',
                  padding: '4px 0',
                  borderRadius: '4px',
                  border: '1px solid var(--border-hairline)',
                  background: simTimeOfDay === t ? 'var(--text-primary)' : 'transparent',
                  color: simTimeOfDay === t ? 'var(--bg-surface)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Period control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Choose Chronological Stage:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['day1', 'firstweek', 'longterm'] as const).map(p => (
              <button
                key={p}
                onClick={() => setSimPeriod(p)}
                style={{
                  flex: 1,
                  fontSize: '0.625rem',
                  padding: '4px 0',
                  borderRadius: '4px',
                  border: '1px solid var(--border-hairline)',
                  background: simPeriod === p ? 'var(--text-primary)' : 'transparent',
                  color: simPeriod === p ? 'var(--bg-surface)' : 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                {p === 'day1' ? 'Day 1' : p === 'firstweek' ? 'Week 1' : '6 Months'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-hairline)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Shortcut keys:</span>
          <span>[D] Desktop • [M] Mobile</span>
        </div>
      </div>
    );
  };

  if (deviceType === 'desktop') {
    const williamReplies = desktopChatLogs.filter(l => l.sender === 'william');
    const lastReplyText = williamReplies.length > 0 
      ? williamReplies[williamReplies.length - 1].text 
      : "Walk with me. Speak your mind, or write down what feels heavy.";

    return (
      <div className="desktop-workspace-root">
        {/* Reflection Overlay */}
        {reflectionOverlayText && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(12px)' }}>
            <div 
              style={{ 
                width: '90%', 
                maxWidth: '520px', 
                background: 'var(--bg-surface)', 
                border: '1px solid var(--border-hairline)', 
                borderRadius: '24px', 
                padding: '40px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                lineHeight: 1.8,
                fontFamily: 'Georgia, serif'
              }}
            >
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
                <div style={{ marginTop: '16px' }}>
                  <span className="zen-caption" style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}>Presence</span>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 300, color: 'var(--text-primary)', marginTop: '8px' }}>Nightly Self-Reflection</h3>
                </div>
              </div>
              <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', borderTop: '1px solid var(--border-hairline)', borderBottom: '1px solid var(--border-hairline)', padding: '24px 0' }}>
                "{reflectionOverlayText}"
              </p>
              <button 
                className="zen-btn" 
                style={{ width: '100%', padding: '14px 0', borderRadius: '12px', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }} 
                onClick={() => setReflectionOverlayText(null)}
              >
                Step into Tomorrow
              </button>
            </div>
          </div>
        )}

        {/* Ambient mesh glow background */}
        <div 
          className="breathing-glow-mesh"
          style={{ 
            width: '600px', 
            height: '600px',
            background: 'var(--glow-color)',
            top: '30%',
            left: '30%'
          }}
        />

        <CommandPalette 
          isOpen={isPaletteOpen}
          onClose={() => setIsPaletteOpen(false)}
          onAction={handlePaletteAction}
        />

        {/* CINEMATIC HEADER */}
        <header className="cinematic-header">
          <div className="cinematic-logo">
            <div className="cinematic-logo-dot" />
            <span>William</span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button 
              className="zen-btn-outline header-action-btn"
              onClick={() => setIsPaletteOpen(true)}
              title="Command palette (⌘K)"
            >
              <Command size={13} strokeWidth={2} />
              <span>Systems</span>
            </button>
          </div>
        </header>

        {/* CINEMATIC CANVAS */}
        <main className={`cinematic-canvas${activeTab === 'home' ? ' home-mode' : ''}`}>
          
          {/* Nav bar now lives in the header — nothing here */}

          {/* Insight Card — slides in from bottom when patterns detected */}
          <AnimatePresence>
            {activeInsights.length > 0 && !dismissedInsight && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
                  zIndex: 800, background: 'var(--bg-surface)', border: '1px solid var(--border-hairline)',
                  borderRadius: '16px', padding: '16px 20px', maxWidth: '480px', width: '90%',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                      William noticed
                    </span>
                    {activeInsights.slice(0, 2).map((ins, i) => (
                      <p key={i} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                        {ins.detail}
                      </p>
                    ))}
                  </div>
                  <button
                    onClick={() => setDismissedInsight(true)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', fontSize: '1rem', flexShrink: 0 }}
                  >
                    ✕
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            >
              {/* Home tab: Companion Visualizer */}
              {activeTab === 'home' && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  <div style={{ width: '100%', marginBottom: '2rem', marginTop: '1rem' }}>
                    <MetaphorBriefCard />
                  </div>
                  {/* Big Breathing Orb Visualizer - Click to enter Focus Mode */}
                  <div
                    className="breathing-assistant-orb-wrapper"
                    style={{ cursor: 'pointer', margin: '24px auto' }}
                    onClick={() => {
                      setIsFocusMode(true);
                      if (!worldModel) {
                        fetchJson('/api/world-model').then(d => d && setWorldModel(d));
                      }
                    }}
                  >
                    <div className="breathing-assistant-orb-ripple" />
                    <div className="breathing-assistant-orb-ripple" />
                    <div className="breathing-assistant-orb-ripple" />
                    <div className="breathing-assistant-orb-outer" />
                    <div className="breathing-assistant-orb-pulse" />
                    <div className="breathing-assistant-orb-glass-shield" />
                    <div className="breathing-assistant-orb" />
                  </div>


                  {/* Dialogue display in serif typography */}
                  <div className="cinematic-dialogue-box">
                    <AnimatePresence mode="wait">
                      <motion.p
                        key={lastReplyText}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        className="cinematic-dialogue-text"
                      >
                        "{lastReplyText}"
                      </motion.p>
                    </AnimatePresence>
                  </div>

                  {/* Quick reflection activator */}
                  {!isReflecting && (
                    <motion.button 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      whileHover={{ opacity: 1 }}
                      className="zen-btn-outline" 
                      style={{ fontSize: '0.75rem', padding: '6px 16px', borderRadius: '16px', marginTop: '16px' }}
                      onClick={() => setIsReflecting(true)}
                    >
                      ✦ Trigger Strategy Reflection
                    </motion.button>
                  )}

                  {/* Evening reflection interactive block */}
                  {isReflecting && (
                    <motion.div
                      initial={{ scale: 0.98, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      style={{ 
                        width: '100%', 
                        maxWidth: '480px',
                        background: 'var(--bg-surface)', 
                        border: '1px solid var(--border-hairline)', 
                        borderRadius: '20px',
                        padding: '24px',
                        marginTop: '16px',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Evening Reflection</span>
                        <button className="zen-btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '12px' }} onClick={() => setIsReflecting(false)}>
                          Close
                        </button>
                      </div>

                      <form onSubmit={handleReflectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {reflectionStep === 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>What surprised you today?</span>
                            <input 
                              type="text" 
                              className="zen-input" 
                              value={eveningSurprise} 
                              onChange={(e) => setEveningSurprise(e.target.value)} 
                              placeholder="e.g. Atlas architecture compiled on first attempt"
                              autoFocus 
                            />
                            <button type="button" className="zen-btn" style={{ marginTop: '8px' }} onClick={() => setReflectionStep(1)} disabled={!eveningSurprise.trim()}>
                              Next
                            </button>
                          </div>
                        )}

                        {reflectionStep === 1 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>What burden felt lighter?</span>
                            <input 
                              type="text" 
                              className="zen-input" 
                              value={eveningBurden} 
                              onChange={(e) => setEveningBurden(e.target.value)} 
                              placeholder="e.g. Delegating deployment steps"
                              autoFocus 
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                              <button type="button" className="zen-btn-outline" onClick={() => setReflectionStep(0)}>Back</button>
                              <button type="button" className="zen-btn" onClick={() => setReflectionStep(2)} disabled={!eveningBurden.trim()}>Next</button>
                            </div>
                          </div>
                        )}

                        {reflectionStep === 2 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>Did actions resemble the person you're becoming?</span>
                            <input 
                              type="text" 
                              className="zen-input" 
                              value={eveningAlign} 
                              onChange={(e) => setEveningAlign(e.target.value)} 
                              placeholder="e.g. Yes, maintained calm deep-work session"
                              autoFocus 
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                              <button type="button" className="zen-btn-outline" onClick={() => setReflectionStep(1)}>Back</button>
                              <button type="button" className="zen-btn" onClick={() => setReflectionStep(3)} disabled={!eveningAlign.trim()}>Next</button>
                            </div>
                          </div>
                        )}

                        {reflectionStep === 3 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>What deserves remembering?</span>
                            <input 
                              type="text" 
                              className="zen-input" 
                              value={eveningRemember} 
                              onChange={(e) => setEveningRemember(e.target.value)} 
                              placeholder="e.g. Quality of focus shapes the entire week"
                              autoFocus 
                            />
                            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                              <button type="button" className="zen-btn-outline" onClick={() => setReflectionStep(2)}>Back</button>
                              <button type="submit" className="zen-btn" disabled={!eveningRemember.trim()}>Submit Reflection</button>
                            </div>
                          </div>
                        )}
                      </form>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Portrait tab */}
              {activeTab === 'portrait' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
                  <div className="dashboard-card" style={{ border: highlightedCategory === 'identity' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)' }}>
                    <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Identity</span>
                    <h4 style={{ fontSize: '1.25rem', fontWeight: 300, marginTop: '8px', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                      "{portrait.identity}"
                    </h4>
                  </div>
                  <div className="dashboard-card" style={{ border: highlightedCategory === 'values' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)' }}>
                    <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Values</span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      {portrait.values}
                    </p>
                  </div>
                  <div className="dashboard-card" style={{ border: highlightedCategory === 'principles' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)' }}>
                    <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Principles</span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                      "{portrait.principles}"
                    </p>
                  </div>
                  <div className="dashboard-card" style={{ border: highlightedCategory === 'strengths' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)' }}>
                    <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Strengths</span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      {portrait.strengths}
                    </p>
                  </div>
                  <div className="dashboard-card" style={{ border: highlightedCategory === 'blind_spots' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)' }}>
                    <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Blind Spots & Fears</span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      {portrait.blind_spots}
                    </p>
                  </div>
                  <div className="dashboard-card" style={{ border: highlightedCategory === 'relationships' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)' }}>
                    <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Companion Circle</span>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                      {portrait.relationships}
                    </p>
                  </div>
                  <div className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
                    <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Cognitive Style Analysis</span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginTop: '16px' }}>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Problem Solving Style</span>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '4px' }}>{portrait.cognitiveProfile?.problemSolvingStyle}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Temporal Bias</span>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '4px' }}>{portrait.cognitiveProfile?.temporalBias}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Attention Span Profile</span>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '4px' }}>{portrait.cognitiveProfile?.attentionSpan}</p>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Decision Heuristics</span>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '4px' }}>{portrait.cognitiveProfile?.decisionHeuristics}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Journeys tab */}
              {activeTab === 'journeys' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', textAlign: 'left' }}>
                  {journeys.map((journey) => (
                    <div key={journey.id} className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--bg-canvas)', border: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-color)', flexShrink: 0 }}>
                            <JourneyIcon name={journey.icon} size={18} />
                          </div>
                          <div>
                            <h4 style={{ fontSize: '1.125rem', fontWeight: 500 }}>{journey.title}</h4>
                            <span className="zen-caption">{journey.currentState}</span>
                          </div>
                        </div>
                        <span style={{ fontSize: '1.5rem', fontWeight: 200, color: 'var(--text-secondary)' }}>
                          {journey.progress}%
                        </span>
                      </div>
                      <div>
                        <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Milestones Checklist</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                          {journey.milestones.map((m) => (
                            <div 
                              key={m.id} 
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', opacity: m.completed ? 0.5 : 1, cursor: 'pointer' }}
                              onClick={() => handleToggleMilestone(journey.id, m.id)}
                            >
                              <div style={{ width: '16px', height: '16px', border: '1px solid var(--border-hairline)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', background: m.completed ? 'var(--text-primary)' : 'transparent', color: 'var(--bg-surface)' }}>
                                {m.completed && '✓'}
                              </div>
                              <span style={{ textDecoration: m.completed ? 'line-through' : 'none', color: 'var(--text-primary)' }}>{m.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Library tab */}
              {activeTab === 'library' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', width: '100%' }}>
                  {library.map((item) => (
                    <div 
                      key={item.id} 
                      onClick={() => setSelectedLibraryItem(item)}
                      className="dashboard-card"
                      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'space-between' }}
                    >
                      <div>
                        <span className="zen-caption" style={{ textTransform: 'uppercase' }}>{item.type}</span>
                        <h4 style={{ fontSize: '1.125rem', fontWeight: 500, marginTop: '4px' }}>{item.title}</h4>
                        {item.author && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>By {item.author}</span>}
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        "{item.content}"
                      </p>
                    </div>
                  ))}
                  {selectedLibraryItem && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                      <div className="dashboard-card" style={{ width: '90%', maxWidth: '480px', padding: '32px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: '16px' }}>
                          <span className="zen-caption" style={{ textTransform: 'uppercase' }}>{selectedLibraryItem.type}</span>
                          <button className="zen-btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '12px' }} onClick={() => setSelectedLibraryItem(null)}>
                            Close
                          </button>
                        </div>
                        <h3 style={{ fontSize: '1.375rem', fontWeight: 400, marginBottom: '4px' }}>{selectedLibraryItem.title}</h3>
                        {selectedLibraryItem.author && <h5 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>By {selectedLibraryItem.author}</h5>}
                        <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.6, padding: '16px 0', borderTop: '1px solid var(--border-hairline)', borderBottom: '1px solid var(--border-hairline)', marginBottom: '16px' }}>
                          "{selectedLibraryItem.content}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* World tab — knowledge graph */}
              {activeTab === 'world' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 500 }}>World Model</h3>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Entities and relationships William has learned from your conversations.
                      </p>
                    </div>
                    <button className="zen-btn-outline" style={{ fontSize: '0.75rem', padding: '6px 14px', borderRadius: '12px' }} onClick={() => fetchJson('/api/world-model').then(d => d && setWorldModel(d))}>
                      Refresh
                    </button>
                  </div>

                  {worldModel && worldModel.nodes.length === 0 && (
                    <div className="dashboard-card" style={{ textAlign: 'center', padding: '40px' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No entities learned yet. Start a conversation and William will begin mapping your world.</p>
                    </div>
                  )}

                  {worldModel && worldModel.nodes.length > 0 && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                      {worldModel.nodes.sort((a, b) => b.confidence - a.confidence).map(node => (
                        <div key={node.id} className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{node.type}</span>
                              <h4 style={{ fontSize: '1rem', fontWeight: 500, marginTop: '2px' }}>{node.label}</h4>
                            </div>
                            <div style={{ 
                              fontSize: '0.6875rem', fontWeight: 700,
                              color: node.confidence > 0.8 ? 'var(--text-primary)' : node.confidence > 0.5 ? 'var(--text-secondary)' : 'var(--text-muted)',
                              background: 'var(--bg-chrome)', borderRadius: '8px', padding: '2px 8px'
                            }}>
                              {Math.round(node.confidence * 100)}%
                            </div>
                          </div>
                          {node.description && (
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{node.description}</p>
                          )}
                          {worldModel.edges
                            .filter(e => e.fromId === node.id || e.toId === node.id)
                            .slice(0, 2)
                            .map(edge => {
                              const otherId = edge.fromId === node.id ? edge.toId : edge.fromId;
                              const other = worldModel.nodes.find(n => n.id === otherId);
                              return other ? (
                                <span key={edge.id} style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                  ↔ {edge.relation.replace(/_/g, ' ')} "{other.label}"
                                </span>
                              ) : null;
                            })
                          }
                        </div>
                      ))}
                    </div>
                  )}

                  {!worldModel && (
                    <div className="dashboard-card" style={{ textAlign: 'center', padding: '40px' }}>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Loading world model...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Settings tab */}
              {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                  <div className="dashboard-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Theme Mode</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toggle between light (warm stone) and dark (deep carbon) aesthetics.</div>
                    </div>
                    <button className="zen-btn-outline" onClick={toggleTheme}>
                      {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
                    </button>
                  </div>
                  <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Observer Sync (Integrations)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Sync repositories or notes to update Portrait.</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                      <button className="zen-btn-outline" style={{ flex: 1, padding: '8px 16px', fontSize: '0.8125rem' }} onClick={() => triggerObserverSync('github')}>
                        Sync GitHub
                      </button>
                      <button className="zen-btn-outline" style={{ flex: 1, padding: '8px 16px', fontSize: '0.8125rem' }} onClick={() => triggerObserverSync('notion')}>
                        Sync Notion
                      </button>
                      <button className="zen-btn" style={{ flex: 1, padding: '8px 16px', fontSize: '0.8125rem', background: 'var(--primary-color)', color: 'black' }} onClick={connectMetaphor}>
                        Connect Metaphor
                      </button>
                    </div>
                  </div>
                  <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                    <div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Reflection Engine (Nightly Cycle)</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trigger William's nightly self-reflection cycle manually.</div>
                    </div>
                    <button className="zen-btn" style={{ width: '100%', marginTop: '6px' }} onClick={triggerReflectionCycle} disabled={isReflectionLoading}>
                      {isReflectionLoading ? 'Thinking...' : 'Execute Reflection Cycle'}
                    </button>
                  </div>
                  <div className="dashboard-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Developer Tools</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Show the simulation control deck for testing.</div>
                    </div>
                    <button className="zen-btn-outline" onClick={() => setShowSimPanel(prev => !prev)}>
                      {showSimPanel ? 'Hide Panel' : 'Show Panel'}
                    </button>
                  </div>

                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Pinned Input Bar — always at viewport bottom */}
          {activeTab === 'home' && (
            <div className="floating-prompt-bar-wrapper">
              <DynamicQuickActions 
                timeOfDay={timeOfDay}
                lastReplyText={desktopChatLogs.filter(l => l.sender === 'william').slice(-1)[0]?.text}
                onSelectPrompt={(p) => {
                  handleSendDesktopChat(undefined, p);
                }}
                isOpen={showQuickActions}
              />

              <form onSubmit={handleSendDesktopChat} className="floating-prompt-bar">
                {/* ⊕ expand button */}
                <button
                  type="button"
                  className={`input-expand-btn${showQuickActions ? ' active' : ''}`}
                  onClick={() => setShowQuickActions(prev => !prev)}
                  title="Toggle Dynamic Actions"
                >
                  ✦
                </button>
                <input
                  type="text"
                  className="floating-prompt-input"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={isStreaming ? 'William is thinking...' : 'Ask William anything, explore pathways...'}
                  disabled={isStreaming}
                  style={{ marginLeft: '10px' }}
                />

                {/* Voice button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsVoiceModalOpen(true);
                    voiceRecorder.resetTranscript();
                    voiceRecorder.startRecording();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#c084fc',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '4px'
                  }}
                  title="Voice Mode"
                >
                  <Mic size={16} />
                </button>

                <button
                  type="submit"
                  className="floating-prompt-send-btn"
                  disabled={!chatInput.trim() || isStreaming}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </form>
            </div>
          )}

        </main>

        {/* Simulation control deck — hidden by default, toggled in Settings */}
        {showSimPanel && renderFloatingSimulationPanel()}
      </div>
    );
  }

  return (
    <div className="zen-container" style={{ justifyContent: 'flex-start', minHeight: '100vh', paddingBottom: '80px' }}>
      
      {/* Immersive Focus Mode Fullscreen Overlay */}
      {isFocusMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1900, display: 'flex', flexDirection: 'column', background: '#0a0a0c' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', background: '#111115' }}>
            <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>Focus Mode</span>
            <button 
              className="zen-btn-outline" 
              style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: '16px' }}
              onClick={() => setIsFocusMode(false)}
            >
              Exit Focus Mode (Esc)
            </button>
          </header>
          <div style={{ flex: 1 }}>
            {worldModel ? (
              <CognitiveMap
                worldModel={worldModel}
                onRefresh={() => fetchJson('/api/world-model').then(d => d && setWorldModel(d))}
                onSaveNode={handleSaveNode}
                onSaveEdge={handleSaveEdge}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                <div className="breathing-assistant-orb" style={{ width: '80px', height: '80px' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading cognitive map…</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Actions Drawer */}
      <AnimatePresence>
        {isActionsOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1800, display: 'flex', justifyContent: 'flex-end', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={() => setIsActionsOpen(false)}>
            <motion.div
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                width: '100%', maxWidth: '380px', height: '100%', background: 'var(--bg-surface)',
                borderLeft: '1px solid var(--border-hairline)', padding: '32px 24px', display: 'flex',
                flexDirection: 'column', gap: '24px', boxShadow: '-10px 0 40px rgba(0,0,0,0.3)'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Companion Actions</span>
                <button className="zen-btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setIsActionsOpen(false)}>
                  Close
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, overflowY: 'auto' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 500, fontFamily: 'var(--font-serif)' }}>Actions Control</h3>
                
                {/* Task Creation Shortcut */}
                <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Quick Task Creation</span>
                  <input
                    type="text"
                    className="zen-input"
                    placeholder="Task title..."
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (!val.trim()) return;
                        await fetchJson('/api/actions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ type: 'create_task', title: val.trim(), payload: { title: val.trim() } })
                        });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Press Enter to save to Atlas / Action logs</span>
                </div>

                {/* Reminder Creation Shortcut */}
                <div className="dashboard-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Schedule Proactive Reminder</span>
                  <input
                    type="text"
                    className="zen-input"
                    placeholder="Reminder message..."
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (!val.trim()) return;
                        const trigger = new Date(Date.now() + 5000).toISOString(); // 5s from now for testing
                        await fetchJson('/api/actions', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            type: 'schedule_reminder',
                            title: `Reminder: ${val.trim()}`,
                            payload: { message: val.trim(), triggerTime: trigger }
                          })
                        });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Saves a due trigger in proactive_signals</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Real Voice Waveform Visualizer Modal */}
      <VoiceWaveformVisualizer 
        isOpen={isVoiceModalOpen}
        isRecording={voiceRecorder.isRecording}
        volume={voiceRecorder.volume}
        frequencies={voiceRecorder.frequencies}
        transcript={voiceRecorder.transcript}
        interimTranscript={voiceRecorder.interimTranscript}
        error={voiceRecorder.error}
        onClose={() => {
          voiceRecorder.stopRecording();
          setIsVoiceModalOpen(false);
        }}
        onSubmit={(text) => {
          voiceRecorder.stopRecording();
          setIsVoiceModalOpen(false);
          handleSendDesktopChat(undefined, text);
        }}
      />

      {/* Presence Signal Modal */}
      {presenceSignal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9,9,11,0.8)', backdropFilter: 'blur(10px)' }}>
          <div className="dashboard-card" style={{ width: '90%', maxWidth: '440px', padding: '32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--color-gold)', letterSpacing: '0.15em' }}>
              Companion Check-in
            </span>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-primary)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', lineHeight: 1.6 }}>
              "{presenceSignal.message}"
            </p>
            <button
              className="zen-btn"
              onClick={async () => {
                if (presenceSignal.signalId) {
                  await fetchJson('/api/presence/acknowledge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ signalId: presenceSignal.signalId })
                  });
                }
                setPresenceSignal(null);
              }}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* Nightly Reflection Overlay */}
      {reflectionOverlayText && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(9, 9, 11, 0.85)', backdropFilter: 'blur(12px)' }}>
          <div 
            style={{ 
              width: '90%', 
              maxWidth: '520px', 
              background: 'var(--bg-surface)', 
              border: '1px solid var(--border-hairline)', 
              borderRadius: '24px', 
              padding: '40px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              lineHeight: 1.8,
              fontFamily: 'Georgia, serif'
            }}
          >
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path></svg>
              <div style={{ marginTop: '16px' }}>
                <span className="zen-caption" style={{ textTransform: 'uppercase', letterSpacing: '0.15em' }}>Presence</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 300, color: 'var(--text-primary)', marginTop: '8px' }}>Nightly Self-Reflection</h3>
              </div>
            </div>
            <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', borderTop: '1px solid var(--border-hairline)', borderBottom: '1px solid var(--border-hairline)', padding: '24px 0' }}>
              "{reflectionOverlayText}"
            </p>
            <button 
              className="zen-btn" 
              style={{ width: '100%', padding: '14px 0', borderRadius: '12px', fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer' }} 
              onClick={() => setReflectionOverlayText(null)}
            >
              Step into Tomorrow
            </button>
          </div>
        </div>
      )}

      {/* Ambient glass glow */}
      <div 
        className="breathing-glow-mesh"
        style={{ 
          width: '600px', 
          height: '600px',
          background: 'var(--glow-color)'
        }}
      />

      <CommandPalette 
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onAction={handlePaletteAction}
      />

      {/* TOP DESKTOP HEADER BAR (ONLY IF NOT SIMULATING NATIVE FULLSCREEN MOBILE) */}
      <nav className={`zen-nav ${(deviceType as string) === 'desktop' ? 'desktop-wide' : ''}`}>
        <span className="zen-nav-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"></path><path d="M6 6h10"></path><path d="M6 10h10"></path></svg>
          <span style={{ fontWeight: 400, opacity: 0.6 }}>William /</span>
          <span style={{ fontWeight: 600 }}>{portrait.name || initialData.username}</span>
        </span>

        {(deviceType as string) === 'desktop' && (
          <div className="zen-nav-links">
            <button
              onClick={() => setIsActionsOpen(true)}
              className="zen-nav-link"
              style={{ background: 'none', border: 'none' }}
            >
              Actions
            </button>
          </div>
        )}
      </nav>

      {/* RENDER DUAL LAYOUT: DESKTOP OR MOBILE FRAME */}
      <div className={`zen-content ${(deviceType as string) === 'desktop' ? 'desktop-wide' : ''}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <AnimatePresence mode="wait">

          
          {/* ==================== 1. DESKTOP VIEW ==================== */}
          {(deviceType as string) === 'desktop' && (
            <motion.div
              key="desktop-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '32px' }}
            >
              
              {/* Tab: Study (Home) */}
              {activeTab === 'home' && (
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  
                  {/* Left Column: Welcome & Chat */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%' }}>
                    {/* Literary Room Welcome */}
                    {!isReflecting && (
                      <div 
                        style={{ 
                          padding: '40px', 
                          border: '1px solid var(--border-hairline)', 
                          borderRadius: '16px', 
                          background: 'var(--bg-surface)',
                          boxShadow: 'var(--shadow-subtle)',
                          lineHeight: 1.8,
                          fontFamily: 'serif'
                        }}
                      >
                        <h3 style={{ fontSize: '1.625rem', fontWeight: 300, color: 'var(--text-primary)', marginBottom: '20px' }}>
                          Good {simTimeOfDay === 'morning' ? 'Morning' : simTimeOfDay === 'afternoon' ? 'Afternoon' : 'Evening'}, {portrait.name || 'Friend'}.
                        </h3>
                        
                        {simPeriod === 'longterm' && (
                          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                            You've grown in patience this month. Your work on {portrait.dreams || 'Atlas'} is beginning to compound. 
                            You seem mentally exhausted.
                          </p>
                        )}
                        {simPeriod === 'firstweek' && (
                          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                            We are gathering observations. One thoughtful inquiry a day will establish our baseline. 
                            Do not force productivity; seek to understand constraints.
                          </p>
                        )}
                        {simPeriod === 'day1' && (
                          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                            Welcome to your study. I have been keeping your place, waiting to continue the conversation about your life.
                          </p>
                        )}

                        <p style={{ fontSize: '1.125rem', color: 'var(--text-primary)', marginTop: '24px', fontWeight: 500 }}>
                          Would you like to reflect, continue yesterday's conversation, or simply talk?
                        </p>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                          <button className="zen-btn" onClick={() => setIsReflecting(true)}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path></svg>
                            Reflect
                          </button>
                          <button className="zen-btn-outline" onClick={() => {
                            const chatSection = document.getElementById('strategic-chat');
                            chatSection?.scrollIntoView({ behavior: 'smooth' });
                          }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                            Continue Yesterday's Conversation
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Evening reflection interactive block */}
                    {isReflecting && (
                      <motion.div
                        initial={{ scale: 0.98, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{ 
                          padding: '32px', 
                          border: '1px solid var(--border-hairline)', 
                          borderRadius: '16px', 
                          background: 'var(--bg-surface)', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '24px' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Evening Strategy Reflection</span>
                          <button className="zen-btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setIsReflecting(false)}>
                            Close
                          </button>
                        </div>

                        <form onSubmit={handleReflectionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {reflectionStep === 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>What surprised you today?</span>
                              <input 
                                type="text" 
                                className="zen-input" 
                                value={eveningSurprise} 
                                onChange={(e) => setEveningSurprise(e.target.value)} 
                                placeholder="e.g. Atlas architecture compiled on first attempt"
                                autoFocus 
                              />
                              <button type="button" className="zen-btn" style={{ marginTop: '12px' }} onClick={() => setReflectionStep(1)} disabled={!eveningSurprise.trim()}>
                                Next Question
                              </button>
                            </div>
                          )}

                          {reflectionStep === 1 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>What burden felt lighter?</span>
                              <input 
                                type="text" 
                                className="zen-input" 
                                value={eveningBurden} 
                                onChange={(e) => setEveningBurden(e.target.value)} 
                                placeholder="e.g. Delegating deployment steps"
                                autoFocus 
                              />
                              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" className="zen-btn-outline" onClick={() => setReflectionStep(0)}>Back</button>
                                <button type="button" className="zen-btn" onClick={() => setReflectionStep(2)} disabled={!eveningBurden.trim()}>Next Question</button>
                              </div>
                            </div>
                          )}

                          {reflectionStep === 2 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>Did your actions resemble the person you're becoming?</span>
                              <input 
                                type="text" 
                                className="zen-input" 
                                value={eveningAlign} 
                                onChange={(e) => setEveningAlign(e.target.value)} 
                                placeholder="e.g. Yes, maintained calm deep-work session"
                                autoFocus 
                              />
                              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" className="zen-btn-outline" onClick={() => setReflectionStep(1)}>Back</button>
                                <button type="button" className="zen-btn" onClick={() => setReflectionStep(3)} disabled={!eveningAlign.trim()}>Next Question</button>
                              </div>
                            </div>
                          )}

                          {reflectionStep === 3 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <span style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>What deserves remembering?</span>
                              <input 
                                type="text" 
                                className="zen-input" 
                                value={eveningRemember} 
                                onChange={(e) => setEveningRemember(e.target.value)} 
                                placeholder="e.g. Quality of focus shapes the entire week"
                                autoFocus 
                              />
                              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button type="button" className="zen-btn-outline" onClick={() => setReflectionStep(2)}>Back</button>
                                <button type="submit" className="zen-btn" disabled={!eveningRemember.trim()}>Submit Reflection</button>
                              </div>
                            </div>
                          )}
                        </form>
                      </motion.div>
                    )}

                    {/* Strategic Chat Interface (the Heart of William) */}
                    <div id="strategic-chat" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span className="zen-caption">Strategic Dialogue</span>
                        <h4 style={{ fontSize: '1.25rem', fontWeight: 400 }}>Conversations</h4>
                      </div>

                      <div 
                        style={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          minHeight: '600px',
                          flex: 1
                        }}
                      >
                        {/* Log feed */}
                        <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          {desktopChatLogs.map((msg) => {
                            const isWilliam = msg.sender === 'william';
                            return (
                              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isWilliam ? 'flex-start' : 'flex-end' }}>
                                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                  {isWilliam ? 'William' : 'You'} • {msg.time}
                                </span>
                                <div 
                                  style={{ 
                                    color: 'var(--text-primary)', 
                                    maxWidth: '85%',
                                    lineHeight: 1.6,
                                    background: isWilliam ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                                    backdropFilter: isWilliam ? 'blur(12px)' : 'none',
                                    border: isWilliam ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                                    padding: isWilliam ? '20px 24px' : '0',
                                    borderRadius: '16px',
                                    fontFamily: isWilliam ? 'var(--font-sans)' : 'var(--font-serif)',
                                    fontSize: isWilliam ? '0.9375rem' : '1.35rem',
                                    boxShadow: isWilliam ? '0 4px 20px rgba(0,0,0,0.2)' : 'none'
                                  }}
                                >
                                  {msg.text}
                                  {msg.cardPayload && (
                                    <GenerativeCard 
                                      payload={msg.cardPayload} 
                                      onToggleMilestone={handleToggleMilestone} 
                                      onToggleTask={handleToggleMobileTask} 
                                    />
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Streaming bubble */}
                          {isStreaming && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginBottom: '4px' }}>William • now</span>
                              <div style={{ 
                                color: 'var(--text-primary)', maxWidth: '85%', lineHeight: 1.6,
                                background: 'rgba(255, 255, 255, 0.03)', padding: '20px 24px', borderRadius: '16px',
                                fontSize: '0.9375rem', fontFamily: 'var(--font-sans)',
                                backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.05)',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                              }}>
                                {streamingText || <span style={{ opacity: 0.5 }}>thinking…</span>}
                                <span style={{ animation: 'cursor-blink 1s steps(1) infinite', marginLeft: '2px' }}>|</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Textbox input with Dynamic Quick Actions and Voice Button */}
                        <div style={{
                          position: 'fixed', bottom: '32px', left: '50%', transform: 'translateX(-50%)',
                          width: '90%', maxWidth: '640px', zIndex: 100,
                          display: 'flex', flexDirection: 'column', alignItems: 'center'
                        }}>
                          <DynamicQuickActions 
                            timeOfDay={timeOfDay}
                            lastReplyText={desktopChatLogs.filter(l => l.sender === 'william').slice(-1)[0]?.text}
                            onSelectPrompt={(p) => {
                              handleSendDesktopChat(undefined, p);
                            }}
                            isOpen={showQuickActions}
                          />

                          <form onSubmit={handleSendDesktopChat} style={{ 
                            width: '100%',
                            background: 'rgba(20, 20, 25, 0.85)', backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.08)', borderRadius: '32px',
                            padding: '10px 18px', display: 'flex', gap: '10px', alignItems: 'center',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                          }}>
                            {/* Expand quick actions button */}
                            <button
                              type="button"
                              onClick={() => setShowQuickActions(prev => !prev)}
                              style={{
                                background: showQuickActions ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '50%',
                                width: '34px',
                                height: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'rgba(255,255,255,0.8)',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                transition: 'all 0.2s ease',
                                flexShrink: 0
                              }}
                              title="Toggle Suggestion Chips"
                            >
                              ✦
                            </button>

                            <input
                              type="text"
                              className="zen-input"
                              value={chatInput}
                              onChange={(e) => setChatInput(e.target.value)}
                              placeholder={isStreaming ? 'William is thinking...' : 'Simply talk, explore systems, or summon knowledge...'}
                              style={{ border: 'none', borderBottom: 'none', flex: 1, padding: '6px 4px', fontSize: '0.9375rem' }}
                              disabled={isStreaming}
                            />

                            {/* Voice button */}
                            <button
                              type="button"
                              onClick={() => {
                                setIsVoiceModalOpen(true);
                                voiceRecorder.resetTranscript();
                                voiceRecorder.startRecording();
                              }}
                              style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderRadius: '50%',
                                width: '34px',
                                height: '34px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#c084fc',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.2s ease'
                              }}
                              title="Start Voice Session"
                            >
                              <Mic size={16} />
                            </button>

                            <button className="zen-btn" type="submit" disabled={!chatInput.trim() || isStreaming} style={{ borderRadius: '20px', padding: '8px 18px' }}>
                              {isStreaming ? '...' : 'Send'}
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Portrait Biography */}
              {activeTab === 'portrait' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="zen-caption">A biography writing itself</span>
                    <h2 className="zen-title">The Living Portrait</h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                    
                    {/* Identity Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: highlightedCategory === 'identity' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)', borderRadius: '12px', transition: 'all 0.3s ease' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Identity</span>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 300, marginTop: '8px', fontFamily: 'var(--font-cursive)' }}>
                        "{portrait.identity}"
                      </h4>
                    </div>

                    {/* Values Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: highlightedCategory === 'values' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)', borderRadius: '12px', transition: 'all 0.3s ease' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Values</span>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {portrait.values}
                      </p>
                    </div>

                    {/* Principles Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: highlightedCategory === 'principles' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)', borderRadius: '12px', transition: 'all 0.3s ease' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Principles</span>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                        "{portrait.principles}"
                      </p>
                    </div>

                    {/* Strengths Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: highlightedCategory === 'strengths' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)', borderRadius: '12px', transition: 'all 0.3s ease' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Strengths</span>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {portrait.strengths}
                      </p>
                    </div>

                    {/* Blind Spots Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: highlightedCategory === 'blind_spots' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)', borderRadius: '12px', transition: 'all 0.3s ease' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Blind Spots & Fears</span>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {portrait.blind_spots}
                      </p>
                    </div>

                    {/* Dreams Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: highlightedCategory === 'dreams' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)', borderRadius: '12px', transition: 'all 0.3s ease' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Dreams & Builds</span>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {portrait.dreams}
                      </p>
                    </div>

                    {/* Relationships Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: highlightedCategory === 'relationships' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)', borderRadius: '12px', transition: 'all 0.3s ease' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Relationships</span>
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                        {portrait.relationships}
                      </p>
                    </div>

                    {/* Decision Patterns Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: highlightedCategory === 'decision_patterns' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)', borderRadius: '12px', transition: 'all 0.3s ease', gridColumn: '1 / -1' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Decision Patterns</span>
                      <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {portrait.decision_patterns.map((item, idx) => (
                          <li key={idx} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            • {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Biography Growth entries */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: highlightedCategory === 'growth' ? '1px solid var(--accent-color)' : '1px solid var(--border-hairline)', borderRadius: '12px', transition: 'all 0.3s ease', gridColumn: '1 / -1' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>Growth Milestones Log</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {portrait.growth.map((logItem, idx) => (
                          <div key={idx} style={{ fontSize: '0.875rem', borderLeft: '2px solid var(--border-hairline)', paddingLeft: '12px', color: 'var(--text-secondary)' }}>
                            {logItem}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cognitive Profile Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: '12px', gridColumn: '1 / -1' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase', color: 'var(--text-primary)', opacity: 0.8 }}>Theory of Mind — Cognitive Profile</span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '16px' }}>
                        <div>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Problem Solving Heuristic</span>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {portrait.cognitiveProfile?.problemSolvingStyle || 'Loading heuristics...'}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Temporal Estimation Bias</span>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {portrait.cognitiveProfile?.temporalBias || 'Loading bias...'}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Attention & Fatigue Limits</span>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {portrait.cognitiveProfile?.attentionSpan || 'Loading limits...'}
                          </p>
                        </div>
                        <div>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Decision Heuristics</span>
                          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {portrait.cognitiveProfile?.decisionHeuristics || 'Loading heuristics...'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Active Beliefs Card */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: '12px', gridColumn: '1 / -1' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase', color: 'var(--text-primary)', opacity: 0.8 }}>Active Belief System</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                        {(portrait.activeBeliefs || []).map((item, idx) => (
                          <div key={idx} style={{ borderLeft: '3px solid var(--border-hairline)', paddingLeft: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                                {item.belief}
                              </span>
                              <span style={{ fontSize: '0.6875rem', background: 'var(--focus-glow)', border: '1px solid var(--border-hairline)', padding: '2px 8px', borderRadius: '12px' }}>
                                Strength: {Math.round(item.strength * 100)}%
                              </span>
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Evolution: {item.evolution} (last verified: {item.lastTested})
                            </p>
                          </div>
                        ))}
                        {(!portrait.activeBeliefs || portrait.activeBeliefs.length === 0) && (
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No active beliefs tracked yet. Run a reflection cycle to populate.</span>
                        )}
                      </div>
                    </div>

                    {/* The Chronicle (Timeline of Life) */}
                    <div style={{ padding: '24px', background: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: '12px', gridColumn: '1 / -1' }}>
                      <span className="zen-caption" style={{ textTransform: 'uppercase' }}>The Chronicle (Timeline of Life)</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                        {historyLogs.map((logItem) => (
                          <div key={logItem.id} style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', borderLeft: '2px solid var(--border-hairline)', paddingLeft: '12px', color: 'var(--text-secondary)' }}>
                            <span style={{ color: 'var(--text-muted)', width: '70px', flexShrink: 0 }}>{logItem.time}</span>
                            <span>{logItem.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* Tab: Journeys */}
              {activeTab === 'journeys' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="zen-caption">Commitments & Pathways</span>
                    <h2 className="zen-title">Your Journeys</h2>
                  </div>

                  <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
                    {journeys.map((j) => (
                      <button
                        key={j.id}
                        onClick={() => setSelectedJourneyId(j.id)}
                        className={`zen-btn-outline ${selectedJourneyId === j.id ? 'selected' : ''}`}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '24px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          borderColor: selectedJourneyId === j.id ? 'var(--text-primary)' : 'var(--border-hairline)'
                        }}
                      >
                        <span>{j.icon}</span>
                        <span>{j.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* Journey Expanded Detail */}
                  {(() => {
                    const activeJourney = journeys.find(j => j.id === selectedJourneyId);
                    if (!activeJourney) return null;

                    return (
                      <div 
                        style={{ 
                          padding: '32px', 
                          border: '1px solid var(--border-hairline)', 
                          borderRadius: '16px', 
                          background: 'var(--bg-surface)', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          gap: '24px' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '1.5rem', fontWeight: 300, display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span>{activeJourney.icon}</span>
                            <span>{activeJourney.title}</span>
                          </h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="zen-caption">Progress:</span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{activeJourney.progress}%</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ width: '100%', height: '4px', background: 'var(--border-hairline)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${activeJourney.progress}%`, height: '100%', background: 'var(--text-primary)' }} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
                          <div>
                            <span className="zen-caption">Current State</span>
                            <p style={{ fontSize: '0.9375rem', marginTop: '6px', color: 'var(--text-secondary)' }}>{activeJourney.currentState}</p>
                          </div>
                          <div>
                            <span className="zen-caption">Vision</span>
                            <p style={{ fontSize: '0.9375rem', marginTop: '6px', color: 'var(--text-secondary)' }}>{activeJourney.vision}</p>
                          </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-hairline)' }} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                          <div>
                            <span className="zen-caption">Milestones</span>
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {activeJourney.milestones.map((m, idx) => (
                                <li key={idx} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', textDecoration: m.completed ? 'line-through' : 'none' }}>
                                  {m.completed ? '✓' : '•'} {m.text}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="zen-caption">Lessons Learnt</span>
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {activeJourney.lessons.map((l, idx) => (
                                <li key={idx} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>• {l}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        <hr style={{ border: 'none', borderTop: '1px solid var(--border-hairline)' }} />

                        <div>
                          <span className="zen-caption">Journey Timeline log</span>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
                            {activeJourney.timeline.map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', gap: '16px', fontSize: '0.875rem' }}>
                                <span style={{ color: 'var(--text-muted)', width: '60px', flexShrink: 0 }}>{item.date}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>{item.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab: Library */}
              {activeTab === 'library' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="zen-caption">Acquired wisdom, notes & quotes</span>
                    <h2 className="zen-title">The Library</h2>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {library.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedLibraryItem(item)}
                        style={{
                          padding: '20px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          boxShadow: 'var(--shadow-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="zen-caption" style={{ textTransform: 'uppercase', fontSize: '0.625rem' }}>
                            {item.type}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{item.dateAdded}</span>
                        </div>
                        <h4 style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                          {item.title}
                        </h4>
                        {item.author && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>By {item.author}</span>}
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          "{item.content}"
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Detail Overlay Modal */}
                  {selectedLibraryItem && (
                    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                      <div 
                        style={{ 
                          width: '90%', 
                          maxWidth: '480px', 
                          background: 'var(--bg-surface)', 
                          border: '1px solid var(--border-hairline)', 
                          borderRadius: '16px', 
                          padding: '32px',
                          boxShadow: 'var(--shadow-subtle)' 
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignSelf: 'stretch', marginBottom: '16px' }}>
                          <span className="zen-caption" style={{ textTransform: 'uppercase' }}>{selectedLibraryItem.type}</span>
                          <button className="zen-btn-outline" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => setSelectedLibraryItem(null)}>
                            Close
                          </button>
                        </div>
                        <h3 style={{ fontSize: '1.375rem', fontWeight: 400, marginBottom: '4px' }}>{selectedLibraryItem.title}</h3>
                        {selectedLibraryItem.author && <h5 style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>By {selectedLibraryItem.author}</h5>}
                        <p style={{ fontSize: '1rem', color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.6, padding: '16px 0', borderTop: '1px solid var(--border-hairline)', borderBottom: '1px solid var(--border-hairline)', marginBottom: '16px' }}>
                          "{selectedLibraryItem.content}"
                        </p>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {selectedLibraryItem.tags.map(t => (
                            <span key={t} style={{ fontSize: '0.6875rem', background: 'var(--focus-glow)', border: '1px solid var(--border-hairline)', padding: '2px 8px', borderRadius: '12px' }}>
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* Tab: Settings */}
              {activeTab === 'settings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="zen-caption">Configurations</span>
                    <h2 className="zen-title">Settings</h2>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Dark Theme</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Toggle matte carbon layout.</div>
                      </div>
                      <label className="ios-switch" style={{ width: '42px', height: '24px' }}>
                        <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
                        <span className="ios-slider-toggle" style={{ borderRadius: '24px' }}></span>
                      </label>
                    </div>

                    {/* Observer Sync */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Observer Sync (Integrations)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simulate fetching commits or notes to update Portrait.</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button className="zen-btn-outline" style={{ flex: 1, padding: '8px 16px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => triggerObserverSync('github')}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
                          Sync GitHub Commits
                        </button>
                        <button className="zen-btn-outline" style={{ flex: 1, padding: '8px 16px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => triggerObserverSync('notion')}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                          Sync Notion Pages
                        </button>
                      </div>
                    </div>

                    {/* Reflection Engine */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--border-hairline)', paddingBottom: '16px' }}>
                      <div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 500 }}>Reflection Engine (Nightly Cycle)</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Simulate William's nightly self-reflection. William will analyze today's logs and synthesize new understandings to evolve your Portrait.</div>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                        <button 
                          className="zen-btn" 
                          style={{ flex: 1, padding: '8px 16px', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} 
                          onClick={triggerReflectionCycle}
                          disabled={isReflectionLoading}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                          {isReflectionLoading ? 'Thinking...' : 'Execute Reflection Cycle'}
                        </button>
                      </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                      <button className="zen-btn-outline" onClick={onReset} style={{ color: '#ef4444', borderColor: '#fca5a5', width: '100%' }}>
                        Reset Companion Study
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          )}

          {/* ==================== 2. MOBILE VIEW (COMPANION FRAME) ==================== */}
          {deviceType === 'mobile' && (
            <motion.div
              key="mobile-panel"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                width: '320px',
                height: '620px',
                border: '12px solid #27272a',
                borderRadius: '40px',
                background: '#09090b',
                color: '#f4f4f5',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 50px rgba(0,0,0,0.6)'
              }}
            >
              
              {/* Phone Status bar mock */}
              <div style={{ height: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', fontSize: '0.6875rem', opacity: 0.6, borderBottom: '1px solid #18181b' }}>
                <span>02:30 PM</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span>📶</span>
                  <span>🔋 94%</span>
                </div>
              </div>

              {/* Phone Content Screen */}
              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '70px' }}>
                
                {/* 1. Mobile Screen: Today (Home) */}
                {mobileTab === 'today' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#a1a1aa' }}>Good afternoon.</span>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: 300 }}>What's on your mind?</h3>
                    </div>

                    {/* 3 Giant Action Capture Buttons */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        onClick={() => setMobileCaptureType('speak')} 
                        style={{ flex: 1, height: '72px', background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#ffffff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <span style={{ fontSize: '1.375rem' }}>🎤</span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>Speak</span>
                      </button>
                      <button 
                        onClick={() => setMobileCaptureType('write')} 
                        style={{ flex: 1, height: '72px', background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#ffffff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <span style={{ fontSize: '1.375rem' }}>⌨️</span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>Write</span>
                      </button>
                      <button 
                        onClick={() => setMobileCaptureType('capture')} 
                        style={{ flex: 1, height: '72px', background: '#18181b', border: '1px solid #27272a', borderRadius: '12px', color: '#ffffff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        <span style={{ fontSize: '1.375rem' }}>📷</span>
                        <span style={{ fontSize: '0.6875rem', fontWeight: 500 }}>Capture</span>
                      </button>
                    </div>

                    {/* Today's Focus Checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                      <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#a1a1aa' }}>Today's Focus</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {mobileTasks.map(task => (
                          <div 
                            key={task.id} 
                            onClick={() => handleToggleMobileTask(task.id)}
                            style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem', cursor: 'pointer', opacity: task.completed ? 0.4 : 1 }}
                          >
                            <div style={{ width: '16px', height: '16px', border: '1px solid #27272a', borderRadius: '4px', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', fontSize: '10px', background: task.completed ? '#ffffff' : 'transparent', color: '#09090b' }}>
                              {task.completed && '✓'}
                            </div>
                            <span style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>{task.text}</span>
                          </div>
                        ))}
                      </div>

                      {/* Add Focus task */}
                      <form onSubmit={handleAddMobileTask} style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                        <input
                          type="text"
                          value={newMobileTaskText}
                          onChange={(e) => setNewMobileTaskText(e.target.value)}
                          placeholder="Add focus item..."
                          style={{ background: 'transparent', border: 'none', borderBottom: '1px solid #27272a', color: '#ffffff', fontSize: '0.8125rem', padding: '4px 0', flex: 1, outline: 'none' }}
                        />
                        <button type="submit" style={{ background: '#ffffff', color: '#09090b', border: 'none', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}>
                          Add
                        </button>
                      </form>
                    </div>

                  </div>
                )}

                {/* 2. Mobile Screen: Chat with William */}
                {mobileTab === 'chat' && (
                  <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
                    <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#a1a1aa' }}>Conversation with William</span>
                    
                    {/* Log window */}
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '360px', paddingRight: '4px' }}>
                      {mobileChatLogs.map(msg => (
                        <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'william' ? 'flex-start' : 'flex-end' }}>
                          <span style={{ fontSize: '0.625rem', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>{msg.sender === 'william' ? 'William' : 'You'}</span>
                          <div 
                            style={{ 
                              lineHeight: 1.5, 
                              color: '#f4f4f5', 
                              background: msg.sender === 'william' ? 'rgba(255,255,255,0.04)' : 'transparent',
                              backdropFilter: msg.sender === 'william' ? 'blur(12px)' : 'none',
                              border: msg.sender === 'william' ? '1px solid rgba(255,255,255,0.06)' : 'none',
                              padding: msg.sender === 'william' ? '10px 14px' : '0',
                              borderRadius: '12px',
                              fontFamily: msg.sender === 'william' ? 'var(--font-sans)' : 'var(--font-serif)',
                              fontSize: msg.sender === 'william' ? '0.8125rem' : '1.05rem',
                              boxShadow: msg.sender === 'william' ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                            }}
                          >
                            {msg.text}
                            {msg.cardPayload && (
                              <GenerativeCard 
                                payload={msg.cardPayload} 
                                onToggleMilestone={handleToggleMilestone} 
                                onToggleTask={handleToggleMobileTask} 
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input box */}
                    <form onSubmit={handleSendMobileChat} style={{ 
                      display: 'flex', gap: '8px',
                      background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px',
                      padding: '8px 12px', marginTop: '8px'
                    }}>
                      <input
                        type="text"
                        placeholder="Say anything..."
                        value={mobileChatInput}
                        onChange={(e) => setMobileChatInput(e.target.value)}
                        style={{ background: 'transparent', border: 'none', color: '#ffffff', fontSize: '0.8125rem', outline: 'none', flex: 1 }}
                      />
                      <button type="submit" style={{ background: '#ffffff', color: '#09090b', border: 'none', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                        ↑
                      </button>
                    </form>
                  </div>
                )}

                {/* 3. Mobile Screen: Journey tracks */}
                {mobileTab === 'journey' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#a1a1aa' }}>Active Journeys</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {journeys.map(j => (
                        <div key={j.id} style={{ padding: '12px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem' }}>{j.icon}</span>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>{j.title}</span>
                              <span style={{ fontSize: '0.625rem', color: '#a1a1aa' }}>{j.currentState.substring(0, 30)}...</span>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{j.progress}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Mobile Screen: Portrait */}
                {mobileTab === 'portrait' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#a1a1aa' }}>Biography Draft</span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ padding: '12px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.625rem', color: '#71717a', textTransform: 'uppercase' }}>Identity</span>
                        <p style={{ fontFamily: 'var(--font-cursive)', marginTop: '4px', fontSize: '1rem' }}>"{portrait.identity}"</p>
                      </div>
                      <div style={{ padding: '12px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.625rem', color: '#71717a', textTransform: 'uppercase' }}>Principles</span>
                        <p style={{ fontSize: '0.8125rem', marginTop: '4px' }}>{portrait.principles}</p>
                      </div>
                      <div style={{ padding: '12px', background: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.625rem', color: '#71717a', textTransform: 'uppercase' }}>Struggles & Burdens</span>
                        <p style={{ fontSize: '0.8125rem', marginTop: '4px', fontStyle: 'italic' }}>{portrait.blind_spots}</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Mobile Overlay capture views */}
              {mobileCaptureType !== null && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(9,9,11,0.95)', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '20px' }}>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#71717a', textAlign: 'center' }}>
                    {mobileCaptureType === 'speak' ? 'Speech Capture' : mobileCaptureType === 'capture' ? 'Camera Capture' : 'Quick Capture'}
                  </span>

                  {mobileCaptureType === 'speak' && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      {/* Simulating pulsing voice waveform */}
                      <div style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'center' }}>
                        {[...Array(6)].map((_, i) => (
                          <motion.div 
                            key={i}
                            animate={{ height: simWavePulse ? [10, 36, 10] : [10, 15, 10] }}
                            transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                            style={{ width: '4px', background: '#ffffff', borderRadius: '2px' }}
                          />
                        ))}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>William is listening...</span>
                    </div>
                  )}

                  {mobileCaptureType === 'capture' && (
                    <div style={{ width: '100%', height: '140px', border: '1px dashed #27272a', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#18181b' }}>
                      <span style={{ fontSize: '1.75rem' }}>📷</span>
                      <span style={{ fontSize: '0.6875rem', color: '#a1a1aa' }}>Pulsing camera frame overlay</span>
                    </div>
                  )}

                  <textarea
                    rows={3}
                    style={{ background: 'transparent', border: '1px solid #27272a', borderRadius: '8px', color: '#ffffff', padding: '10px', outline: 'none', resize: 'none', fontSize: '0.8125rem' }}
                    placeholder={
                      mobileCaptureType === 'speak' 
                        ? "Transcribed thought will appear here..." 
                        : mobileCaptureType === 'capture'
                        ? "Describe this photo captured..."
                        : "Write down your immediate thought or feeling..."
                    }
                    value={captureInputText}
                    onChange={(e) => setCaptureInputText(e.target.value)}
                  />

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => { setMobileCaptureType(null); setCaptureInputText(''); }} style={{ flex: 1, padding: '8px 0', background: 'transparent', border: '1px solid #27272a', borderRadius: '6px', color: '#ffffff', cursor: 'pointer', fontSize: '0.75rem' }}>
                      Cancel
                    </button>
                    <button onClick={handleMobileCaptureSave} disabled={!captureInputText.trim()} style={{ flex: 1, padding: '8px 0', background: '#ffffff', border: 'none', borderRadius: '6px', color: '#09090b', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>
                      Store
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Navigation Mock */}
              <div style={{ position: 'absolute', bottom: 0, insetInline: 0, height: 54, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', zIndex: 10 }}>
                <button onClick={() => setMobileTab('chat')} style={{ flex: 1, background: 'transparent', border: 'none', color: mobileTab === 'chat' ? '#ffffff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <MessageSquare size={16} />
                  <span style={{ fontSize: '0.5625rem' }}>William</span>
                </button>
                <button onClick={() => setMobileTab('journey')} style={{ flex: 1, background: 'transparent', border: 'none', color: mobileTab === 'journey' ? '#ffffff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <Compass size={16} />
                  <span style={{ fontSize: '0.5625rem' }}>Journey</span>
                </button>
                <button onClick={() => setMobileTab('portrait')} style={{ flex: 1, background: 'transparent', border: 'none', color: mobileTab === 'portrait' ? '#ffffff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <BookOpen size={16} />
                  <span style={{ fontSize: '0.5625rem' }}>Portrait</span>
                </button>
                <button onClick={() => setMobileTab('today')} style={{ flex: 1, background: 'transparent', border: 'none', color: mobileTab === 'today' ? '#ffffff' : 'rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
                  <Zap size={16} />
                  <span style={{ fontSize: '0.5625rem' }}>Today</span>
                </button>
              </div>


            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Floating Simulation Panel widget (Demonstrator widget) */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 500,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-hairline)',
          borderRadius: '16px',
          padding: '16px',
          boxShadow: 'var(--shadow-subtle)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          maxWidth: '300px',
          backdropFilter: 'blur(10px)'
        }}
      >
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          Simulation Dashboard
        </span>

        {/* Device toggle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Choose Interface Perspective:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              onClick={() => setDeviceType('desktop')}
              style={{
                flex: 1,
                fontSize: '0.6875rem',
                padding: '6px 0',
                borderRadius: '4px',
                border: '1px solid var(--border-hairline)',
                background: (deviceType as string) === 'desktop' ? 'var(--text-primary)' : 'transparent',
                color: (deviceType as string) === 'desktop' ? 'var(--bg-surface)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              Desktop Study
            </button>
            <button
              onClick={() => setDeviceType('mobile')}
              style={{
                flex: 1,
                fontSize: '0.6875rem',
                padding: '6px 0',
                borderRadius: '4px',
                border: '1px solid var(--border-hairline)',
                background: (deviceType as string) === 'mobile' ? 'var(--text-primary)' : 'transparent',
                color: (deviceType as string) === 'mobile' ? 'var(--bg-surface)' : 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
              Mobile Walk
            </button></div>
        </div>

        {/* Time of Day Control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Simulate Time of Day:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['morning', 'afternoon', 'evening'] as const).map(t => (
              <button
                key={t}
                onClick={() => setSimTimeOfDay(t)}
                style={{
                  flex: 1,
                  fontSize: '0.625rem',
                  padding: '4px 0',
                  borderRadius: '4px',
                  border: '1px solid var(--border-hairline)',
                  background: simTimeOfDay === t ? 'var(--text-primary)' : 'transparent',
                  color: simTimeOfDay === t ? 'var(--bg-surface)' : 'var(--text-primary)',
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Period control */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>Choose Chronological Stage:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['day1', 'firstweek', 'longterm'] as const).map(p => (
              <button
                key={p}
                onClick={() => setSimPeriod(p)}
                style={{
                  flex: 1,
                  fontSize: '0.625rem',
                  padding: '4px 0',
                  borderRadius: '4px',
                  border: '1px solid var(--border-hairline)',
                  background: simPeriod === p ? 'var(--text-primary)' : 'transparent',
                  color: simPeriod === p ? 'var(--bg-surface)' : 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                {p === 'day1' ? 'Day 1' : p === 'firstweek' ? 'Week 1' : '6 Months'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-hairline)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
          <span>Shortcut keys:</span>
          <span>[D] Desktop • [M] Mobile</span>
        </div>
      </div>

    </div>
  );
};
