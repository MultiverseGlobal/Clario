"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, CircleNotch, Link as LinkIcon } from "@phosphor-icons/react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";

// ── Tool definitions ──────────────────────────────────────────────────────────

type ConnectionState = "idle" | "connecting" | "connected" | "error";

interface Tool {
  id: string;
  name: string;
  category: string;
  icon: React.ReactNode;
}

const TOOLS: Tool[] = [
  { 
    id: "chatgpt", 
    name: "ChatGPT", 
    category: "Reasoning",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3428 7.897a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3428 7.897zm16.5986 3.8558L13.1038 8.3843l2.0153-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.6814zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.4084 9.2312V6.8988a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6814l-.0048 6.7226zm1.107-1.4244l2.5843-1.4904 2.5843 1.4904v2.9808l-2.5843 1.4904-2.5843-1.4904z" />
      </svg>
    )
  },
  { 
    id: "claude", 
    name: "Claude", 
    category: "Architecture",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M13.527 2.22c.328 0 .618.21.716.52l1.968 6.208 6.209 1.968c.31.098.52.388.52.716s-.21.618-.52.716l-6.209 1.968-1.968 6.209c-.098.31-.388.52-.716.52s-.618-.21-.716-.52l-1.968-6.209-6.209-1.968c-.31-.098-.52-.388-.52-.716s.21-.618.52-.716l6.209-1.968 1.968-6.208c.098-.31.388-.52.716-.52z"/>
      </svg>
    )
  },
  { 
    id: "github", 
    name: "GitHub", 
    category: "Repository",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
      </svg>
    )
  },
  { 
    id: "notion", 
    name: "Notion", 
    category: "Knowledge",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.334-.84c1.12-.093 1.213.373 1.026.933l-2.053 13.067c-.187.933-.653 1.306-1.587 1.4l-11.427.746c-.933.093-1.306-.373-1.12-1.306l1.399-9.147-1.306.094c-.653.093-.933-.28-.746-.84.28-.746.84-1.306 1.306-1.866l-.254-2.707zm5.507 3.547l-3.36 4.853v4.666l4.2-4.946v-4.573zm4.667-.374l-4.2 5.04v4.573l3.36-4.853v-4.76zm1.12-.093v4.76l-3.267 4.76 4.2-.28.84-5.32c.187-.934.093-1.307-.84-1.307l-.933.147v-2.753z"/>
      </svg>
    )
  },
  { 
    id: "antigravity", 
    name: "Antigravity", 
    category: "IDE",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-ink)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v5M12 16v5M3 12h5M16 12h5" />
      </svg>
    )
  },
  { 
    id: "cursor", 
    name: "Cursor", 
    category: "Generation",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M12 1.5L2.5 7.02v10.16L12 22.7l9.5-5.52V7.02L12 1.5zm0 2.38l6.98 4.06L12 12.01 5.02 7.94 12 3.88zm-7.5 5.5l6.5 3.77v7.54l-6.5-3.77V9.38zm8.5 11.31v-7.54l6.5-3.77v7.54l-6.5 3.77z"/>
      </svg>
    )
  },
];

// ── Step 2 ────────────────────────────────────────────────────────────────────

export default function OnboardStep2() {
  const router = useRouter();
  const [toolStates, setToolStates] = useState<Record<string, ConnectionState>>(
    TOOLS.reduce((acc, t) => ({ ...acc, [t.id]: "idle" }), {})
  );
  const [projectName, setProjectName] = useState("Your project");
  const [isProceeding, setIsProceeding] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("metaphor_onboard_step1");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.name) setProjectName(parsed.name.trim());
      }
    } catch {}

    try {
      const raw = sessionStorage.getItem("metaphor_onboard_tools");
      if (raw) setToolStates(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    sessionStorage.setItem("metaphor_onboard_tools", JSON.stringify(toolStates));
  }, [toolStates]);

  const connectedCount = Object.values(toolStates).filter((s) => s === "connected").length;
  const canContinue = connectedCount >= 1;

  const handleConnect = async (id: string) => {
    const current = toolStates[id];
    if (current === "connected") {
      setToolStates((prev) => ({ ...prev, [id]: "idle" }));
      return;
    }

    setToolStates((prev) => ({ ...prev, [id]: "connecting" }));
    await new Promise((r) => setTimeout(r, 800));
    setToolStates((prev) => ({ ...prev, [id]: "connected" }));
  };

  const handleContinue = async () => {
    setIsProceeding(true);
    try {
      if (typeof window !== "undefined") {
        const connectedIds = Object.entries(toolStates)
          .filter(([_, state]) => state === "connected")
          .map(([id]) => id);

        const existingRaw = localStorage.getItem("metaphor_connections_v2");
        const existingList = existingRaw ? JSON.parse(existingRaw) : [];

        TOOLS.forEach((tool) => {
          if (connectedIds.includes(tool.id) && !existingList.some((e: any) => e.id === tool.id)) {
            existingList.push({
              id: tool.id,
              name: tool.name,
              category: "AI Agent",
              endpoint: `${tool.id}://workspace.local`,
              status: "connected",
              addedAt: new Date().toISOString(),
            });
          }
        });
        localStorage.setItem("metaphor_connections_v2", JSON.stringify(existingList));
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 200));
    router.push("/signup");
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center">
      {/* ── Header ── */}
      <header className="fixed top-8 w-full max-w-4xl px-6 flex items-center justify-between z-50 pointer-events-none">
        <div className="flex items-center justify-between w-full h-[52px] px-8 rounded-full glass-clear backdrop-blur-xl border border-[rgba(10,10,10,0.06)] shadow-[0_14px_40px_rgba(0,0,0,0.04)] pointer-events-auto">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Metaphor home">
            <MetaphorLogo className="w-5 h-5 opacity-90 group-hover:opacity-100 transition-opacity" />
            <span
              className="text-[14px] font-medium tracking-wide text-[var(--color-ink)]"
            >
              Metaphor
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <div className="w-6 h-1 rounded-full bg-[rgba(10,10,10,0.10)]" />
              <div className="w-6 h-1 rounded-full bg-[var(--color-ink)]" />
              <div className="w-6 h-1 rounded-full bg-[rgba(10,10,10,0.10)]" />
            </div>
            <span
              className="text-[11px] text-[#AEB7BC] font-mono tracking-widest uppercase"
            >
              02 / 03
            </span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 px-6 pt-16 mt-32 mb-24 w-full max-w-3xl flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col gap-12 w-full"
        >
          {/* Heading */}
          <div className="flex flex-col gap-6 items-center">
            <h1 className="font-display text-[clamp(44px,5vw,56px)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]" style={{ fontWeight: 400 }}>
              Bring your tools into{" "}
              <span style={{ fontStyle: "italic" }}>
                {projectName}
              </span>
            </h1>
            <p className="text-[16px] text-[#3B4043] leading-relaxed max-w-md">
              Connect at least one tool to start. Metaphor will build the shared context layer between them.
            </p>
          </div>

          {/* Tool grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-3xl mx-auto">
            {TOOLS.map((tool, i) => {
              const isConnected = toolStates[tool.id] === "connected";
              const isConnecting = toolStates[tool.id] === "connecting";
              
              return (
                <motion.button
                  key={tool.id}
                  onClick={() => handleConnect(tool.id)}
                  disabled={isConnecting}
                  className="relative flex flex-col items-center justify-center p-8 gap-4 rounded-[20px] transition-all group"
                  style={{
                    background: isConnected ? "rgba(10,10,10,0.02)" : "transparent",
                    border: isConnected ? "1px solid var(--color-ink)" : "1px solid rgba(10,10,10,0.08)",
                  }}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="mb-2 opacity-80 group-hover:opacity-100 transition-opacity">
                    {tool.icon}
                  </div>
                  <div className="text-[15px] font-medium text-[var(--color-ink)]">{tool.name}</div>
                  <div className="text-[11px] text-[#AEB7BC] font-mono tracking-widest uppercase">{tool.category}</div>
                  
                  {isConnecting ? (
                    <CircleNotch size={16} className="animate-spin text-[var(--color-ink)] mt-2" />
                  ) : isConnected ? (
                    <Check size={16} weight="bold" className="text-[var(--color-ink)] mt-2" />
                  ) : (
                    <LinkIcon size={16} className="text-[rgba(10,10,10,0.2)] mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between w-full max-w-2xl mx-auto mt-12 pt-8 border-t border-[rgba(10,10,10,0.06)]">
            <Link
              href="/onboard/step-1"
              className="flex items-center gap-2 text-[13px] text-[#3B4043] hover:text-[var(--color-ink)] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back</span>
            </Link>

            <motion.button
              onClick={handleContinue}
              disabled={!canContinue || isProceeding}
              className="text-[14px] font-medium text-white bg-[#111315] hover:bg-[#2A2E33] transition-colors h-[44px] px-8 rounded-full flex items-center justify-center gap-3 disabled:opacity-30 disabled:hover:bg-[#111315]"
              whileTap={canContinue ? { scale: 0.98 } : {}}
            >
              {isProceeding ? (
                <span>Setting up workspace...</span>
              ) : (
                <>
                  <span>{canContinue ? "Launch workspace" : "Connect one tool"}</span>
                  {canContinue && <ArrowRight size={14} weight="bold" />}
                </>
              )}
            </motion.button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
