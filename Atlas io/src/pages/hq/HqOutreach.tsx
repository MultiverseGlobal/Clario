import { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Search, Filter, Mail, CheckCircle2, Clock, ExternalLink,
  Copy, Check, ArrowRight, RefreshCw, Sparkles, AlertCircle,
  MessageSquare, User, Building, Film, X, ChevronRight, Download,
  Plus, Trash2
} from "lucide-react";
import {
  fetchOutreachRecords,
  updateOutreachStatus,
  deleteOutreachRecord,
  clearAllOutreachRecords,
  recordOutreachDispatch,
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
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  // New outreach form state
  const [formCompany, setFormCompany] = useState("");
  const [formRecipient, setFormRecipient] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState("");
  const [formSubject, setFormSubject] = useState("");
  const [formBody, setFormBody] = useState("");
  const [formChannel, setFormChannel] = useState<"email" | "linkedin" | "clario_video">("email");
  const [formStatus, setFormStatus] = useState<OutreachRecord["status"]>("sent");

  // Load records and subscribe to live dispatch events
  const refreshRecords = useCallback(async () => {
    const data = await fetchOutreachRecords();
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
  const handleStatusChange = async (id: string, newStatus: OutreachRecord["status"]) => {
    const updated = await updateOutreachStatus(id, newStatus);
    if (updated) {
      soundManager.playSuccess();
      toast.success(`Updated status to ${newStatus.toUpperCase()}`);
      if (selectedRecord?.id === id) {
        setSelectedRecord(updated);
      }
      refreshRecords();
    }
  };

  // Delete record handler
  const handleDelete = async (id: string) => {
    if (confirm("Remove this outreach entry from your ledger?")) {
      await deleteOutreachRecord(id);
      if (selectedRecord?.id === id) {
        setSelectedRecord(null);
      }
      refreshRecords();
      toast.success("Record deleted");
    }
  };

  // Clear all handler
  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all outreach records? This cannot be undone.")) {
      await clearAllOutreachRecords();
      setSelectedRecord(null);
      refreshRecords();
      toast.success("Outreach ledger cleared");
    }
  };

  // Manual submit handler
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCompany.trim() || !formEmail.trim() || !formSubject.trim()) {
      toast.error("Please fill in company, email, and subject.");
      return;
    }

    await recordOutreachDispatch({
      campaign_prompt: "Manual Logged Outreach",
      company_name: formCompany.trim(),
      recipient_name: formRecipient.trim() || "Lead Contact",
      recipient_email: formEmail.trim(),
      recipient_role: formRole.trim() || "Decision Maker",
      channel: formChannel,
      subject: formSubject.trim(),
      body: formBody.trim(),
      status: formStatus,
      delivery_provider: "Manual",
    });

    toast.success(`Outreach for ${formCompany} logged successfully!`);
    setIsLogModalOpen(false);
    setFormCompany("");
    setFormRecipient("");
    setFormEmail("");
    setFormRole("");
    setFormSubject("");
    setFormBody("");
    refreshRecords();
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

  // Real Calculated Metrics
  const metrics = useMemo(() => {
    const total = records.length;
    const delivered = records.filter((r) => ["delivered", "opened", "replied"].includes(r.status)).length;
    const replied = records.filter((r) => r.status === "replied").length;
    const opened = records.filter((r) => ["opened", "replied"].includes(r.status)).length;

    const deliveryRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const replyRate = delivered > 0 ? Math.round((replied / delivered) * 100) : 0;
    const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;

    return { total, delivered, replied, opened, deliveryRate, replyRate, openRate };
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
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-semibold uppercase">
              {records.length} Tracked
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 font-mono">
            Audit log of all outreach communications, delivery receipts, and recipient engagement.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border/60 hover:bg-muted text-xs font-mono text-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-500" />
            <span>Log Outreach</span>
          </button>

          {records.length > 0 && (
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-border/60 hover:bg-muted text-xs font-mono text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
          )}

          {records.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-card border border-destructive/30 hover:bg-destructive/10 text-xs font-mono text-destructive transition-all cursor-pointer shadow-sm"
              title="Clear all stored records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Launch Flow</span>
          </button>
        </div>
      </div>

      {/* ── Real Metric Performance Cards ───────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-card/70 border border-border/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Total Dispatched</span>
            <Send className="w-3.5 h-3.5 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">{metrics.total}</span>
            <span className="text-[10px] font-mono text-muted-foreground">Logged messages</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/70 border border-border/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Delivery Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">{metrics.deliveryRate}%</span>
            <span className="text-[10px] font-mono text-muted-foreground">{metrics.delivered} delivered</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/70 border border-border/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Opened / Engaged</span>
            <Mail className="w-3.5 h-3.5 text-purple-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-foreground">{metrics.opened}</span>
            <span className="text-[10px] font-mono text-muted-foreground">{metrics.openRate}% open rate</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card/70 border border-border/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">Direct Replies</span>
            <span className={`flex h-2 w-2 rounded-full ${metrics.replied > 0 ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/40"}`} />
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
            placeholder="Search by company, recipient, email, or subject..."
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
            { id: "replied", label: "Replied" },
            { id: "delivered", label: "Delivered" },
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
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                        <Send className="w-6 h-6 text-muted-foreground/60" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm font-sans">
                          {searchQuery ? "No matching outreach records" : "No outreach records yet"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {searchQuery
                            ? `No records match "${searchQuery}". Try clearing your search.`
                            : "When you dispatch emails or video pitches from the Command Feed, or log contacts here, your outreach history will be tracked in real-time."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsLogModalOpen(true)}
                          className="px-3.5 py-1.5 rounded-xl bg-card border border-border text-foreground hover:bg-muted text-xs font-medium cursor-pointer"
                        >
                          Log Outreach
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate("/")}
                          className="px-3.5 py-1.5 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 cursor-pointer"
                        >
                          Command Feed →
                        </button>
                      </div>
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
                              <Film className="w-3 h-3" /> Video
                            </span>
                          ) : item.channel === "linkedin" ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
                              LinkedIn
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground">
                              <Mail className="w-3 h-3" /> Email
                            </span>
                          )}
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
                          className="px-2.5 py-1 rounded-lg bg-muted/60 hover:bg-muted text-foreground text-[11px] font-medium transition-colors cursor-pointer"
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

      {/* ── Slide-Over Email / DM Inspector Drawer (Fixed z-index to sit ABOVE FloatingNav) ── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedRecord && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedRecord(null)}
                className="fixed inset-0 z-[998] bg-black/60 dark:bg-black/80 backdrop-blur-md"
              />

              {/* Drawer: z-[999] with solid opaque background */}
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-xl z-[999] bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden text-left"
              >
                {/* Drawer Header */}
                <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
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

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedRecord.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRecord(null)}
                    className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
                {/* Target Recipient Card */}
                <div className="p-4 rounded-xl bg-background border border-border space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-muted-foreground text-[10px] uppercase font-bold tracking-wider">
                    <span>Recipient Information</span>
                    <span className="text-muted-foreground font-mono">{selectedRecord.delivery_provider}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Contact</span>
                      <span className="font-semibold text-foreground font-sans text-sm">{selectedRecord.recipient_name}</span>
                      <span className="text-[10px] text-muted-foreground block truncate">{selectedRecord.recipient_role}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Email Address</span>
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

                {/* Campaign Strategy Prompt (Clean, no overlap) */}
                {selectedRecord.campaign_prompt && (
                  <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block mb-1">
                      Campaign Context
                    </span>
                    <p className="text-foreground/90 leading-relaxed font-sans text-xs">
                      {selectedRecord.campaign_prompt}
                    </p>
                  </div>
                )}

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

                  <div className="rounded-xl bg-background border border-border p-4 space-y-3 shadow-inner">
                    <div className="border-b border-border pb-2">
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
                <div className="p-4 rounded-xl bg-card border border-border space-y-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider block">
                    Update Outcome
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
                      Mark Delivered
                    </button>
                  </div>
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
                <span className="text-[10px] font-mono text-muted-foreground">
                  Channel: {selectedRecord.channel.toUpperCase()}
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
      </AnimatePresence>,
      document.body
    )}

      {/* ── Manual Outreach Logger Modal (Portaled to document.body) ───────── */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isLogModalOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsLogModalOpen(false)}
                className="fixed inset-0 z-[998] bg-black/60 dark:bg-black/80 backdrop-blur-md"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="fixed inset-0 m-auto max-w-lg max-h-[85vh] w-full z-[999] bg-card border border-border shadow-2xl p-6 flex flex-col overflow-hidden"
              >
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-emerald-500" />
                    </div>
                    <h3 className="font-bold text-foreground text-base font-sans">Log Outreach Manually</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLogModalOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleManualSubmit} className="flex-1 overflow-y-auto py-4 space-y-3 font-mono text-xs">
                  <div>
                    <label className="block text-[11px] text-muted-foreground uppercase font-semibold mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={formCompany}
                      onChange={(e) => setFormCompany(e.target.value)}
                      placeholder="e.g. Acme Corp"
                      className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-muted-foreground uppercase font-semibold mb-1">Recipient Name</label>
                      <input
                        type="text"
                        value={formRecipient}
                        onChange={(e) => setFormRecipient(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground uppercase font-semibold mb-1">Recipient Role</label>
                      <input
                        type="text"
                        value={formRole}
                        onChange={(e) => setFormRole(e.target.value)}
                        placeholder="e.g. Founder & CEO"
                        className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted-foreground uppercase font-semibold mb-1">Recipient Email *</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="jane@acme.com"
                      className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-muted-foreground uppercase font-semibold mb-1">Channel</label>
                      <select
                        value={formChannel}
                        onChange={(e) => setFormChannel(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground focus:outline-none focus:border-foreground/40 cursor-pointer"
                      >
                        <option value="email">Email</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="clario_video">Clario Video</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground uppercase font-semibold mb-1">Initial Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground focus:outline-none focus:border-foreground/40 cursor-pointer"
                      >
                        <option value="sent">Sent</option>
                        <option value="delivered">Delivered</option>
                        <option value="replied">Replied</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted-foreground uppercase font-semibold mb-1">Subject *</label>
                    <input
                      type="text"
                      required
                      value={formSubject}
                      onChange={(e) => setFormSubject(e.target.value)}
                      placeholder="Quick question on outbound tooling"
                      className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-muted-foreground uppercase font-semibold mb-1">Message Body</label>
                    <textarea
                      rows={4}
                      value={formBody}
                      onChange={(e) => setFormBody(e.target.value)}
                      placeholder="Paste the outreach text sent to the recipient..."
                      className="w-full px-3 py-2 rounded-xl bg-muted/40 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground/40 font-sans"
                    />
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsLogModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Save to Ledger
                    </button>
                  </div>
                </form>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
