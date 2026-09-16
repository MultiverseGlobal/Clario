import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, X, ChevronRight, Mail, MessageSquare, RefreshCw, 
  Send, Sparkles, Building2, User, Globe, Check, ArrowRight 
} from "lucide-react";
import type { DiscoveredLead, OutreachDraft } from "@/services/campaignEngine";
import { soundManager } from "@/lib/audioFeedback";
import { StaggerGroup } from "@/components/atlas/StaggerGroup";

interface InterventionDrawerProps {
  isOpen: boolean;
  lead: DiscoveredLead | null;
  draft: OutreachDraft | null;
  onApprove: (draft: OutreachDraft, recipientEmail: string) => void;
  onRegenerate: () => void;
  onSkip: () => void;
  onClose: () => void;
  isDispatching?: boolean;
  isDark?: boolean;
}

export function InterventionDrawer({
  isOpen,
  lead,
  draft,
  onApprove,
  onRegenerate,
  onSkip,
  onClose,
  isDispatching = false,
  isDark = true,
}: InterventionDrawerProps) {
  const [channel, setChannel] = useState<"email" | "linkedin" | "clario_script">("email");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [allowUnverifiedEmail, setAllowUnverifiedEmail] = useState(false);

  const emailAllowed = lead?.contact ? lead.contact.send_email_allowed : true;

  useEffect(() => {
    if (draft && isOpen) {
      setSubject(draft.subject || "");
      // If email is gated, default to linkedin
      const activeChannel = !emailAllowed && channel === "email" ? "linkedin" : channel;
      if (!emailAllowed && channel === "email") {
        setChannel("linkedin");
      }

      const fullText = activeChannel === "email" 
        ? draft.body 
        : activeChannel === "linkedin" 
        ? (draft.linkedin_dm || draft.body) 
        : (draft.loom_script || "");
      
      setBody(fullText);
      setIsStreaming(false);
    }
    if (lead?.founder?.email) {
      setRecipientEmail(lead.founder.email);
    }
  }, [draft, lead, channel, isOpen, emailAllowed]);

  const completeStreamingImmediately = () => {
    if (isStreaming && draft) {
      setIsStreaming(false);
      setBody(
        channel === "email" 
          ? draft.body 
          : channel === "linkedin" 
          ? (draft.linkedin_dm || draft.body) 
          : (draft.loom_script || "")
      );
    }
  };

  // Keyboard shortcut: Cmd/Ctrl + Enter to approve
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        handleApprove();
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, subject, body, recipientEmail, channel, emailAllowed, allowUnverifiedEmail]);

  const handleChannelSwitch = (newChannel: "email" | "linkedin" | "clario_script") => {
    soundManager.playClick();
    setChannel(newChannel);
    if (draft) {
      setBody(
        newChannel === "email" 
          ? draft.body 
          : newChannel === "linkedin" 
          ? (draft.linkedin_dm || draft.body) 
          : (draft.loom_script || "")
      );
    }
  };

  const handleCopy = () => {
    soundManager.playClick();
    navigator.clipboard.writeText(body);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleApprove = () => {
    soundManager.playSuccess();
    onApprove(
      {
        subject,
        body,
        linkedin_dm: draft?.linkedin_dm,
      },
      recipientEmail
    );
  };

  return typeof document !== "undefined" ? createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[998] bg-black/60 backdrop-blur-md dark:bg-black/80"
            onClick={onClose}
          />

          {/* Centered Modal Panel */}
          <motion.div
            initial={{ y: 50, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 280, damping: 28, mass: 1 }}
            className={`fixed inset-0 m-auto z-[999] w-full max-w-xl h-fit max-h-[85vh] rounded-3xl border flex flex-col shadow-2xl overflow-hidden ${
              isDark
                ? "bg-[#0c0d12] text-white"
                : "bg-white text-neutral-900"
            } ${
              isDispatching ? "border-emerald-500/50 shadow-[0_30px_80px_-20px_rgba(16,185,129,0.25)]" : (isDark ? "border-white/10 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]" : "border-neutral-200 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)]")
            } transition-colors duration-300`}
          >
            {/* Header */}
            <div className={`flex items-center justify-between border-b px-6 py-4 ${
              isDark ? "border-white/10" : "border-neutral-200"
            }`}>
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground text-background">
                  <AlertCircle className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 className="font-display text-sm tracking-tight font-semibold flex items-center gap-2">
                    Human Review Required
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                className={`rounded-full p-2 transition-colors cursor-pointer ${
                  isDark ? "text-white/40 hover:bg-white/5 hover:text-white" : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Body */}
            <StaggerGroup className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {/* Target Prospect Info Card */}
              {lead && (
                <div className={`rounded-xl border p-4 space-y-4 ${
                  isDark ? "border-white/10 bg-black/40" : "border-neutral-200 bg-white"
                }`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="h-3.5 w-3.5 text-foreground opacity-70" />
                        <span className="font-display text-sm font-semibold tracking-tight">{lead.company}</span>
                      </div>
                      <a
                        href={lead.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] font-mono opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
                      >
                        <Globe className="h-3 w-3" />
                        {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                      </a>
                    </div>
                    {lead.icp_score && (
                      <span className="font-mono text-[10px] text-background bg-foreground px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                        {lead.icp_score}% FIT
                      </span>
                    )}
                  </div>

                  <div className={`flex flex-col gap-1 text-xs border-t pt-3 ${
                    isDark ? "border-white/10 text-white/80" : "border-neutral-200 text-neutral-700"
                  }`}>
                    <div className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 opacity-50" />
                      <span className="font-semibold">{lead.founder?.name}</span>
                      <span className="opacity-40">•</span>
                      <span className="opacity-70">{lead.founder?.role}</span>
                    </div>
                  </div>

                  {lead.bottleneck && (
                    <div className={`text-[10px] rounded p-2.5 font-mono leading-relaxed ${
                      isDark ? "bg-white/5 text-white/70" : "bg-neutral-100 text-neutral-600"
                    }`}>
                      <span className="text-foreground font-bold uppercase tracking-wider block mb-1">Observed Bottleneck:</span>
                      {lead.bottleneck}
                    </div>
                  )}
                </div>
              )}

              {/* Human Reviewer Summary (Stage 2 Intelligence) */}
              {draft?.human_summary && (
                <div className={`rounded-2xl border p-3.5 space-y-1.5 ${
                  isDark ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-emerald-300 bg-emerald-50 text-emerald-900"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                      Executive Reviewer Summary
                    </span>
                    {draft.outreach_readiness && (
                      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full ${
                        draft.outreach_readiness === "READY"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      }`}>
                        {draft.outreach_readiness}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-sans leading-relaxed">
                    {draft.human_summary}
                  </p>
                </div>
              )}

              {/* Channel Selector */}
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono uppercase tracking-wider font-semibold ${
                  isDark ? "text-white/40" : "text-neutral-400"
                }`}>
                  Outreach Medium
                </span>
                <div className={`flex items-center rounded-lg border p-1 ${
                  isDark ? "border-white/10 bg-black/40" : "border-neutral-200 bg-neutral-100"
                }`}>
                  <button
                    onClick={() => handleChannelSwitch("email")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[11px] rounded uppercase tracking-wider transition-all cursor-pointer ${
                      channel === "email"
                        ? isDark
                          ? "bg-white text-black font-bold shadow-sm"
                          : "bg-black text-white font-bold shadow-sm"
                        : isDark
                        ? "text-white/50 hover:text-white"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    <Mail className="h-3 w-3" />
                    Email
                  </button>
                  <button
                    onClick={() => handleChannelSwitch("linkedin")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[11px] rounded uppercase tracking-wider transition-all cursor-pointer ${
                      channel === "linkedin"
                        ? isDark
                          ? "bg-white text-black font-bold shadow-sm"
                          : "bg-black text-white font-bold shadow-sm"
                        : isDark
                        ? "text-white/50 hover:text-white"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    <MessageSquare className="h-3 w-3" />
                    LinkedIn
                  </button>
                  <button
                    onClick={() => handleChannelSwitch("clario_script")}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[11px] rounded uppercase tracking-wider transition-all cursor-pointer ${
                      channel === "clario_script"
                        ? isDark
                          ? "bg-indigo-400 text-black font-bold shadow-sm"
                          : "bg-indigo-600 text-white font-bold shadow-sm"
                        : isDark
                        ? "text-white/50 hover:text-white"
                        : "text-neutral-500 hover:text-neutral-900"
                    }`}
                  >
                    <Sparkles className="h-3 w-3 text-indigo-400" />
                    Clario Video
                  </button>
                </div>
              </div>

              {/* Email Gating Alert */}
              {channel === "email" && !emailAllowed && (
                <div className="p-3.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-500 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <span className="font-bold block uppercase font-mono text-[10px] tracking-wider">Email Gated · Address Unverified</span>
                    <p className="text-[11px] leading-relaxed text-amber-600 dark:text-amber-400">
                      Atlas hard-gates outbound emails when email authenticity is unverified, protecting your domain from bounce penalties. Send via LinkedIn DM instead, or manually verify before dispatch.
                    </p>
                    <label className="flex items-center gap-2 pt-1 cursor-pointer font-mono text-[10px] text-foreground">
                      <input 
                        type="checkbox" 
                        checked={allowUnverifiedEmail} 
                        onChange={(e) => setAllowUnverifiedEmail(e.target.checked)} 
                        className="rounded border-amber-500"
                      />
                      <span>Acknowledge unverified address & override sending gate</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Clario Video Protocol Explanation */}
              {channel === "clario_script" && (
                <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                  isDark ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-300" : "border-indigo-200 bg-indigo-50 text-indigo-900"
                }`}>
                  <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Clario 60–90s Spoken Workflow Protocol</span>
                  </div>
                  <p className="text-[11px]">
                    Spoken script for {lead?.company}. Focuses on showing the actual workflow resolution rather than pitching. Embed URL token <code className="font-mono text-[10px] bg-black/20 px-1 py-0.5 rounded">{"{{CLARIO_VIDEO_URL}}"}</code> is embedded in the outbound email copy.
                  </p>
                </div>
              )}

              {/* Recipient Address */}
              {channel === "email" && (
                <div className="space-y-1.5">
                  <label className={`text-xs font-mono uppercase tracking-wider font-medium ${
                    isDark ? "text-white/40" : "text-neutral-400"
                  }`}>
                    Recipient Address
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="prospect@company.com"
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-mono focus:outline-none transition-colors ${
                      isDark
                        ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                        : "border-neutral-200 bg-neutral-50 text-neutral-900 focus:border-neutral-400"
                    }`}
                  />
                </div>
              )}

              {/* Subject Line */}
              {channel === "email" && (
                <div className="space-y-1.5">
                  <label className={`text-xs font-mono uppercase tracking-wider font-medium ${
                    isDark ? "text-white/40" : "text-neutral-400"
                  }`}>
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className={`w-full rounded-xl border px-3 py-2 text-xs font-medium focus:outline-none transition-colors ${
                      isDark
                        ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                        : "border-neutral-200 bg-neutral-50 text-neutral-900 focus:border-neutral-400"
                    }`}
                  />
                </div>
              )}

              {/* Message Body */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className={`text-xs font-mono uppercase tracking-wider font-medium flex items-center gap-1.5 ${
                      isDark ? "text-white/40" : "text-neutral-400"
                    }`}>
                      <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                      {channel === "clario_script" ? "Clario Spoken Demo Script" : "Personalized Pitch Copy"}
                    </label>
                    {isStreaming && (
                      <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Synthesizing
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {isStreaming && (
                      <button
                        onClick={completeStreamingImmediately}
                        className={`text-[11px] font-mono transition-colors cursor-pointer ${
                          isDark ? "text-white/50 hover:text-white" : "text-neutral-500 hover:text-neutral-900"
                        }`}
                      >
                        Instant
                      </button>
                    )}
                    <button
                      onClick={handleCopy}
                      className={`text-[11px] font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                        isDark ? "text-white/50 hover:text-white" : "text-neutral-500 hover:text-neutral-900"
                      }`}
                    >
                      {isCopied ? <Check className="h-3 w-3 text-emerald-500" /> : null}
                      {isCopied ? "Copied" : "Copy text"}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={body}
                    onChange={(e) => {
                      if (!isStreaming) setBody(e.target.value);
                    }}
                    onFocus={completeStreamingImmediately}
                    readOnly={isStreaming}
                    className={`w-full h-48 resize-none rounded-xl border p-4 text-xs font-medium leading-relaxed focus:outline-none transition-colors ${
                      isDark
                        ? "border-white/10 bg-black/40 text-white focus:border-white/30"
                        : "border-neutral-200 bg-neutral-50 text-neutral-900 focus:border-neutral-400"
                    } ${isStreaming ? "animate-pulse border-emerald-500/50" : ""}`}
                    placeholder="Message content..."
                  />
                  {isStreaming && (
                    <span className="absolute bottom-3 right-3 flex items-center gap-1 font-mono text-[10px] text-emerald-500/80">
                      <span className="inline-block w-1.5 h-3 bg-emerald-500 animate-pulse" />
                    </span>
                  )}
                </div>

                {/* Synthesis Telemetry Bar with Live Word Counter */}
                <div className={`flex items-center justify-between text-[10px] font-mono px-1 ${
                  isDark ? "text-white/35" : "text-neutral-400"
                }`}>
                  <span>Atlas Cognitive Engine v3</span>
                  <div className="flex items-center gap-2">
                    {channel === "email" ? (
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        body.trim().split(/\s+/).filter(Boolean).length <= 130 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : "bg-rose-500/20 text-rose-400"
                      }`}>
                        {body.trim().split(/\s+/).filter(Boolean).length} / 130 words cap
                      </span>
                    ) : channel === "linkedin" ? (
                      <span className={`px-1.5 py-0.5 rounded font-bold ${
                        body.trim().split(/\s+/).filter(Boolean).length <= 60 
                          ? "bg-emerald-500/10 text-emerald-400" 
                          : "bg-rose-500/20 text-rose-400"
                      }`}>
                        {body.trim().split(/\s+/).filter(Boolean).length} / 60 words cap
                      </span>
                    ) : (
                      <span className="text-indigo-400 font-bold">
                        ~{Math.round(body.trim().split(/\s+/).filter(Boolean).length / 2.2)}s spoken video script
                      </span>
                    )}
                    <span>•</span>
                    <span className="text-emerald-500">Resend Relay Ready</span>
                  </div>
                </div>
              </div>

              {/* Secondary Options */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onRegenerate();
                  }}
                  className={`text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer ${
                    isDark ? "text-white/50 hover:text-emerald-400" : "text-neutral-500 hover:text-neutral-900"
                  }`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Regenerate Angle
                </button>
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onSkip();
                  }}
                  className={`text-xs font-mono flex items-center gap-1 transition-colors cursor-pointer ${
                    isDark ? "text-white/40 hover:text-white/70" : "text-neutral-400 hover:text-neutral-700"
                  }`}
                >
                  <span>Skip Target</span>
                  <ChevronRight className="h-3 w-3" />
                </button>
              </div>
            </StaggerGroup>

            {/* Footer Actions */}
            <div className={`border-t p-4 space-y-2 ${isDark ? "border-white/10 bg-neutral-950/95" : "border-neutral-200 bg-white/95"}`}>
              {channel === "email" && !emailAllowed && !allowUnverifiedEmail ? (
                <button
                  disabled={true}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/30 px-4 py-3 text-xs font-semibold text-amber-400 cursor-not-allowed"
                >
                  <AlertCircle className="h-4 w-4 text-amber-400" />
                  Email Gated · Send via LinkedIn DM or Check Override
                </button>
              ) : channel === "clario_script" ? (
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-3 text-xs font-semibold text-white hover:bg-indigo-600 transition-colors cursor-pointer shadow-md"
                >
                  <Check className="h-4 w-4" />
                  {isCopied ? "Copied Clario Walkthrough Script!" : "Copy Clario Walkthrough Script"}
                </button>
              ) : (
                <button
                  onClick={handleApprove}
                  disabled={isDispatching || isStreaming || !body}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-3 text-xs font-semibold text-background hover:bg-foreground/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
                >
                  {isDispatching ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  )}
                  {isDispatching ? "Dispatching..." : `Approve & Dispatch via ${channel.toUpperCase()}`}
                  <span className="ml-2 rounded border border-background/20 bg-background/10 px-1.5 py-0.5 text-[10px] font-mono opacity-80">
                    ⌘↵
                  </span>
                </button>
              )}
              
              <button
                onClick={onSkip}
                disabled={isDispatching}
                className={`w-full rounded-xl px-4 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors disabled:opacity-50 cursor-pointer ${
                  isDark ? "text-white/40 hover:bg-white/5 hover:text-white" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                Keep Paused in Workspace
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  ) : null;
}
