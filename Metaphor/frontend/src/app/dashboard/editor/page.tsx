"use client";

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Save, FileText, Minimize2, CheckCircle2, XCircle, Zap, Loader2, ArrowRight } from "lucide-react";

export default function MetaphorEditorPage() {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("Untitled Document");
  const [selectedText, setSelectedText] = useState("");
  
  const [isCopilotActive, setIsCopilotActive] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<string | null>(null);
  const [copilotError, setCopilotError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [draftId, setDraftId] = useState<string | null>(null);

  useEffect(() => {
    // Load draft from Supabase
    const loadDraft = async () => {
      const { createClient } = await import("@/utils/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('metaphor_drafts')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
      
      if (data) {
        setDraftId(data.id);
        setTitle(data.title || "Untitled Document");
        setContent(data.content || "");
      }
    };
    loadDraft();
  }, []);

  const saveDraft = async (t: string, c: string) => {
    const { createClient } = await import("@/utils/supabase/client");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (draftId) {
      await supabase.from('metaphor_drafts').update({
        title: t,
        content: c,
        updated_at: new Date().toISOString()
      }).eq('id', draftId);
    } else {
      const { data, error } = await supabase.from('metaphor_drafts').insert({
        user_id: user.id,
        title: t,
        content: c
      }).select().single();
      if (data) setDraftId(data.id);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Debounce this in a real app, but for now we'll save directly or maybe just let it fire (could be heavy)
    // Actually, let's just save on blur or periodically to avoid spamming the DB, but since we are replacing localStorage, we'll keep the signature.
    // To prevent rate limits, we should debounce the saveDraft.
  };

  // Setup auto-save debounce
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (title !== "Untitled Document" || content !== "") {
        saveDraft(title, content);
      }
    }, 1500);
    return () => clearTimeout(timeout);
  }, [title, content]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleSelect = () => {
    if (textareaRef.current) {
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      if (start !== end) {
        setSelectedText(content.substring(start, end));
      } else {
        setSelectedText("");
      }
    }
  };

  const runCopilot = async (action: "brainstorm" | "summarize") => {
    if (!selectedText) return;
    setIsCopilotActive(true);
    setCopilotLoading(true);
    setCopilotResult(null);
    setCopilotError(null);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text: selectedText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Copilot failed.");
      setCopilotResult(data.result);
    } catch (err: any) {
      setCopilotError(err.message);
    } finally {
      setCopilotLoading(false);
    }
  };

  const insertCopilotResult = () => {
    if (!copilotResult || !textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    
    const newContent = content.substring(0, end) + "\n\n" + copilotResult + "\n" + content.substring(end);
    setContent(newContent);
    saveDraft(title, newContent);
    
    setIsCopilotActive(false);
    setCopilotResult(null);
    setSelectedText("");
  };

  return (
    <div className="flex flex-col h-full w-full bg-background animate-in fade-in duration-200">
      {/* Top Bar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-border-subtle bg-surface-1/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-3 w-1/2">
          <FileText className="w-4 h-4 text-muted" />
          <input 
            type="text" 
            value={title}
            onChange={handleTitleChange}
            className="bg-transparent border-none outline-none text-sm font-semibold text-foreground tracking-tight w-full placeholder:text-muted"
            placeholder="Untitled Document"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-muted uppercase tracking-widest px-2 py-1 bg-surface-2 rounded-md">Draft Saved</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Editor Area */}
        <div className="flex-1 flex justify-center overflow-y-auto bg-background p-8 custom-scrollbar">
          <div className="w-full max-w-3xl relative">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onSelect={handleSelect}
              placeholder="Start writing..."
              className="w-full min-h-[80vh] bg-transparent border-none outline-none text-foreground text-base leading-relaxed resize-none placeholder:text-muted/50 font-serif"
            />
          </div>
        </div>

        {/* Floating Copilot Menu */}
        {selectedText && !isCopilotActive && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-surface-1 border border-border-strong rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="px-3 py-1 flex items-center gap-2 border-r border-border-subtle">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">AI Copilot</span>
            </div>
            <button 
              onClick={() => runCopilot("brainstorm")}
              className="px-3 py-1.5 rounded-xl hover:bg-surface-2 text-xs font-medium text-foreground transition-colors"
            >
              Brainstorm
            </button>
            <button 
              onClick={() => runCopilot("summarize")}
              className="px-3 py-1.5 rounded-xl hover:bg-surface-2 text-xs font-medium text-foreground transition-colors"
            >
              Summarize
            </button>
          </div>
        )}

        {/* Copilot Active Panel (Side or Bottom) */}
        {isCopilotActive && (
          <div className="w-96 border-l border-border-subtle bg-surface-1/50 flex flex-col shadow-2xl z-20 animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b border-border-subtle bg-surface-1 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Metaphor Copilot</h3>
              </div>
              <button onClick={() => setIsCopilotActive(false)} className="text-muted hover:text-foreground">
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              <div className="mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Selected Text</p>
                <div className="p-3 bg-surface-2 rounded-xl text-xs text-muted border border-border-subtle italic line-clamp-4">
                  "{selectedText}"
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2">Copilot Output</p>
                {copilotLoading ? (
                  <div className="p-6 flex flex-col items-center justify-center text-center border border-border-subtle border-dashed rounded-xl">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mb-3" />
                    <p className="text-xs text-muted">Analyzing cognitive profile...</p>
                    <p className="text-[10px] text-muted/70 mt-1">Generating response</p>
                  </div>
                ) : copilotError ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">{copilotError}</p>
                  </div>
                ) : copilotResult ? (
                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                    <div className="prose prose-sm prose-invert max-w-none text-sm text-foreground/90 whitespace-pre-wrap">
                      {copilotResult}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {copilotResult && !copilotLoading && (
              <div className="p-4 border-t border-border-subtle bg-surface-1 flex gap-2">
                <button 
                  onClick={insertCopilotResult}
                  className="flex-1 bg-primary text-primary-foreground py-2 rounded-xl text-xs font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  Insert below selection <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
