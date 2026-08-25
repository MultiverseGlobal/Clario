import React, { useState, useEffect, useRef } from 'react';
import type { ConstitutionRule, ContextState, Integration, Portrait, Journey, LibraryItem } from '@william/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Brain, Compass, ArrowRight } from 'lucide-react';


interface OnboardingProps {
  onComplete: (data: {
    username: string;
    portrait: Portrait;
    journeys: Journey[];
    library: LibraryItem[];
    rules: ConstitutionRule[];
    context: Partial<ContextState>;
    integrations: Integration[];
  }) => void;
}

interface ChatMessage {
  id: string;
  sender: 'william' | 'user';
  text: string;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showConnectMetaphor, setShowConnectMetaphor] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // Portrait questionnaire state variables
  const [userName, setUserName] = useState<string>('');
  const [identity, setIdentity] = useState<string>('');
  const [values, setValues] = useState<string>('');
  const [building, setBuilding] = useState<string>('');
  const [strengths, setStrengths] = useState<string>('');
  const [struggles, setStruggles] = useState<string>('');
  const [principles, setPrinciples] = useState<string>('');
  const [meaning, setMeaning] = useState<string>('');

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Initial intro sequence
  useEffect(() => {
    const runIntro = async () => {
      setIsTyping(true);
      
      await new Promise((r) => setTimeout(r, 800));
      setMessages((prev) => [...prev, { id: 'm0', sender: 'william', text: 'Hello.' }]);
      
      await new Promise((r) => setTimeout(r, 1600));
      setMessages((prev) => [...prev, { id: 'm1', sender: 'william', text: "I'm William." }]);
      
      await new Promise((r) => setTimeout(r, 1800));
      setMessages((prev) => [
        ...prev, 
        { 
          id: 'm2', 
          sender: 'william', 
          text: 'Before I can support your vision and optimize your cognitive flow, I need to know who you are.' 
        }
      ]);
      
      await new Promise((r) => setTimeout(r, 2000));
      setMessages((prev) => [
        ...prev, 
        { 
          id: 'm3', 
          sender: 'william', 
          text: 'What should I call you?' 
        }
      ]);
      
      setIsTyping(false);
      setCurrentStep(1);
    };

    runIntro();
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userText = inputText.trim();
    setInputText('');

    setMessages((prev) => [...prev, { id: `u_${Date.now()}`, sender: 'user', text: userText }]);
    setIsTyping(true);

    await new Promise((r) => setTimeout(r, 1000));

    let nextQuestion = '';
    
    switch (currentStep) {
      case 1:
        setUserName(userText);
        nextQuestion = `Welcome, ${userText}. Who are you striving to become?`;
        setCurrentStep(2);
        break;

      case 2:
        setIdentity(userText);
        nextQuestion = 'What core values guide your decisions?';
        setCurrentStep(3);
        break;

      case 3:
        setValues(userText);
        nextQuestion = 'What primary project or vision are you building right now?';
        setCurrentStep(4);
        break;

      case 4:
        setBuilding(userText);
        nextQuestion = 'What are your greatest core strengths?';
        setCurrentStep(5);
        break;

      case 5:
        setStrengths(userText);
        nextQuestion = 'Where do you struggle or lose focus most?';
        setCurrentStep(6);
        break;

      case 6:
        setStruggles(userText);
        nextQuestion = 'What non-negotiable principles rule your life?';
        setCurrentStep(7);
        break;

      case 7:
        setPrinciples(userText);
        nextQuestion = 'Finally, what gives your daily effort meaning?';
        setCurrentStep(8);
        break;

      case 8:
        setMeaning(userText);
        nextQuestion = `Thank you, ${userName || 'friend'}. Your cognitive profile is ready. One final thing: I can sync with Metaphor OS to share your cognitive context across the Pseudonyms network.`;
        setCurrentStep(9);
        setTimeout(() => {
          setShowConnectMetaphor(true);
        }, 1500);
        break;

      case 9:
      case 10:
        handleComplete();
        return;

      default:
        break;
    }

    setMessages((prev) => [...prev, { id: `w_${Date.now()}`, sender: 'william', text: nextQuestion }]);
    setIsTyping(false);
  };

  const handleComplete = () => {
    const portraitData: Portrait = {
      name: userName || 'William',
      identity: identity || 'Architect of high-agency systems',
      values: values || 'Autonomy, mastery, relentless iteration',
      principles: principles || 'Focus on leverage; systems over willpower',
      strengths: strengths || 'System design, rapid execution',
      blind_spots: struggles || 'Over-engineering early solutions',
      dreams: building || 'Build seamless intelligence systems',
      relationships: meaning || 'Core collaborators and family',
      decision_patterns: ['Prefers top-down clarity', 'Empirical code validation'],
      growth: ['Transitioning from manual execution to system orchestration'],
      cognitiveProfile: {
        problemSolvingStyle: 'System-builder',
        temporalBias: 'Strategic 3-month compounding focus',
        attentionSpan: '90-minute high-intensity deep work blocks',
        decisionHeuristics: 'Code-first verification'
      },
      activeBeliefs: [
        { 
          belief: 'Environment design beats raw willpower', 
          strength: 0.95, 
          lastTested: new Date().toISOString(), 
          evolution: 'Established during onboarding' 
        }
      ]
    };

    const initialJourneys: Journey[] = [
      {
        id: `j_${Date.now()}_1`,
        category: 'legacy',
        icon: 'Target',
        title: building ? building.substring(0, 30) : 'Core Project Execution',
        currentState: 'Initializing project framework with William companion support.',
        vision: building || 'Complete primary platform development',
        milestones: [
          { id: 'm1', text: 'Initial Setup', completed: true },
          { id: 'm2', text: 'Core Feature Integration', completed: false },
          { id: 'm3', text: 'Production Launch', completed: false }
        ],
        memories: ['Onboarding complete'],
        lessons: ['Focus on minimal viable leverage points'],
        progress: 15,
        timeline: [{ date: new Date().toLocaleDateString(), text: 'Project initialized during onboarding' }]
      },
      {
        id: `j_${Date.now()}_2`,
        category: 'mental',
        icon: 'Brain',
        title: 'Cognitive & Focus Optimization',
        currentState: 'Establishing zero-distraction deep work loops.',
        vision: 'Achieve effortless deep flow with zero cognitive friction.',
        milestones: [
          { id: 'm4', text: 'Setup Focus Mode', completed: true },
          { id: 'm5', text: 'Track daily cognitive energy', completed: false }
        ],
        memories: ['Profile configured'],
        lessons: ['Protect high-energy work blocks'],
        progress: 30,
        timeline: [{ date: new Date().toLocaleDateString(), text: 'Focus architecture established' }]
      }
    ];

    const initialLibrary: LibraryItem[] = [
      {
        id: 'l1',
        type: 'lesson',
        title: 'Systems Over Motivation',
        author: 'William',
        content: 'When routines break after periods of high stress, redesign your environment instead of relying on raw motivation.',
        dateAdded: new Date().toLocaleDateString(),
        tags: ['Systems', 'Focus']
      }
    ];

    const initialRules: ConstitutionRule[] = [
      { 
        id: 'r1', 
        user_id: 'u1', 
        rule_text: principles.substring(0, 100) || 'Act in alignment with core principles.', 
        category: 'priority', 
        is_active: true, 
        created_at: new Date().toISOString() 
      }
    ];

    const contextState: Partial<ContextState> = {
      id: 'c1',
      user_id: 'u1',
      current_energy: 8,
      focus_score: 8,
      tasks_today: [],
      meetings_today: [],
      goals: [building],
      last_updated_at: new Date().toISOString()
    };

    const integrations: Integration[] = [
      { id: 'i1', user_id: 'u1', provider: 'google', connected: false, connected_at: new Date().toISOString(), last_synced_at: null },
      { id: 'i2', user_id: 'u1', provider: 'github', connected: true, connected_at: new Date().toISOString(), last_synced_at: new Date().toISOString() }
    ];

    onComplete({
      username: userName,
      portrait: portraitData,
      journeys: initialJourneys,
      library: initialLibrary,
      rules: initialRules,
      context: contextState,
      integrations: integrations
    });
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#030712',
      color: '#f9fafb',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
    }}>
      {/* Ambient background glow mesh */}
      <div style={{
        position: 'absolute',
        top: '10%',
        left: '20%',
        width: '400px',
        height: '400px',
        background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(0, 0, 0, 0) 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '15%',
        right: '25%',
        width: '450px',
        height: '450px',
        background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, rgba(0, 0, 0, 0) 70%)',
        filter: 'blur(70px)',
        pointerEvents: 'none'
      }} />

      {/* Main Glass Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          width: '100%',
          maxWidth: '640px',
          height: '80vh',
          maxHeight: '750px',
          background: 'rgba(17, 24, 39, 0.65)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10
        }}
      >
        {/* Glass Card Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(3, 7, 18, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
            }}>
              <Compass size={18} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>William Companion</h2>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Cognitive Onboarding</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={handleComplete}
              style={{
                padding: '6px 12px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#d1d5db',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.2)'; e.currentTarget.style.color = '#ffffff'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)'; e.currentTarget.style.color = '#d1d5db'; }}
            >
              Skip & Learn As I Go
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {Array.from({ length: 10 }).map((_, idx) => (
                <div 
                  key={idx}
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: idx < currentStep ? '#6366f1' : 'rgba(255, 255, 255, 0.15)',
                    transition: 'all 0.3s ease'
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Conversation area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          scrollBehavior: 'smooth'
        }}>
          <AnimatePresence>
            {messages.map((msg, index) => {
              const isLatest = index === messages.length - 1;
              const isWilliam = msg.sender === 'william';
              
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: isLatest ? 1 : 0.6, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isWilliam ? 'flex-start' : 'flex-end',
                    width: '100%'
                  }}
                >
                  {isWilliam && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <Brain size={12} color="#818cf8" />
                      <span style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: '#818cf8', fontWeight: 600, letterSpacing: '0.05em' }}>
                        William
                      </span>
                    </div>
                  )}
                  <div
                    style={{
                      padding: '14px 18px',
                      borderRadius: isWilliam ? '4px 18px 18px 18px' : '18px 18px 4px 18px',
                      background: isWilliam ? 'rgba(255, 255, 255, 0.03)' : 'var(--accent-color)',
                      backdropFilter: isWilliam ? 'blur(12px)' : 'none',
                      border: isWilliam ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                      color: isWilliam ? 'var(--text-primary)' : 'var(--accent-text)',
                      lineHeight: 1.5,
                      maxWidth: '85%',
                      fontSize: '0.9375rem',
                      fontFamily: isWilliam ? 'var(--font-sans)' : 'var(--font-serif)',
                      fontWeight: 400,
                      boxShadow: isWilliam ? '0 4px 20px rgba(0,0,0,0.2)' : 'none'
                    }}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start mb-6"
            >
              <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-[#a1a1aa] font-mono text-sm max-w-[80%] flex items-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.03)]">
                <div className="w-1.5 h-1.5 bg-[#d4d4d8] rounded-full animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 bg-[#d4d4d8] rounded-full animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 bg-[#d4d4d8] rounded-full animate-bounce" />
              </div>
            </motion.div>
          )}

          {showConnectMetaphor && !isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start mb-6"
            >
              <div className="flex flex-col gap-3 max-w-[80%]">
                <button
                  onClick={() => connectMetaphor()}
                  className="bg-white text-black hover:bg-gray-200 transition-colors rounded-xl px-5 py-3 text-sm font-semibold flex items-center gap-2"
                >
                  <Sparkles size={16} />
                  Connect Metaphor OS
                </button>
                <button
                  onClick={() => {
                    setShowConnectMetaphor(false);
                    handleComplete();
                  }}
                  className="text-[#a1a1aa] hover:text-white transition-colors text-sm font-medium text-left px-2"
                >
                  Skip for now
                </button>
              </div>
            </motion.div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Panel */}
        <div style={{
          padding: '20px 28px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(3, 7, 18, 0.6)'
        }}>
          {currentStep < 10 ? (
            <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={showConnectMetaphor ? "Please make a selection above..." : (currentStep === 0 ? "Wait for William..." : "Type your response...")}
                disabled={currentStep === 0 || isTyping || showConnectMetaphor}
                autoFocus
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(17, 24, 39, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#ffffff',
                  fontSize: '0.9375rem',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isTyping}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: inputText.trim() && !isTyping ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                  color: '#ffffff',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: inputText.trim() && !isTyping ? 'pointer' : 'default',
                  transition: 'all 0.2s ease'
                }}
              >
                <Send size={18} />
              </button>
            </form>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <button 
                onClick={handleComplete}
                style={{ 
                  width: '100%', 
                  padding: '14px 0', 
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', 
                  color: '#ffffff', 
                  fontWeight: 600,
                  borderRadius: '12px',
                  fontSize: '0.9375rem',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)'
                }}
              >
                <span>Enter William Companion</span>
                <ArrowRight size={18} />
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
