'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Target, Phone, Send, CheckCircle2, AlertTriangle,
  ChevronRight, ExternalLink, Loader2, User, Zap,
  ClipboardList, Calendar, TrendingUp, MessageSquare,
  ArrowRight, Check, X, RefreshCw,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Lead {
  id: string;
  company: string;
  prospect: string;
  website: string;
  linkedin_url?: string;
  icp_score: number;
  stage: string;
  notes?: string;
  founder_thesis?: string;
  draft_message?: string;
  contact_channel?: string;
  reply_status: string;
  is_contacted: boolean;
  next_action?: string;
  created_at: string;
}

type PipelineSubTab = 'brief' | 'outreach' | 'callprep' | 'postcall';

// ─── Constants ──────────────────────────────────────────────────────────────

const KURO_OS_URL = process.env.NEXT_PUBLIC_KURO_OS_URL || '';
const KURO_OS_ANON = process.env.NEXT_PUBLIC_KURO_OS_ANON_KEY || '';

// ─── Supabase fetch helper ─────────────────────────────────────────────────

async function fetchLeadsFromAtlas(): Promise<Lead[]> {
  if (!KURO_OS_URL || !KURO_OS_ANON) return [];
  try {
    const res = await fetch(`${KURO_OS_URL}/rest/v1/kuro_pipeline_view?select=*&is_hq_dump=eq.false&order=icp_score.desc`, {
      headers: {
        'apikey': KURO_OS_ANON,
        'Authorization': `Bearer ${KURO_OS_ANON}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Atlas fetch failed');
    return await res.json();
  } catch {
    return [];
  }
}

async function updateLeadStage(leadId: string, stage: string): Promise<void> {
  if (!KURO_OS_URL || !KURO_OS_ANON) return;
  await fetch(`${KURO_OS_URL}/rest/v1/kuro_pipeline_view?id=eq.${leadId}`, {
    method: 'PATCH',
    headers: {
      'apikey': KURO_OS_ANON,
      'Authorization': `Bearer ${KURO_OS_ANON}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ stage }),
  });
}

// ─── Day number helper ─────────────────────────────────────────────────────

function missionDayInfo() {
  const start = new Date('2026-08-11');
  const now = new Date();
  const elapsed = Math.floor((now.getTime() - start.getTime()) / 86400000);
  return {
    day: Math.min(14, elapsed + 1),
    remaining: Math.max(0, 14 - elapsed),
  };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

// ─── Sub-view: Daily Brief ─────────────────────────────────────────────────

function DailyBrief({ leads }: { leads: Lead[] }) {
  const { day, remaining } = missionDayInfo();

  const todayPriority = leads
    .filter((l) => ['identified', 'researched', 'approved'].includes(l.stage))
    .sort((a, b) => b.icp_score - a.icp_score)
    .slice(0, 8);

  const followUps = leads.filter((l) =>
    l.stage === 'contacted' && l.is_contacted
  ).slice(0, 5);

  const callsDue = leads.filter((l) =>
    ['call_booked', 'qualified'].includes(l.stage)
  );

  const prospects = leads.length;
  const responses = leads.filter(
    (l) => l.reply_status && !['none', 'no_reply', ''].includes(l.reply_status)
  ).length;
  const calls = leads.filter((l) =>
    ['call_booked', 'call_completed', 'pain_confirmed', 'proposal_sent',
      'negotiating', 'won', 'paid'].includes(l.stage)
  ).length;

  const responseRate = prospects > 0 ? Math.round((responses / prospects) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Mission header */}
      <div className="aurora-glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-mono text-[var(--aurora-text-muted)] uppercase tracking-widest">
              Good {greeting()} — Day {day} of 14
            </p>
            <h2 className="text-xl font-bold text-[var(--aurora-text-main)] mt-1">
              Today's Brief
            </h2>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-orange-500">{remaining}</div>
            <div className="text-xs text-[var(--aurora-text-muted)]">days left</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Prospects', value: prospects, target: 150, color: 'text-blue-500' },
            { label: 'Responses', value: responses, target: 30, color: 'text-amber-500' },
            { label: 'Calls', value: calls, target: 15, color: 'text-purple-500' },
          ].map(({ label, value, target, color }) => (
            <div key={label} className="bg-black/5 dark:bg-white/5 rounded-xl p-3 text-center">
              <div className={`text-xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-[var(--aurora-text-muted)]">{label}</div>
              <div className="text-[10px] text-[var(--aurora-text-muted)] mt-0.5">/ {target}</div>
            </div>
          ))}
        </div>

        {responseRate < 5 && prospects >= 20 && (
          <div className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3">
            <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-500">Response rate {responseRate}% — below threshold</p>
              <p className="text-xs text-[var(--aurora-text-muted)] mt-0.5">Audit message personalisation. Check ICP targeting for top niche.</p>
            </div>
          </div>
        )}
      </div>

      {/* Priority outreach today */}
      {todayPriority.length > 0 && (
        <div className="aurora-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-4 w-4 text-orange-500" />
            <h3 className="text-sm font-bold text-[var(--aurora-text-main)]">Priority Outreach Today</h3>
            <span className="text-xs text-[var(--aurora-text-muted)]">({todayPriority.length} leads)</span>
          </div>
          <div className="space-y-2">
            {todayPriority.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--aurora-text-main)] truncate">{lead.company}</p>
                  <p className="text-xs text-[var(--aurora-text-muted)] truncate">{lead.prospect || 'Unknown'}</p>
                </div>
                <span className="text-[10px] font-mono bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-lg shrink-0">
                  {lead.icp_score}/15
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-ups due */}
      {followUps.length > 0 && (
        <div className="aurora-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-bold text-[var(--aurora-text-main)]">Follow-ups Due</h3>
          </div>
          <div className="space-y-2">
            {followUps.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3 bg-black/5 dark:bg-white/5 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--aurora-text-main)] truncate">{lead.company}</p>
                  <p className="text-xs text-[var(--aurora-text-muted)]">Contacted — no reply yet</p>
                </div>
                <ChevronRight className="h-4 w-4 text-[var(--aurora-text-muted)]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Calls due */}
      {callsDue.length > 0 && (
        <div className="aurora-glass rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="h-4 w-4 text-purple-500" />
            <h3 className="text-sm font-bold text-[var(--aurora-text-main)]">Calls Due</h3>
          </div>
          <div className="space-y-2">
            {callsDue.map((lead) => (
              <div key={lead.id} className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--aurora-text-main)] truncate">{lead.company}</p>
                  <p className="text-xs text-purple-400">{lead.stage === 'call_booked' ? 'Call booked — prep before joining' : 'Qualified — book the call'}</p>
                </div>
                <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">
                  {lead.stage === 'call_booked' ? 'BOOKED' : 'QUALIFIED'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {leads.length === 0 && (
        <div className="aurora-glass rounded-2xl p-8 text-center">
          <Target className="h-10 w-10 text-[var(--aurora-text-muted)] mx-auto mb-3 opacity-40" />
          <p className="text-sm text-[var(--aurora-text-muted)]">No leads loaded yet.</p>
          <p className="text-xs text-[var(--aurora-text-muted)] mt-1">
            Add Atlas Supabase credentials to NEXT_PUBLIC_ATLAS_SUPABASE_URL and NEXT_PUBLIC_ATLAS_SUPABASE_ANON_KEY.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Sub-view: Outreach Queue ──────────────────────────────────────────────

function OutreachQueue({ leads, onStageChange }: {
  leads: Lead[];
  onStageChange: (id: string, stage: string) => void;
}) {
  const queue = leads
    .filter((l) => ['approved', 'identified', 'researched'].includes(l.stage))
    .sort((a, b) => b.icp_score - a.icp_score);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);

  const handleMarkContacted = async (lead: Lead) => {
    setSending(lead.id);
    await updateLeadStage(lead.id, 'contacted');
    onStageChange(lead.id, 'contacted');
    setSending(null);
  };

  return (
    <div className="space-y-4">
      <div className="aurora-glass rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-orange-500" />
          <h3 className="text-sm font-bold text-[var(--aurora-text-main)]">Outreach Queue</h3>
          <span className="ml-auto text-xs text-[var(--aurora-text-muted)]">{queue.length} ready</span>
        </div>
        <p className="text-xs text-[var(--aurora-text-muted)] mt-1">
          Review message draft → send manually → mark as Contacted.
        </p>
      </div>

      {queue.length === 0 ? (
        <div className="aurora-glass rounded-2xl p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-60" />
          <p className="text-sm text-[var(--aurora-text-muted)]">Queue clear — all approved leads contacted.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {queue.map((lead) => (
            <div key={lead.id} className="aurora-glass rounded-2xl overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-[var(--aurora-text-main)] truncate">{lead.company}</p>
                    <span className="text-[9px] font-mono bg-orange-500/10 text-orange-500 px-1.5 py-0.5 rounded shrink-0">
                      {lead.icp_score}/15
                    </span>
                  </div>
                  <p className="text-xs text-[var(--aurora-text-muted)] truncate">{lead.prospect || 'Unknown contact'}</p>
                </div>
                {lead.contact_channel && (
                  <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 shrink-0">
                    {lead.contact_channel}
                  </span>
                )}
                <ChevronRight className={`h-4 w-4 text-[var(--aurora-text-muted)] transition-transform ${expandedId === lead.id ? 'rotate-90' : ''}`} />
              </div>

              {expandedId === lead.id && (
                <div className="border-t border-white/10 p-4 space-y-4">
                  {/* Pain hypothesis */}
                  {lead.founder_thesis && (
                    <div>
                      <p className="text-[10px] font-mono text-[var(--aurora-text-muted)] uppercase tracking-wider mb-1">Pain Hypothesis</p>
                      <p className="text-xs text-[var(--aurora-text-main)] leading-relaxed bg-orange-500/5 border border-orange-500/10 rounded-xl p-3">
                        {lead.founder_thesis}
                      </p>
                    </div>
                  )}

                  {/* Message draft */}
                  {lead.draft_message ? (
                    <div>
                      <p className="text-[10px] font-mono text-[var(--aurora-text-muted)] uppercase tracking-wider mb-1">Message Draft</p>
                      <div className="text-xs text-[var(--aurora-text-main)] leading-relaxed bg-black/10 dark:bg-white/5 rounded-xl p-3 font-mono whitespace-pre-wrap">
                        {lead.draft_message}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
                      <p className="text-xs text-amber-500">No draft message — run Atlas research to generate one, or write manually based on the pain hypothesis above.</p>
                    </div>
                  )}

                  {/* Links */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {lead.linkedin_url && (
                      <a
                        href={lead.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-semibold"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> LinkedIn
                      </a>
                    )}
                    {lead.website && (
                      <a
                        href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-main)] font-semibold"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Website
                      </a>
                    )}
                    <button
                      onClick={() => handleMarkContacted(lead)}
                      disabled={sending === lead.id}
                      className="ml-auto flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-400 text-white font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {sending === lead.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Check className="h-3.5 w-3.5" />
                      }
                      Sent — Mark Contacted
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sub-view: Call Prep ───────────────────────────────────────────────────

function CallPrep({ leads, onStageChange }: {
  leads: Lead[];
  onStageChange: (id: string, stage: string) => void;
}) {
  const callReady = leads.filter((l) =>
    ['qualified', 'call_booked', 'replied'].includes(l.stage)
  ).sort((a, b) => b.icp_score - a.icp_score);

  const [selectedLead, setSelectedLead] = useState<Lead | null>(callReady[0] || null);
  const [marking, setMarking] = useState(false);

  const handleMarkCallDone = async () => {
    if (!selectedLead) return;
    setMarking(true);
    await updateLeadStage(selectedLead.id, 'call_completed');
    onStageChange(selectedLead.id, 'call_completed');
    setMarking(false);
    setSelectedLead(null);
  };

  return (
    <div className="space-y-4">
      <div className="aurora-glass rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-bold text-[var(--aurora-text-main)]">Call Prep</h3>
          <span className="ml-auto text-xs text-[var(--aurora-text-muted)]">{callReady.length} ready to call</span>
        </div>
        <p className="text-xs text-[var(--aurora-text-muted)] mt-1">Select a prospect → read the 1-page brief before joining the call.</p>
      </div>

      {callReady.length === 0 ? (
        <div className="aurora-glass rounded-2xl p-8 text-center">
          <Calendar className="h-8 w-8 text-purple-500 mx-auto mb-2 opacity-60" />
          <p className="text-sm text-[var(--aurora-text-muted)]">No calls ready yet — keep pushing outreach.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-[200px_1fr] gap-4">
          {/* Lead selector */}
          <div className="aurora-glass rounded-2xl p-3 space-y-1">
            {callReady.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(lead)}
                className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors text-sm ${
                  selectedLead?.id === lead.id
                    ? 'bg-purple-500/15 text-purple-400 font-semibold'
                    : 'text-[var(--aurora-text-sub)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                <div className="font-semibold truncate">{lead.company}</div>
                <div className="text-[10px] opacity-70">{lead.stage}</div>
              </button>
            ))}
          </div>

          {/* Brief */}
          {selectedLead && (
            <div className="aurora-glass rounded-2xl p-5 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[10px] font-mono text-[var(--aurora-text-muted)] uppercase tracking-widest mb-1">Call Brief</div>
                  <h2 className="text-lg font-bold text-[var(--aurora-text-main)]">{selectedLead.company}</h2>
                  <p className="text-sm text-[var(--aurora-text-muted)]">{selectedLead.prospect}</p>
                </div>
                <span className="text-[10px] font-mono bg-purple-500/10 text-purple-400 px-2 py-1 rounded border border-purple-500/20 shrink-0">
                  ICP {selectedLead.icp_score}/15
                </span>
              </div>

              {selectedLead.founder_thesis && (
                <Section title="Pain Hypothesis" color="orange">
                  <p className="text-sm text-[var(--aurora-text-main)] leading-relaxed">{selectedLead.founder_thesis}</p>
                </Section>
              )}

              <Section title="What to Discover on the Call" color="blue">
                <ul className="space-y-1.5 text-sm text-[var(--aurora-text-main)]">
                  <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400" /> What does this problem cost them — in time, money, or stress?</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400" /> What have they already tried to solve it?</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400" /> Who else is affected — is this a solo problem or a team problem?</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400" /> What would solving it be worth to them?</li>
                  <li className="flex items-start gap-2"><ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-blue-400" /> What is their decision process? Who else needs to approve?</li>
                </ul>
              </Section>

              {selectedLead.notes && (
                <Section title="Research Notes" color="green">
                  <p className="text-sm text-[var(--aurora-text-muted)] leading-relaxed line-clamp-6 whitespace-pre-wrap">
                    {selectedLead.notes.replace(/#{1,3}\s/g, '').replace(/\*\*/g, '')}
                  </p>
                </Section>
              )}

              <div className="flex gap-3 pt-2 border-t border-white/10">
                {selectedLead.linkedin_url && (
                  <a
                    href={selectedLead.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-400 font-semibold hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Open LinkedIn
                  </a>
                )}
                <button
                  onClick={handleMarkCallDone}
                  disabled={marking}
                  className="ml-auto flex items-center gap-1.5 text-xs bg-purple-500 hover:bg-purple-400 text-white font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  {marking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Mark Call Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-view: Post-Call Form ──────────────────────────────────────────────

function PostCallForm({ leads, onStageChange }: {
  leads: Lead[];
  onStageChange: (id: string, stage: string) => void;
}) {
  const justCalled = leads.filter((l) => l.stage === 'call_completed');

  const [selectedLead, setSelectedLead] = useState<Lead | null>(justCalled[0] || null);
  const [painNotes, setPainNotes] = useState('');
  const [painStrength, setPainStrength] = useState<number>(3);
  const [nextStep, setNextStep] = useState<'proposal' | 'followup' | 'notfit'>('proposal');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!selectedLead || !painNotes.trim()) return;
    setSubmitting(true);

    const newStage =
      nextStep === 'proposal' ? 'pain_confirmed' :
      nextStep === 'notfit' ? 'lost' : 'call_completed';

    await updateLeadStage(selectedLead.id, newStage);
    onStageChange(selectedLead.id, newStage);

    setSubmitted(selectedLead.id);
    setPainNotes('');
    setPainStrength(3);
    setNextStep('proposal');
    setSelectedLead(justCalled.filter((l) => l.id !== selectedLead.id)[0] || null);
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <div className="aurora-glass rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-green-500" />
          <h3 className="text-sm font-bold text-[var(--aurora-text-main)]">Post-Call Update</h3>
          <span className="ml-auto text-xs text-[var(--aurora-text-muted)]">{justCalled.length} to log</span>
        </div>
        <p className="text-xs text-[var(--aurora-text-muted)] mt-1">
          3 fields. Submit → Metaphor + Atlas update automatically.
        </p>
      </div>

      {justCalled.length === 0 ? (
        <div className="aurora-glass rounded-2xl p-8 text-center">
          <MessageSquare className="h-8 w-8 text-green-500 mx-auto mb-2 opacity-60" />
          <p className="text-sm text-[var(--aurora-text-muted)]">No calls completed yet.</p>
          <p className="text-xs text-[var(--aurora-text-muted)] mt-1">After a call, mark it done in Call Prep — it will appear here.</p>
        </div>
      ) : (
        <div className="aurora-glass rounded-2xl p-5 space-y-5">
          {/* Lead selector */}
          <div>
            <label className="text-[10px] font-mono text-[var(--aurora-text-muted)] uppercase tracking-wider block mb-2">Company</label>
            <div className="flex gap-2 flex-wrap">
              {justCalled.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    selectedLead?.id === lead.id
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-black/5 dark:bg-white/5 text-[var(--aurora-text-sub)] hover:bg-black/10'
                  }`}
                >
                  {lead.company}
                  {submitted === lead.id && ' ✓'}
                </button>
              ))}
            </div>
          </div>

          {selectedLead && (
            <>
              {/* Field 1: Pain discovered */}
              <div>
                <label className="text-[10px] font-mono text-[var(--aurora-text-muted)] uppercase tracking-wider block mb-2">
                  1. Pain Discovered
                </label>
                <textarea
                  value={painNotes}
                  onChange={(e) => setPainNotes(e.target.value)}
                  placeholder="What specific pain did they describe? In their words if possible. E.g. '3 recruiters spending 2 days/week manually screening 200 CVs'"
                  rows={4}
                  className="w-full bg-black/10 dark:bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-[var(--aurora-text-main)] placeholder:text-[var(--aurora-text-muted)] focus:outline-none focus:border-green-500/40 resize-none"
                />
              </div>

              {/* Field 2: Pain strength */}
              <div>
                <label className="text-[10px] font-mono text-[var(--aurora-text-muted)] uppercase tracking-wider block mb-2">
                  2. Pain Strength — {painStrength}/5
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setPainStrength(n)}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-colors ${
                        painStrength === n
                          ? n <= 2 ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : n <= 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-green-500/20 text-green-400 border border-green-500/30'
                          : 'bg-black/5 dark:bg-white/5 text-[var(--aurora-text-muted)]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-[var(--aurora-text-muted)] mt-1 px-1">
                  <span>Lukewarm</span><span>Burning</span>
                </div>
              </div>

              {/* Field 3: Next step */}
              <div>
                <label className="text-[10px] font-mono text-[var(--aurora-text-muted)] uppercase tracking-wider block mb-2">
                  3. Next Step
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: 'proposal', label: 'Send Proposal', color: 'green' },
                    { value: 'followup', label: 'Follow Up Later', color: 'amber' },
                    { value: 'notfit', label: 'Not a Fit', color: 'red' },
                  ].map(({ value, label, color }) => (
                    <button
                      key={value}
                      onClick={() => setNextStep(value as any)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-colors ${
                        nextStep === value
                          ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`
                          : 'bg-black/5 dark:bg-white/5 text-[var(--aurora-text-sub)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || !painNotes.trim()}
                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-400 text-white text-sm font-bold py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                  : <><Check className="h-4 w-4" /> Submit Post-Call Update</>
                }
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Shared section block ──────────────────────────────────────────────────

function Section({ title, color, children }: {
  title: string; color: string; children: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    orange: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green: 'text-green-400 bg-green-500/10 border-green-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  return (
    <div>
      <p className={`text-[10px] font-mono uppercase tracking-wider mb-2 ${colorMap[color]?.split(' ')[0] || 'text-[var(--aurora-text-muted)]'}`}>{title}</p>
      <div className={`rounded-xl p-3 border ${colorMap[color] || ''}`}>
        {children}
      </div>
    </div>
  );
}

// ─── Main PipelineView ─────────────────────────────────────────────────────

export function PipelineView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<PipelineSubTab>('brief');

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const data = await fetchLeadsFromAtlas();
    setLeads(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const handleStageChange = (id: string, stage: string) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, stage } : l)));
  };

  const SUB_TABS: { id: PipelineSubTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'brief', label: 'Brief', icon: Zap },
    {
      id: 'outreach', label: 'Outreach', icon: Send,
      badge: leads.filter((l) => ['approved', 'identified', 'researched'].includes(l.stage)).length,
    },
    {
      id: 'callprep', label: 'Call Prep', icon: Phone,
      badge: leads.filter((l) => ['qualified', 'call_booked', 'replied'].includes(l.stage)).length,
    },
    {
      id: 'postcall', label: 'Post-Call', icon: ClipboardList,
      badge: leads.filter((l) => l.stage === 'call_completed').length,
    },
  ];

  return (
    <div className="flex-1 flex flex-col p-6 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-[var(--aurora-text-muted)] uppercase tracking-widest">William — Execution</span>
            <h1 className="text-2xl font-bold text-[var(--aurora-text-main)] mt-0.5">Pipeline</h1>
          </div>
          <button
            onClick={loadLeads}
            disabled={loading}
            className="aurora-glass-pill px-3 py-1.5 flex items-center gap-1.5 text-xs text-[var(--aurora-text-sub)] hover:text-[var(--aurora-text-main)] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Sync Atlas
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6 aurora-glass rounded-2xl p-1">
        {SUB_TABS.map(({ id, label, icon: Icon, badge }) => (
          <button
            key={id}
            onClick={() => setSubTab(id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-colors ${
              subTab === id
                ? 'bg-[var(--aurora-accent)] text-white shadow-sm'
                : 'text-[var(--aurora-text-muted)] hover:text-[var(--aurora-text-main)]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
            {badge !== undefined && badge > 0 && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                subTab === id ? 'bg-white/20' : 'bg-orange-500/20 text-orange-400'
              }`}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 text-[var(--aurora-accent)] animate-spin" />
            <p className="text-xs text-[var(--aurora-text-muted)]">Syncing from Atlas…</p>
          </div>
        </div>
      ) : (
        <>
          {subTab === 'brief' && <DailyBrief leads={leads} />}
          {subTab === 'outreach' && <OutreachQueue leads={leads} onStageChange={handleStageChange} />}
          {subTab === 'callprep' && <CallPrep leads={leads} onStageChange={handleStageChange} />}
          {subTab === 'postcall' && <PostCallForm leads={leads} onStageChange={handleStageChange} />}
        </>
      )}
    </div>
  );
}
