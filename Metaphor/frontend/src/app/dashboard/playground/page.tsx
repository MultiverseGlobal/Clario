"use client";

import React, { useState } from "react";
import { Sparkles, Send, Bot, User, ShieldCheck, Target, Network, Check } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { fetchFromMetaphor } from "@/app/api";

type Message = {
  role: "user" | "ai";
  content: string;
  context?: any;
};

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeContext, setActiveContext] = useState<any>(null);

  const handleSend = async () => {
    if (!prompt.trim() || isLoading) return;
    
    const userMsg = prompt.trim();
    setPrompt("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsLoading(true);

    try {
      const res = await fetchFromMetaphor("/context/chat", { query: userMsg });
      
      setMessages(prev => [...prev, { 
        role: "ai", 
        content: res.answer, 
        context: res.context 
      }]);
      setActiveContext(res.context);
      
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: "ai", content: "Error: Could not reach the Context Engine." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewContext = (ctx: any) => {
    setActiveContext(ctx);
  };

  return (
    <div className="flex w-full h-full bg-background animate-in fade-in duration-150 overflow-hidden">
      
      {/* ── Left: Chat Interface ── */}
      <div className="flex-1 flex flex-col relative bg-surface-1/30">
        
        {/* Chat Header */}
        <header className="h-14 px-6 flex items-center justify-between border-b border-border-subtle bg-surface-1/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <MetaphorLogo size={20} />
            <span className="text-sm font-semibold text-foreground tracking-tight">Metaphor Playground</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-2 text-[10px] font-medium text-muted ml-2">Gemini 1.5 Flash</span>
          </div>
        </header>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-32">
          
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="mb-4 p-4 rounded-2xl bg-surface-1 border border-border-subtle shadow-inner">
                <MetaphorLogo size={40} className="text-foreground" />
              </div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground mb-1">Test your Context</h2>
              <p className="text-sm text-muted max-w-sm leading-relaxed mb-6">Ask a question. The system will retrieve relevant Graph Nodes and answer you contextually.</p>
              
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {[
                  "Use Metaphor (get_active_session_context) to check my Cursor chat session.",
                  "Drop this active task progress into Metaphor (sync_chat_drop) for Claude.",
                  "What active architectural decisions exist in this workspace?",
                  "Summarize indexed workspace context"
                ].map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setPrompt(preset);
                      setTimeout(() => {
                        const sendBtn = document.getElementById("playground-send-btn");
                        if (sendBtn) sendBtn.click();
                      }, 50);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-surface-1 border border-border-subtle hover:border-strong text-xs font-medium text-foreground hover:bg-surface-2 transition-all cursor-pointer shadow-sm"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          )}



          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
              
              {msg.role === "ai" && (
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 mr-4">
                  <MetaphorLogo size={16} />
                </div>
              )}

              <div className={`max-w-[85%] ${msg.role === "user" ? "bg-surface-2 border-border-subtle" : "bg-transparent"} border rounded-2xl p-4 text-sm text-foreground shadow-sm whitespace-pre-wrap`}>
                
                {msg.context && (
                  <button 
                    onClick={() => handleViewContext(msg.context)}
                    className="mb-3 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-xs font-semibold hover:bg-primary/20 transition-all flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Context Injected ({msg.context.delta_nodes?.length || 0} nodes)
                  </button>
                )}

                {msg.content}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4 max-w-[85%] animate-in slide-in-from-bottom-2 fade-in duration-300">
              <div className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center shrink-0 border border-border-subtle">
                <div className="w-4 h-4 border-2 border-muted border-t-foreground rounded-full animate-spin" />
              </div>
              <div className="p-4 text-sm text-muted">Querying Knowledge Graph...</div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-surface-1/80 via-surface-1/50 to-transparent">
          <div className="relative max-w-3xl mx-auto shadow-lg rounded-2xl">
            <input 
              type="text" 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={isLoading}
              placeholder="Ask anything about your context..."
              className="w-full bg-background border border-border-strong rounded-2xl pl-4 pr-12 py-4 text-sm text-foreground focus:outline-none focus:border-primary disabled:opacity-50"
            />
            <button 
              id="playground-send-btn"
              onClick={handleSend}
              disabled={isLoading || !prompt.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-foreground text-background rounded-xl hover:bg-primary transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>

          </div>
        </div>

      </div>

      {/* ── Right: Context Inspector Overlay ── */}
      {activeContext && (
        <div className="w-96 border-l border-border-subtle bg-background flex flex-col shadow-2xl z-20 animate-in slide-in-from-right duration-300">
          <div className="p-5 border-b border-border-subtle bg-surface-1/50 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> Context Inspector
              </h2>
              <p className="text-[11px] text-muted mt-1">Review exactly what AI was shown.</p>
            </div>
            <button onClick={() => setActiveContext(null)} className="text-muted hover:text-foreground text-xs font-semibold px-2 py-1 bg-surface-2 rounded">
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
            
            <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
              <Network className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <p className="text-[11px] text-primary/80 leading-relaxed">
                Metaphor injected <strong className="text-primary">{activeContext.delta_nodes?.length || 0} relevant nodes</strong> for this query.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted flex items-center gap-2">
                <Target className="w-3 h-3" /> Injected Nodes
              </h3>
              
              <div className="space-y-3">
                {activeContext.delta_nodes?.map((node: any, idx: number) => (
                  <Card key={idx} noPadding className="bg-surface-1 overflow-hidden border-border-subtle">
                    <div className="p-3 border-b border-border-subtle bg-background flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground line-clamp-1">{node.title || "Untitled Node"}</span>
                      <span className="text-[9px] font-mono font-medium px-2 py-0.5 bg-surface-2 text-muted rounded uppercase">
                        {node.type || "Concept"}
                      </span>
                    </div>
                    <div className="p-3 bg-surface-1/50">
                      <p className="text-xs text-muted leading-relaxed line-clamp-3">
                        {node.summary || "No summary available."}
                      </p>
                    </div>
                  </Card>
                ))}

                {(!activeContext.delta_nodes || activeContext.delta_nodes.length === 0) && (
                  <div className="p-4 text-center text-xs text-muted border border-border-subtle border-dashed rounded-xl">
                    No relevant nodes found in the Graph for this query.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
