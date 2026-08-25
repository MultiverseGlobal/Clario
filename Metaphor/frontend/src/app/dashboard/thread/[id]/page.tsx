"use client";

import React, { useState } from "react";
import { MessageBlock } from "@/components/thread/MessageBlock";
import { ThreadInput } from "@/components/thread/ThreadInput";
import { Share, MoreHorizontal, Loader2 } from "lucide-react";
import { fetchFromMetaphor } from "@/app/api";

type Message = {
  role: "user" | "ai";
  content: string;
  sources?: { title: string; sourceName: string; time: string }[];
};

export default function CognitiveThreadPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      content: "Hello! I am your Metaphor context engine. I have full access to your connected Knowledge Graph. What would you like to explore today?"
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (query: string) => {
    // Append user message
    const newMessages = [...messages, { role: "user" as const, content: query }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetchFromMetaphor("/context/chat", { query }, "POST");
      
      // The backend returns { answer: string, context: { delta_nodes: [] } }
      let sources = [];
      if (res.context && res.context.delta_nodes) {
        sources = res.context.delta_nodes.map((n: any) => ({
          title: n.title,
          sourceName: n.type,
          time: "Recently"
        }));
      }

      setMessages([
        ...newMessages,
        {
          role: "ai",
          content: res.answer,
          sources
        }
      ]);
    } catch (e) {
      console.error("Chat error:", e);
      setMessages([
        ...newMessages,
        {
          role: "ai",
          content: "Sorry, I encountered an error connecting to the Context Engine."
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      
      {/* Thread Header */}
      <div className="sticky top-0 z-20 w-full h-14 bg-background/80 backdrop-blur-xl border-b border-border-subtle flex items-center justify-between px-6">
        <div className="flex items-center gap-3 text-sm font-medium">
          <span className="text-muted">Thread</span>
          <span className="text-border-strong">/</span>
          <span className="text-foreground tracking-tight">Atlas Architecture Context</span>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <Share className="w-4 h-4" />
          </button>
          <button className="p-2 text-muted hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* The Conversation Stream */}
      <div className="flex-1 overflow-y-auto w-full pb-32">
        {messages.map((m, idx) => (
          <MessageBlock 
            key={idx}
            role={m.role} 
            content={m.content} 
            sources={m.sources}
          />
        ))}
        {isLoading && (
          <div className="w-full py-8 bg-surface-1/30">
            <div className="max-w-3xl mx-auto flex gap-6">
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="flex-1 pt-1 flex flex-col gap-2">
                <div className="h-4 w-1/3 bg-border-subtle rounded animate-pulse"></div>
                <div className="h-4 w-2/3 bg-border-subtle rounded animate-pulse"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Input Palette */}
      <div className="sticky bottom-0 w-full bg-gradient-to-t from-background via-background to-transparent pt-6">
        <ThreadInput onSubmit={handleSubmit} disabled={isLoading} />
      </div>

    </div>
  );
}
