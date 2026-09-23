"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Activity, ExternalLink, Plus, X, CheckCircle2, Terminal, ArrowRight } from "lucide-react";
import Link from "next/link";

interface ConnectedTool {
  id: string;
  name: string;
  category: string;
  permissions: string;
  lastActive: string;
  status: "active" | "idle" | "error";
  endpoint?: string;
  capabilities: string[];
  icon: React.ReactNode;
}

const TOOLS: ConnectedTool[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    category: "Reasoning Engine",
    permissions: "Full read & write context",
    lastActive: "4 mins ago",
    status: "active",
    endpoint: "https://chatgpt.com/connector/oauth/callback",
    capabilities: ["Graph RAG querying", "Decision extraction", "Handoff synthesis", "PR drafting"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3428 7.897a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3428 7.897zm16.5986 3.8558L13.1038 8.3843l2.0153-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.4022-.6814zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.4084 9.2312V6.8988a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6814l-.0048 6.7226zm1.107-1.4244l2.5843-1.4904 2.5843 1.4904v2.9808l-2.5843 1.4904-2.5843-1.4904z" />
      </svg>
    ),
  },
  {
    id: "claude",
    name: "Claude",
    category: "Architecture & Review",
    permissions: "Full read & write context",
    lastActive: "18 mins ago",
    status: "active",
    endpoint: "https://claude.ai/oauth/callback",
    capabilities: ["Architectural contract validation", "Constraint enforcement", "Code review"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M13.527 2.22c.328 0 .618.21.716.52l1.968 6.208 6.209 1.968c.31.098.52.388.52.716s-.21.618-.52.716l-6.209 1.968-1.968 6.209c-.098.31-.388.52-.716.52s-.618-.21-.716-.52l-1.968-6.209-6.209-1.968c-.31-.098-.52-.388-.52-.716s.21-.618.52-.716l6.209-1.968 1.968-6.208c.098-.31.388-.52.716-.52z" />
      </svg>
    ),
  },
  {
    id: "github",
    name: "GitHub",
    category: "Repository & CI/CD",
    permissions: "Read-only repository access",
    lastActive: "1 hour ago",
    status: "active",
    endpoint: "https://api.github.com/repos/pseudonyms/metaphor",
    capabilities: ["Branch state tracking", "Commit event indexing", "PR body syncing"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
        />
      </svg>
    ),
  },
  {
    id: "notion",
    name: "Notion",
    category: "Knowledge Base",
    permissions: "Read-only docs access",
    lastActive: "3 hours ago",
    status: "idle",
    endpoint: "https://api.notion.com/v1",
    capabilities: ["PRD parsing", "Requirement extraction", "Decision log ingestion"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.334-.84c1.12-.093 1.213.373 1.026.933l-2.053 13.067c-.187.933-.653 1.306-1.587 1.4l-11.427.746c-.933.093-1.306-.373-1.12-1.306l1.399-9.147-1.306.094c-.653.093-.933-.28-.746-.84.28-.746.84-1.306 1.306-1.866l-.254-2.707zm5.507 3.547l-3.36 4.853v4.666l4.2-4.946v-4.573zm4.667-.374l-4.2 5.04v4.573l3.36-4.853v-4.76zm1.12-.093v4.76l-3.267 4.76 4.2-.28.84-5.32c.187-.934.093-1.307-.84-1.307l-.933.147v-2.753z" />
      </svg>
    ),
  },
  {
    id: "cursor",
    name: "Cursor",
    category: "Code Editor",
    permissions: "Full editor context sync",
    lastActive: "Just now",
    status: "active",
    endpoint: "http://localhost:9222/callback",
    capabilities: ["Active cursor buffer tracking", "Diagnostics streaming", "IDE boundary transfer"],
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--color-ink)">
        <path d="M12 1.5L2.5 7.02v10.16L12 22.7l9.5-5.52V7.02L12 1.5zm0 2.38l6.98 4.06L12 12.01 5.02 7.94 12 3.88zm-7.5 5.5l6.5 3.77v7.54l-6.5-3.77V9.38zm8.5 11.31v-7.54l6.5-3.77v7.54l-6.5 3.77z" />
      </svg>
    ),
  },
];

export default function ToolsPage() {
  const [tools, setTools] = useState<ConnectedTool[]>(TOOLS);
  const [inspectingTool, setInspectingTool] = useState<ConnectedTool | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-16 md:py-24 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[rgba(10,10,10,0.06)] mb-12">
        <div>
          <div className="text-[11px] font-mono tracking-widest uppercase text-[#AEB7BC] mb-2">
            Workspace &middot; Registry
          </div>
          <h1
            className="font-display text-[clamp(36px,4vw,48px)] leading-[1.05] tracking-[-0.01em] text-[var(--color-ink)]"
            style={{ fontWeight: 400 }}
          >
            Tools &amp; Capabilities.
          </h1>
          <p className="text-[15px] text-[#555E64] mt-2 max-w-xl">
            Autonomous participants and services operating within your connected context graph.
          </p>
        </div>

        <Link
          href="/connections"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-[rgba(10,10,10,0.12)] bg-white/80 hover:bg-white hover:border-[var(--color-ink)] transition-all text-[13px] font-medium text-[var(--color-ink)] shadow-sm shrink-0"
        >
          <Plus size={14} />
          <span>Connect tool</span>
        </Link>
      </div>

      {/* Demonstration / Telemetry Notice */}
      <div className="mb-8 p-4 rounded-xl bg-black/[0.02] border border-[rgba(10,10,10,0.06)] flex items-center justify-between text-[12px] text-[#555E64]">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>
            Showing verified participants in coordination mesh. Manage MCP endpoints and credentials in{" "}
            <Link href="/connections" className="text-[var(--color-ink)] underline underline-offset-2">
              Connections
            </Link>
            .
          </span>
        </div>
        <span className="font-mono text-[#AEB7BC] text-[11px] hidden sm:inline">[Active Registry]</span>
      </div>

      {/* Tools Table / Minimal Row List */}
      <div className="flex flex-col divide-y divide-[rgba(10,10,10,0.06)]">
        {tools.map((tool) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:bg-black/[0.01] px-3 -mx-3 rounded-lg transition-colors"
          >
            {/* Left: Icon and Name */}
            <div className="flex items-center gap-4 min-w-[240px]">
              <div className="w-10 h-10 rounded-xl bg-black/[0.03] border border-[rgba(10,10,10,0.06)] flex items-center justify-center text-[var(--color-ink)] shrink-0">
                {tool.icon}
              </div>
              <div>
                <h3 className="text-[15px] font-medium text-[var(--color-ink)] tracking-tight">
                  {tool.name}
                </h3>
                <span className="text-[12px] text-[#AEB7BC] font-mono">
                  {tool.category}
                </span>
              </div>
            </div>

            {/* Middle: Permissions & Activity */}
            <div className="flex items-center gap-6 text-[12px] text-[#555E64]">
              <div className="flex items-center gap-1.5">
                <Shield size={13} className="text-[#AEB7BC]" />
                <span>{tool.permissions}</span>
              </div>
              <div className="hidden md:flex items-center gap-1.5 font-mono text-[#AEB7BC]">
                <Activity size={13} />
                <span>{tool.lastActive}</span>
              </div>
            </div>

            {/* Right: Status and Configure */}
            <div className="flex items-center gap-4 justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    tool.status === "active" ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                />
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#555E64]">
                  {tool.status}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setInspectingTool(tool)}
                className="text-[12px] font-medium text-[#555E64] group-hover:text-[var(--color-ink)] hover:underline px-2 py-1 transition-colors cursor-pointer"
              >
                Inspect
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tool Inspection Modal / Drawer */}
      <AnimatePresence>
        {inspectingTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/25 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInspectingTool(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl border border-[rgba(10,10,10,0.1)] p-6 md:p-8 max-w-lg w-full shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[rgba(10,10,10,0.06)] mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black/[0.03] border border-[rgba(10,10,10,0.08)] flex items-center justify-center">
                    {inspectingTool.icon}
                  </div>
                  <div>
                    <h3 className="text-[17px] font-medium text-[var(--color-ink)]">
                      {inspectingTool.name}
                    </h3>
                    <span className="text-[12px] text-[#AEB7BC] font-mono">
                      {inspectingTool.category}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingTool(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[#6B7280] hover:text-[var(--color-ink)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4 text-[13px] text-[#555E64]">
                <div>
                  <span className="text-[11px] font-mono uppercase text-[#AEB7BC] block mb-1">
                    Permissions &amp; Scopes
                  </span>
                  <div className="p-3 rounded-xl bg-black/[0.02] border border-[rgba(10,10,10,0.06)] text-[var(--color-ink)] font-mono text-[12px]">
                    {inspectingTool.permissions}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-mono uppercase text-[#AEB7BC] block mb-1">
                    Coordination Capabilities
                  </span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {inspectingTool.capabilities.map((c, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] border border-indigo-100"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>

                {inspectingTool.endpoint && (
                  <div>
                    <span className="text-[11px] font-mono uppercase text-[#AEB7BC] block mb-1">
                      Endpoint URI
                    </span>
                    <div className="p-2.5 rounded-lg bg-black/[0.03] font-mono text-[11px] text-[var(--color-ink)] truncate">
                      {inspectingTool.endpoint}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-[rgba(10,10,10,0.06)] flex items-center justify-between">
                  <Link
                    href="/connections"
                    className="text-[12px] font-mono text-[var(--color-ink)] hover:underline flex items-center gap-1.5"
                  >
                    <span>Configure in Connections</span>
                    <ArrowRight size={13} />
                  </Link>

                  <button
                    onClick={() => setInspectingTool(null)}
                    className="px-5 py-2 rounded-full bg-[var(--color-ink)] text-white text-[12px] font-medium cursor-pointer hover:bg-black transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
