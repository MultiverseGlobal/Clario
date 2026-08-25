'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuroraHeader } from '@/components/AuroraHeader';
import { AppSidebar } from '@/components/AppSidebar';
import { CompanionView } from '@/components/CompanionView';
import { SplashScreen } from '@/components/SplashScreen';
import { VoiceWaveformVisualizer } from '@/components/VoiceWaveformVisualizer';
import { useVoiceRecorder } from '@/lib/useVoiceRecorder';
import { PortraitView } from '@/components/PortraitView';
import { JourneysView } from '@/components/JourneysView';
import { LibraryView } from '@/components/LibraryView';
import { WorldView } from '@/components/WorldView';
import { SettingsView } from '@/components/SettingsView';
import { FocusMode } from '@/components/FocusMode';
import { AiOrb } from '@/components/AiOrb';
import { PipelineView } from '@/components/PipelineView';
import { UpcomingSchedule } from '@/components/widgets/UpcomingSchedule';
import { AiInsights } from '@/components/widgets/AiInsights';
import { VacationEligibility } from '@/components/widgets/VacationEligibility';
import { WeatherWidget } from '@/components/widgets/WeatherWidget';
import { PromptInputModal } from '@/components/PromptInputModal';
import { ProactiveToast, ProactiveSignalPayload } from '@/components/widgets/ProactiveToast';
import { Sparkle, MagnifyingGlass, House } from '@phosphor-icons/react';
import { useWebRTC } from '@/lib/webrtc';

import type {
  Portrait,
  Journey,
  LibraryItem,
  ChatMessage,
  WorldModel,
  ScheduleItem,
  AiInsight,
  VacationMetrics,
  WeatherData,
} from '@/lib/types';
import {
  getPortrait,
  getJourneys,
  getLibrary,
  getChats,
  getWorldModel,
  saveChat,
  getScheduleItems,
  saveScheduleItem,
  toggleScheduleItem,
  getAiInsights,
  getVacationMetrics,
  getWeatherData,
} from '@/lib/db';

export type NavTab = 'dashboard' | 'pipeline' | 'companion' | 'portrait' | 'journeys' | 'library' | 'world' | 'settings';

export default function Home() {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [activeTab, setActiveTab] = useState<NavTab>('companion');
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isFocusOpen, setIsFocusOpen] = useState<boolean>(false);
  const [orbExpression, setOrbExpression] = useState<'idle' | 'listening' | 'happy' | 'thinking'>('idle');
  const [showSplash, setShowSplash] = useState(true);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);

  const voiceRecorder = useVoiceRecorder();

  // WebRTC Voice State
  const webrtc = useWebRTC();

  useEffect(() => {
    webrtc.setOnTranscript((text, role) => {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const msg: ChatMessage = {
        id: `${role}_${Date.now()}`,
        sender: role === 'user' ? 'user' : 'william',
        text,
        time,
      };
      setMessages((prev) => [...prev, msg]);
      saveChat(msg).catch(() => { });

      if (role === 'user') {
        setActiveQuery(text);
      }
    });
  }, [webrtc]);

  // Supabase Data State
  const [isLoading, setIsLoading] = useState(true);
  const [portrait, setPortrait] = useState<Portrait | null>(null);
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [worldModel, setWorldModel] = useState<WorldModel | null>(null);

  // Widget States
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);
  const [aiInsights, setAiInsights] = useState<AiInsight[]>([]);
  const [vacationMetrics, setVacationMetrics] = useState<VacationMetrics | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, j, l, c, w, sched, ins, vac, weath] = await Promise.all([
        getPortrait(),
        getJourneys(),
        getLibrary(),
        getChats(),
        getWorldModel(),
        getScheduleItems(),
        getAiInsights(),
        getVacationMetrics(),
        getWeatherData('Lisbon'),
      ]);
      setPortrait(p);
      setJourneys(j);
      setLibrary(l);
      setMessages(c);
      setWorldModel(w);
      setScheduleItems(sched);
      setAiInsights(ins);
      setVacationMetrics(vac);
      setWeatherData(weath);
    } catch (err) {
      console.log('Error loading Supabase data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const [proactiveSignal, setProactiveSignal] = useState<ProactiveSignalPayload | null>(null);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Polling for Proactive Signals
  useEffect(() => {
    const checkPresence = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
        const res = await fetch(`${apiUrl}/api/presence`);
        if (res.ok) {
          const data = await res.json();
          if (data.checkIn && data.need && data.message) {
            setProactiveSignal({
              need: data.need,
              message: data.message,
              signalId: data.signalId
            });
          } else {
            setProactiveSignal(null);
          }
        }
      } catch (err) {
        console.error('Failed to check presence', err);
      }
    };

    checkPresence(); // Check immediately on mount
    const interval = setInterval(checkPresence, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, []);

  const handleDismissSignal = async () => {
    if (proactiveSignal?.signalId) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
        await fetch(`${apiUrl}/api/presence/acknowledge`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ signalId: proactiveSignal.signalId })
        });
      } catch (err) {
        console.error('Failed to acknowledge signal', err);
      }
    }
    setProactiveSignal(null);
  };

  const handleToggleTheme = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  const handleToggleScheduleItem = async (id: string, currentStatus: boolean) => {
    setScheduleItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, completed: !currentStatus } : item))
    );
    await toggleScheduleItem(id, currentStatus);
  };

  const handleAddScheduleItem = async (title: string) => {
    const newItem = await saveScheduleItem({ title, time: '02:00 PM', location: 'Virtual' });
    setScheduleItems((prev) => [...prev, newItem]);
  };

  const handleUpdateJourney = async (updatedJourney: any) => {
    setJourneys((prev) => prev.map((j) => (j.id === updatedJourney.id ? updatedJourney : j)));
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      await fetch(`${apiUrl}/api/journeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedJourney)
      });
      loadData();
    } catch (err) {
      console.error('Failed to update journey', err);
    }
  };

  const handleUpdateLibrary = async (updatedItem: any) => {
    setLibrary((prev) => {
      const exists = prev.some((l) => l.id === updatedItem.id);
      if (exists) {
        return prev.map((l) => (l.id === updatedItem.id ? updatedItem : l));
      }
      return [updatedItem, ...prev]; // Prepend new item
    });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      await fetch(`${apiUrl}/api/library`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
      loadData();
    } catch (err) {
      console.error('Failed to update library', err);
    }
  };

  const handlePromptSubmit = async (prompt: string) => {
    if (!prompt.trim()) return;
    setOrbExpression('thinking');
    setActiveQuery(prompt);

    // Save user message to chat history
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: prompt,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    saveChat(userMsg).catch(() => { });

    setTimeout(() => {
      setOrbExpression('happy');
      setTimeout(() => setOrbExpression('idle'), 2000);
    }, 500);
  };

  const handleSendCompanionMessage = async (overrideText?: string) => {
    const text = overrideText || chatInput.trim();
    if (!text || isSending) return;
    
    setChatInput('');
    setIsSending(true);

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, userMsg]);
    // Note: Backend saves the user message during the /api/reasoner call, so we don't need to saveChat(userMsg) locally here if we wait for backend. 
    // But for optimism, we can leave it. The backend uses the same session id.
    await saveChat(userMsg).catch(() => { });

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';
      const res = await fetch(`${apiUrl}/api/reasoner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, session: 'desktop' })
      });

      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();

      const aiReply: ChatMessage = {
        id: `william_${Date.now()}`,
        sender: 'william',
        text: data.reply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiReply]);
      // The backend already saved the william reply, so we don't strictly need to save it again, but updating local state is good.
    } catch (err) {
      console.error('Error sending message:', err);
      const aiReply: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'william',
        text: "I am having trouble connecting to the pattern engine. Please check my server connection.",
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiReply]);
    } finally {
      setIsSending(false);
    }
  };

  const showWeather = activeQuery?.toLowerCase().includes('weather') || false;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[var(--aurora-bg-mesh)] text-[var(--aurora-text-main)] transition-colors duration-300">
      <ProactiveToast signal={proactiveSignal} onDismiss={handleDismissSignal} />

      {/* Top Header */}
      <AuroraHeader
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenSettings={() => setActiveTab('settings')}
      />

      {/* Main Body Shell (Sidebar + Tab Content) */}
      <div className="flex-1 flex w-full relative overflow-hidden">
        {/* Navigation Sidebar */}
        <AppSidebar
          activeTab={activeTab === 'dashboard' ? 'companion' : activeTab}
          onNav={(tab) => {
            setActiveTab(tab);
            setActiveQuery(null);
          }}
        />

        {/* Dynamic Tab View Area */}
        <main className="flex-1 flex flex-col overflow-y-auto z-10 relative">
          {/* Top Dashboard Pill Return */}
          {activeTab !== 'dashboard' && (
            <div className="px-8 pt-4">
              <button
                onClick={() => setActiveTab('dashboard')}
                className="aurora-glass-pill px-3 py-1.5 flex items-center gap-2 text-xs font-semibold text-[var(--aurora-text-sub)] hover:text-[var(--aurora-text-main)] cursor-pointer"
              >
                <House size={14} weight="bold" />
                <span>Dashboard</span>
              </button>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="flex-1 flex flex-col items-center justify-between px-8 py-6 max-w-6xl mx-auto w-full"
              >
                {/* Dynamic Greeting */}
                <div className="text-center mb-4 max-w-2xl">
                  {activeQuery ? (
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--aurora-text-main)] font-sans leading-tight">
                      {activeQuery}
                    </h1>
                  ) : (
                    <div className="space-y-2">
                      <span className="inline-block px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-full text-xs font-bold tracking-wider uppercase mb-2">
                        William · Companion OS
                      </span>
                      <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-[var(--aurora-text-main)] font-sans">
                        Good Afternoon, {portrait?.name || 'you'}
                      </h1>
                      <p className="text-base md:text-lg font-medium text-[var(--aurora-text-sub)] font-sans max-w-lg mx-auto">
                        William has aligned today's execution plan. {scheduleItems.filter(s => !s.completed).length} items pending.
                      </p>
                    </div>
                  )}
                </div>

                {/* Dashboard Grid / Weather Widget */}
                {showWeather ? (
                  <div className="w-full max-w-2xl mb-8">
                    <WeatherWidget data={weatherData} isLoading={isLoading} />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl items-stretch mb-8">
                    <UpcomingSchedule
                      items={scheduleItems}
                      isLoading={isLoading}
                      onToggleItem={handleToggleScheduleItem}
                      onAddItem={handleAddScheduleItem}
                    />
                    <AiInsights insights={aiInsights} isLoading={isLoading} />
                    <VacationEligibility metrics={vacationMetrics} isLoading={isLoading} />
                  </div>
                )}

                {/* Interactive AI Orb & Prompt Bar Area */}
                <footer className="w-full flex flex-col items-center justify-center pb-8 pt-2 space-y-4">
                  <div className="hover:scale-105 transition-transform cursor-pointer">
                    <AiOrb
                      expression={orbExpression}
                      connectionState={webrtc.state}
                      remoteStream={webrtc.remoteStream}
                      onClick={() => {
                        if (webrtc.state === 'disconnected') {
                          webrtc.connect();
                        } else if (webrtc.state === 'connected') {
                          webrtc.disconnect();
                        }
                      }}
                    />
                  </div>

                  <div
                    onClick={() => setIsModalOpen(true)}
                    className="aurora-glass-pill px-6 py-3 flex items-center gap-3 text-sm font-medium text-[var(--aurora-text-main)] cursor-pointer transition-all hover:scale-105 active:scale-95"
                  >
                    <MagnifyingGlass size={18} weight="bold" className="text-blue-500" />
                    <span>Tell William what to pull up or tap orb to speak…</span>
                    <Sparkle size={16} weight="fill" className="text-amber-500" />
                  </div>
                </footer>
              </motion.div>
            )}

            {activeTab === 'pipeline' && (
              <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                <PipelineView />
              </motion.div>
            )}

            {activeTab === 'companion' && (
              <motion.div key="companion" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                <CompanionView
                  portrait={portrait}
                  lastReply={messages.filter(m => m.sender === 'william').at(-1)?.text ?? ''}
                  messages={messages}
                  chatInput={chatInput}
                  setChatInput={setChatInput}
                  onSend={(p) => handleSendCompanionMessage(p)}
                  isSending={isSending}
                  onOpenFocus={() => setIsFocusOpen(true)}
                  onOpenVoice={() => {
                    setIsVoiceOpen(true);
                    voiceRecorder.startRecording();
                  }}
                />
              </motion.div>
            )}

            {activeTab === 'portrait' && (
              <motion.div key="portrait" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                <PortraitView portrait={portrait} />
              </motion.div>
            )}

            {activeTab === 'journeys' && (
              <motion.div key="journeys" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                <JourneysView journeys={journeys} onUpdate={handleUpdateJourney} />
              </motion.div>
            )}

            {activeTab === 'library' && (
              <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                <LibraryView items={library} onUpdate={handleUpdateLibrary} />
              </motion.div>
            )}

            {activeTab === 'world' && (
              <motion.div key="world" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                <WorldView
                  worldModel={worldModel}
                  onLoad={loadData}
                  onOpenFocus={() => setIsFocusOpen(true)}
                />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1">
                <SettingsView
                  portrait={portrait}
                  theme={theme}
                  onToggleTheme={handleToggleTheme}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Prompt Modal */}
      <PromptInputModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmitPrompt={handlePromptSubmit}
      />

      {/* Focus Mode Overlay */}
      <AnimatePresence>
        {isFocusOpen && (
          <FocusMode
            portrait={portrait}
            worldModel={worldModel}
            messages={messages}
            chatInput={chatInput}
            setChatInput={setChatInput}
            onSend={handleSendCompanionMessage}
            isSending={isSending}
            onClose={() => setIsFocusOpen(false)}
            onRefreshWorld={loadData}
          />
        )}
      </AnimatePresence>

      <VoiceWaveformVisualizer
        isOpen={isVoiceOpen}
        isRecording={voiceRecorder.isRecording}
        volume={voiceRecorder.volume}
        frequencies={voiceRecorder.frequencies}
        transcript={voiceRecorder.transcript}
        interimTranscript={voiceRecorder.interimTranscript}
        error={voiceRecorder.error}
        onClose={() => {
          voiceRecorder.stopRecording();
          setIsVoiceOpen(false);
          voiceRecorder.resetTranscript();
        }}
        onSubmit={(text) => {
          handlePromptSubmit(text);
          voiceRecorder.resetTranscript();
        }}
      />
    </div>
  );
}



