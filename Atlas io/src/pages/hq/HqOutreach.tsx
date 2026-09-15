import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Search, Filter, Mail, CheckCircle2, Clock, ExternalLink,
  Copy, Check, ArrowRight, RefreshCw, Sparkles, AlertCircle,
  MessageSquare, User, Building, Film, X, ChevronRight, Download
} from "lucide-react";
import {
  getStoredOutreachRecords,
  updateOutreachStatus,
  type OutreachRecord
} from "@/services/outreachStore";
import { useTheme } from "@/hooks/useTheme";
import { soundManager } from "@/lib/audioFeedback";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";

export default function HqOutreach() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [records, setRecords] = useState<OutreachRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<OutreachRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load records and subscribe to live dispatch events
  const refreshRecords = useCallback(() => {
    const data = getStoredOutreachRecords();
    setRecords(data);
  }, []);

  useEffect(() => {
    refreshRecords();

    const handleUpdate = () => {
      refreshRecords();
    };

    window.addEventListener("atlas_outreach_updated", handleUpdate);
    return () => window.removeEventListener("atlas_outreach_updated", handleUpdate);
  }, [refreshRecords]);

  // Copy helper
  const handleCopy = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    soundManager.playClick();
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Status update handler
  const handleStatusChange = (id: string, newStatus: OutreachRecord["status"]) => {
    const updated = updateOutreachStatus(id, newStatus);
    if (updated) {
      soundManager.playSuccess();
      toast.success(`Updated status to ${newStatus.toUpperCase()}`);
      if (selectedRecord?.id === id) {
        setSelectedRecord(updated);
      }
      refreshRecords();
    }
  };

  // Filtered list
  const filteredRecords = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return records.filter((r) => {
      // Status filter
      if (statusFilter !== "all" && r.status !== statusFilter) return false;

      // Channel filter
      if (channelFilter !== "all") {
        if (channelFilter === "clario_video" && !r.clario_video_url) return false;
        if (channelFilter !== "clario_video" && r.channel !== channelFilter) return false;
      }

      // Search query
      if (!q) return true;
      return (
        r.company_name.toLowerCase().includes(q) ||
        r.recipient_name.toLowerCase().includes(q) ||
        r.recipient_email.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.campaign_prompt.toLowerCase().includes(q)
      );
    });
  }, [records, searchQuery, statusFilter, channelFilter]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = records.length;
    const delivered = records.filter((r) => ["delivered", "opened", "replied"].includes(r.status)).length;
    const replied = records.filter((r) => r.status === "replied").length;
    const opened = records.filter((r) => ["opened", "replied"].includes(r.status)).length;

    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 100;
    const replyRate = delivered > 0 ? Math.round((replied / delivered) * 100) : 0;

    return { total, delivered, replied, opened, deliveryRate, replyRate };
  }, [records]);

  // Export JSON
  const handleExport = () => {
    soundManager.playClick();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `atlas-outreach-ledger-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    toast.success("Outreach ledger exported successfully!");
  };

  return (
    <div className="min-h-screen w-full p-4 sm:p-6 lg:p-10 pt-20 max-w-7xl mx-auto flex flex-col gap-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-foreground/10 border border-border flex items-center justify-center">
              <Send className="w-4 h-4 text-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground font-sans">
              Outreach Tracker & Ledger
            </h1>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-semibold uppercase">
              Live Gateway
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 font-mono">
            Full audit log of all autonomous & supervised outreach dispatches, deliverability status, and conversation tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border/60 hover:bg-muted text-xs font-mono text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch New Flow</span>
          </button>
        </div>
      </div>

      {/* ── Metric Performance Cards ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card/70 border border-border/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Total Dispatched</span>
            <Send className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">{metrics.total}</span>
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">+100% verified</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/70 border border-border/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Delivery Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">{metrics.deliveryRate}%</span>
            <span className="text-[10px] font-mono text-muted-foreground">Gmail / Resend</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/70 border border-border/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Opened / Engaged</span>
            <Mail className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">{metrics.opened}</span>
            <span className="text-[10px] font-mono text-purple-500 font-semibold">Active interest</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/70 border border-border/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Direct Replies</span>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-500">{metrics.replied}</span>
            <span className="text-[10px] font-mono text-emerald-500 font-semibold">{metrics.replyRate}% reply rate</span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Surface ─────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card/60 border border-border/50 p-2.5 rounded-2xl backdrop-blur-md">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by company, founder, email, or campaign topic..."
            className="w-full pl-9 pr-8 py-1.5 text-xs font-mono rounded-xl bg-background/80 border border-border/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {[
            { id: "all", label: "All Status" },
            { id: "delivered", label: "Delivered" },
            { id: "replied", label: "Replied" },
            { id: "opened", label: "Opened" },
            { id: "sent", label: "Sent" },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setStatusFilter(st.id)}
              className={`px-3 py-1 rounded-xl text-[11px] font-mono transition-all whitespace-nowrap cursor-pointer ${
                statusFilter === st.id
                  ? "bg-foreground text-background font-semibold shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Outreach Ledger Table ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-md overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                <th className="py-3 px-4 font-semibold">Target Company</th>
                <th className="py-3 px-4 font-semibold">Recipient</th>
                <th className="py-3 px-4 font-semibold">Subject & Angle</th>
                <th className="py-3 px-4 font-semibold">Channel</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Dispatched</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-xs font-mono">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Send className="w-8 h-8 text-muted-foreground/40 mb-1" />
                      <span className="font-semibold text-foreground">No outreach records found</span>
                      <span className="text-[11px]">
                        {searchQuery ? `No results match "${searchQuery}"` : "Launch a campaign from Command Feed to start recording outreach."}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((item) => {
                  const isSelected = selectedRecord?.id === item.id;
                  const dateStr = item.sent_at
                    ? formatDistanceToNow(new Date(item.sent_at), { addSuffix: true })
                    : "Recently";

                  return (
                    <tr
                      key={item.id}
                      onClick={() => {
                        setSelectedRecord(item);
                        soundManager.playClick();
                      }}
                      className={`group transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-muted/80 text-foreground"
                          : "hover:bg-muted/40 text-foreground/90"
                      }`}
                    >
                      {/* Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-muted border border-border flex items-center justify-center font-bold text-xs uppercase text-foreground shrink-0">
                            {item.company_name.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1">
                              <span>{item.company_name}</span>
                              {item.website && (
                                <a
                                  href={item.website}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                              {item.campaign_prompt}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-3.5 px-4">
                        <div>
                          <div className="font-medium text-foreground">{item.recipient_name}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <span>{item.recipient_email}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(item.recipient_email, `email-${item.id}`);
                              }}
                              className="text-muted-foreground hover:text-foreground p-0.5"
                              title="Copy email"
                            >
                              {copiedField === `email-${item.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Angle */}
                      <td className="py-3.5 px-4 max-w-[280px]">
                        <div className="font-medium text-foreground truncate">{item.subject}</div>
                        <div className="text-[10px] text-muted-foreground truncate opacity-70">
                          {item.body.replace(/\n+/g, " ").slice(0, 70)}...
                        </div>
                      </td>

                      {/* Channel */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {item.clario_video_url ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                              <Film className="w-3 h-3" /> Clario Video
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              <Mail className="w-3 h-3" /> Email
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground/60">({item.delivery_provider})</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {item.status === "replied" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            REPLIED
                          </span>
                        )}
                        {item.status === "delivered" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            DELIVERED
                          </span>
                        )}
                        {item.status === "opened" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-semibold">
                            <Mail className="w-3 h-3" />
                            OPENED
                          </span>
                        )}
                        {item.status === "sent" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px]">
                            SENT
                          </span>
                        )}
                      </td>

                      {/* Dispatched */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-muted-foreground text-[11px]">
                        {dateStr}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRecord(item);
                            soundManager.playClick();
                          }}
                          className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground text-[11px] font-medium transition-colors"
                        >
                          Inspect →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Slide-Over Email / DM Inspector Drawer ─────────────────────────── */}
      <AnimatePresence>
        {selectedRecord && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRecord(null)}
              className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-xl z-50 bg-card border-l border-border/80 shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-border/60 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-muted border border-border flex items-center justify-center font-bold text-xs uppercase text-foreground">
                    {selectedRecord.company_name.slice(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground text-sm font-sans flex items-center gap-2">
                      <span>{selectedRecord.company_name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-semibold">
                        {selectedRecord.status}
                      </span>
                    </h3>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      Dispatched {selectedRecord.sent_at ? format(new Date(selectedRecord.sent_at), "PPpp") : "Recently"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
                {/* Target Recipient Card */}
                <div className="p-4 rounded-xl bg-background/70 border border-border/60 space-y-3">
                  <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                    <span>Recipient Information</span>
                    <span className="text-emerald-500">{selectedRecord.delivery_provider} Verified</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Contact</span>
                      <span className="font-semibold text-foreground">{selectedRecord.recipient_name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{selectedRecord.recipient_role}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Destination Email</span>
                      <div className="flex items-center gap-1.5 text-foreground font-semibold">
                        <span className="truncate">{selectedRecord.recipient_email}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(selectedRecord.recipient_email, "drawer-email")}
                          className="text-muted-foreground hover:text-foreground"
                          title="Copy Email"
                        >
                          {copiedField === "drawer-email" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Campaign Strategy Prompt */}
                <div className="p-3.5 rounded-xl bg-muted/30 border border-border/40">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">
                    Campaign Origin Intent
                  </span>
                  <p className="text-foreground/90 leading-relaxed font-sans italic text-xs">
                    "{selectedRecord.campaign_prompt}"
                  </p>
                </div>

                {/* Message Content */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Dispatched Message Body
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(`${selectedRecord.subject}\n\n${selectedRecord.body}`, "full-body")}
                      className="flex items-center gap-1 text-[11px] text-foreground hover:underline cursor-pointer"
                    >
                      {copiedField === "full-body" ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>Copy Full Email</span>
                    </button>
                  </div>

                  <div className="rounded-xl bg-background border border-border/70 p-4 space-y-3 shadow-inner">
                    <div className="border-b border-border/50 pb-2">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Subject</span>
                      <span className="font-semibold text-foreground font-sans text-sm">{selectedRecord.subject}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold mb-1">Body</span>
                      <p className="font-sans text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                        {selectedRecord.body}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Clario Walkthrough (if present) */}
                {selectedRecord.clario_video_url && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Film className="w-4 h-4 text-purple-400" />
                      <div>
                        <span className="text-xs font-semibold text-purple-300 block">Personalized Walkthrough Attached</span>
                        <span className="text-[10px] text-purple-400/80 font-mono">{selectedRecord.clario_video_url}</span>
                      </div>
                    </div>
                    <a
                      href={selectedRecord.clario_video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs font-semibold hover:bg-purple-500 transition-colors"
                    >
                      Preview Video
                    </a>
                  </div>
                )}

                {/* Engagement Status Toggles */}
                <div className="p-4 rounded-xl bg-card border border-border/60 space-y-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Update Conversation Outcome
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedRecord.id, "replied")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        selectedRecord.status === "replied"
                          ? "bg-emerald-500 text-black font-bold shadow-md"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark as Replied</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedRecord.id, "opened")}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        selectedRecord.status === "opened"
                          ? "bg-purple-600 text-white font-bold shadow-md"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Mark Opened</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStatusChange(selectedRecord.id, "delivered")}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Reset Delivered
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-border/60 bg-muted/20 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">
                  Follow-up Rule: +3 Business Days
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
