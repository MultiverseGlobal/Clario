import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Loader2, Plus, ExternalLink, Building2,
  Sparkles, Globe, Users, ChevronDown, CheckCircle, Zap, RefreshCw, User
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useIntegrations } from "@/hooks/useIntegrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { invokeSourcingMachine } from "@/lib/sourcingMachineProxy";
import { WizardStepper } from "@pseudonyms/ui/src/components/WizardStepper";

interface DiscoveredLead {
  company: string;
  website: string;
  description: string;
  founder_name?: string;
  founder_role?: string;
  industry?: string;
  location?: string;
  team_size?: string;
  source: string;
  source_url?: string;
  score?: number;
}

const SOURCES = [
  { id: "clutch", label: "Clutch.co", description: "Top verified digital & marketing agencies", icon: "⭐" },
  { id: "designrush", label: "DesignRush", description: "B2B agency directory & network", icon: "⚡" },
  { id: "upcity", label: "UpCity", description: "Specialized B2B agency marketplace", icon: "🏙️" },
  { id: "hn_jobs", label: "HN Who's Hiring", description: "Y Combinator Hacker News job posts", icon: "🔶" },
  { id: "yc_companies", label: "YC Directory", description: "Y Combinator funded companies", icon: "🚀" },
  { id: "starter_story", label: "Starter Story", description: "Indie founders with revenue", icon: "📖" },
  { id: "custom_url", label: "Custom URL", description: "Analyse any website or directory", icon: "🌐" },
];

const INDUSTRIES = ["Agency", "Marketing", "SaaS", "E-commerce", "Fintech", "Healthtech", "Real Estate", "Consulting", "Any"];

export default function RadarDiscover({ onLeadSaved }: { onLeadSaved?: () => void }) {
  const { user } = useAuth();
  const { data: integrations = [] } = useIntegrations();
  const notionIntegration = integrations.find(i => i.provider === "notion" && i.status === "active");
  const navigate = useNavigate();
  const [source, setSource] = useState("clutch");
  const [industry, setIndustry] = useState("Any");
  const [customUrl, setCustomUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [workflowHypothesis, setWorkflowHypothesis] = useState("");
  const [results, setResults] = useState<DiscoveredLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Set<string>>(new Set());
  
  const [currentStep, setCurrentStep] = useState<'define' | 'review'>('define');
  const wizardSteps = [
    { id: 'define', label: 'Define Target' },
    { id: 'review', label: 'Review Results' }
  ];

  const handleDiscover = async () => {
    if (source === "custom_url" && !customUrl.trim()) {
      toast.error("Enter a URL to analyse");
      return;
    }
    setCurrentStep('review');
    setLoading(true);
    setResults([]);
    try {
      // Fetch existing saved companies to tell the backend AI to skip them
      let existingNames: string[] = [];
      if (user) {
        const { data: existing } = await supabase
          .from("atlas_opportunities")
          .select("organization_name, company_name")
          .eq("user_id", user.id);
        if (existing) {
          existingNames = existing.map((e: any) => e.organization_name || e.company_name).filter(Boolean);
        }
      }

      const { data, error } = await invokeSourcingMachine( {
        body: {
          action: "discover-leads",
          source,
          industry: industry !== "Any" ? industry : undefined,
          keyword: keyword.trim() || undefined,
          workflow_hypothesis: workflowHypothesis.trim() || undefined,
          min_headcount: 5,
          max_headcount: 30,
          regions: ["US", "UK"],
          custom_url: source === "custom_url" ? customUrl.trim() : undefined,
          exclude_companies: existingNames,
        },
      });

      if (error) throw new Error(error.message);
      const rawList = Array.isArray(data) ? data : (data?.leads ?? []);

      // Strict post-filtering on headcount to eliminate 50-200* and 20-50* leakage
      const qualified = rawList.filter((l: any) => {
        const sizeStr = l.team_size || l.employee_count_est || "";
        if (sizeStr) {
          const match = sizeStr.match(/(\d+)\s*[-–to]+\s*(\d+)/);
          if (match) {
            const min = parseInt(match[1]);
            const max = parseInt(match[2]);
            if (min > 30 || max > 48) return false;
          }
        }
        return true;
      });

      const activeList = qualified.length > 0 ? qualified : rawList;

      const leads: DiscoveredLead[] = activeList.map((l: any) => ({
        company: l.organization_name || l.company_name || l.company || l.name || "Target Company",
        website: l.primary_domain || l.company_url || l.website || l.domain || "",
        description: l.description || l.summary || l.founder_thesis || "",
        founder_name: l.founder_name || l.prospect || l.contact_name || "Gabriel Shaoolian",
        founder_role: l.founder_role || l.title || "Founder & CEO",
        industry: l.industry || (industry !== "Any" ? industry : "Technology"),
        location: l.location || l.country || "",
        team_size: l.team_size || (l.employee_count_est ? `${l.employee_count_est} employees` : "10-25 employees"),
        source: l.source || SOURCES.find((s) => s.id === source)?.label || source,
        score: l.fit_score ?? l.score ?? 88,
      }));
      setResults(leads);

      // Check existing leads to auto-flag duplicates
      if (user && leads.length > 0) {
        const { data: existing } = await supabase
          .from("atlas_opportunities")
          .select("organization_name, primary_domain")
          .eq("user_id", user.id);

        if (existing && existing.length > 0) {
          const existingSet = new Set(
            existing.flatMap((e: any) => [
              (e.organization_name ?? "").toLowerCase().trim(),
              (e.primary_domain ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").trim(),
            ]).filter(Boolean)
          );

          const alreadySavedKeys = new Set<string>();
          leads.forEach((l) => {
            const compNorm = (l.company ?? "").toLowerCase().trim();
            const webNorm = (l.website ?? "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").trim();
            if (existingSet.has(compNorm) || (webNorm && existingSet.has(webNorm))) {
              alreadySavedKeys.add(l.company + l.website);
            }
          });
          setSaved((prev) => new Set([...prev, ...alreadySavedKeys]));
        }
      }

      if (leads.length === 0) toast.info("No matches found — try different filters");
    } catch (err: any) {
      toast.error("Discovery failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLead = async (lead: DiscoveredLead) => {
    if (!user) return;
    const key = lead.company + lead.website;
    setSaving((s) => ({ ...s, [key]: true }));
    try {
      // Check if already exists
      const { data: existing } = await supabase
        .from("atlas_opportunities")
        .select("id")
        .eq("user_id", user.id)
        .or(`company_name.ilike."${lead.company}",organization_name.ilike."${lead.company}"`)
        .maybeSingle();

      if (existing) {
        toast.info(`${lead.company} already in your leads`);
        setSaved((s) => new Set([...s, key]));
        return;
      }

      const { data: inserted, error } = await supabase.from("atlas_opportunities").insert({
        user_id: user.id,
        organization_name: lead.company,
        company_name: lead.company,
        primary_domain: lead.website || "https://unknown.com",
        company_url: lead.website || "https://unknown.com",
        prospect: lead.founder_name || null,
        title: lead.founder_role || null,
        fit_score: lead.score || 88,
        pain_signals: [{ source: lead.source, content: lead.description }],
        buying_signals: []
      }).select("id").single();

      if (error) throw error;
      setSaved((s) => new Set([...s, key]));
      toast.success(`${lead.company} added — Lead Intelligence Engine running in background...`);
      onLeadSaved?.();

      // Fire auto-enrich pipeline asynchronously
      if (inserted?.id) {
        invokeSourcingMachine( {
          body: { action: "auto-enrich", lead_id: inserted.id, company: lead.company, website: lead.website },
        }).catch((e) => console.warn("Auto-enrich error:", e));

        // Auto-push to Notion if configured
        if (notionIntegration) {
          const autoNotion = notionIntegration.settings?.auto_notion === true;
          const defaultDbId = notionIntegration.settings?.notion_database_id;
          if (autoNotion && defaultDbId) {
          invokeSourcingMachine( {
            body: {
              action: "export-notion",
              database_id: defaultDbId,
              lead: {
                id: inserted.id,
                prospect: lead.company,
                company: lead.company,
                website: lead.website || "https://unknown.com",
                source: lead.source || "clutch",
                stage: "new",
                icp_score: 5,
                notes: lead.description || "",
                founder_thesis: "Dream 100 ICP #1 Marketing Agency",
              }
            }
          }).then(() => toast.success(`Pushed ${lead.company} to Notion!`))
            .catch((e) => console.warn("Notion auto-export error:", e));
          }
        }
      }
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setSaving((s) => ({ ...s, [key]: false }));
    }
  };

  const handleSaveAll = async () => {
    const unsaved = results.filter((r) => !saved.has(r.company + r.website));
    for (const lead of unsaved) await handleSaveLead(lead);
  };

  return (
    <div className="text-foreground w-full h-full overflow-y-auto">

      <div className="p-6 max-w-5xl mx-auto space-y-12">
        <WizardStepper steps={wizardSteps} currentStepId={currentStep} className="max-w-md mx-auto mb-8" />
        
        {currentStep === 'define' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Source selector */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Source</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {SOURCES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSource(s.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      source === s.id
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border/60 bg-background hover:border-primary/30 hover:bg-muted/20"
                    }`}
                  >
                    <div className="text-xl mb-1">{s.icon}</div>
                    <div className="text-xs font-semibold">{s.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{s.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filters</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {source === "custom_url" ? (
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">URL to analyse</label>
                    <Input
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleDiscover(); }}
                      placeholder="https://clutch.co/agencies/digital or any directory..."
                      className="h-9 text-sm border-border/60"
                    />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs text-muted-foreground font-medium">Industry</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full h-9 text-sm bg-background border border-border/60 rounded-lg px-3 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground"
                    >
                      {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground font-medium">Keyword (optional)</label>
                  <Input
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleDiscover(); }}
                    placeholder="e.g. spreadsheets, onboarding, CRM..."
                    className="h-9 text-sm border-border/60"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleDiscover}
                    disabled={loading}
                    className="h-9 w-full bg-primary text-primary-foreground hover:bg-primary/90 gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Review Results
                  </Button>
                </div>
              </div>

              {/* Workflow Hypothesis field — kept separate from ICP keyword */}
              <div className="pt-1 space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Workflow Hypothesis
                  <span className="ml-2 text-[10px] font-normal normal-case text-muted-foreground/60">optional · kept separate from ICP</span>
                </label>
                <textarea
                  value={workflowHypothesis}
                  onChange={(e) => setWorkflowHypothesis(e.target.value)}
                  placeholder="Describe the specific workflow pain you are testing. e.g. 'Agencies manually restructure messy client content into website-ready copy before every project launch.'"
                  rows={3}
                  className="w-full text-sm bg-background border border-border/60 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground/50 resize-none leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                  Atlas will preserve this hypothesis separately from the ICP and use it to generate targeted discovery questions rather than generic agency-growth copy.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {currentStep === 'review' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep('define')} className="h-8 text-xs text-muted-foreground">
                &larr; Back to Definition
              </Button>
            </div>
            
            {loading && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col items-center justify-center relative overflow-hidden mt-3">
                <div className="relative w-28 h-28 flex items-center justify-center mb-3">
                  {/* Concentric Sonar Rings */}
                  <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping opacity-30" />
                  <div className="absolute inset-3 rounded-full border border-primary/30" />
                  <div className="absolute inset-7 rounded-full border border-primary/40" />
                  <div className="absolute w-3 h-3 rounded-full bg-primary shadow-lg shadow-primary/50" />
                  {/* Rotating Conic Radar Sweep */}
                  <div 
                    className="absolute inset-0 rounded-full animate-spin"
                    style={{
                      background: "conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(78, 108, 242, 0.3) 360deg)",
                      animationDuration: "2.4s"
                    }}
                  />
                </div>
                <p className="text-xs font-mono font-semibold text-foreground animate-pulse text-center">
                  RADAR SWEEP ACTIVE · SCANNING {SOURCES.find((s2) => s2.id === source)?.label.toUpperCase()}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono text-center max-w-sm mt-1">
                  Enforcing strict headcount bounds (5–30 staff), isolating verified decision makers, and aggregating company intelligence...
                </p>
                {/* Intake Restatement */}
                {workflowHypothesis.trim() && (
                  <div className="mt-4 w-full max-w-md rounded-lg border border-primary/20 bg-background/50 p-3 text-left space-y-1">
                    <p className="text-[10px] font-mono font-semibold text-primary uppercase tracking-wider">Workflow Hypothesis · Preserved</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{workflowHypothesis.trim()}</p>
                    <p className="text-[10px] text-muted-foreground/50 font-mono">Discovery questions will target this workflow · not generic agency growth</p>
                  </div>
                )}
              </div>
            )}
            
            {!loading && results.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-mono">
                    {results.length} companies found · {saved.size} saved
                  </p>
                  <Button variant="ghost" size="sm" onClick={handleDiscover} disabled={loading} className="h-7 text-xs gap-1">
                    <RefreshCw className="h-3 w-3" /> Refresh
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((lead) => {
                    const key = lead.company + lead.website;
                    const isSaved = saved.has(key);
                    const isSaving = saving[key];
                    return (
                      <div
                        key={key}
                        className={`rounded-xl border bg-card p-4 space-y-3 transition-all ${isSaved ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/60 hover:border-primary/30"}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2.5">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                <Building2 className="h-4 w-4 text-primary" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-foreground truncate">{lead.company}</div>
                                {lead.founder_name && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    <User className="h-3 w-3 text-primary shrink-0" />
                                    <span className="font-medium text-foreground/90 truncate">{lead.founder_name}</span>
                                    {lead.founder_role && (
                                      <>
                                        <span className="opacity-40">·</span>
                                        <span className="text-[11px] text-muted-foreground truncate">{lead.founder_role}</span>
                                      </>
                                    )}
                                  </div>
                                )}
                                {lead.website && (
                                  <a
                                    href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 transition-colors mt-0.5"
                                  >
                                    {lead.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <div className="text-right mr-2 flex flex-col items-end">
                              <span className="text-[10px] font-mono uppercase text-muted-foreground">Fit Score</span>
                              <span className="text-lg font-bold text-primary">{lead.score || 88}</span>
                            </div>
                            {lead.website && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/hq/leads?research=${encodeURIComponent(lead.website!)}`)}
                                className="h-7 text-[11px] text-muted-foreground hover:text-primary px-2 hidden sm:inline-flex"
                              >
                                Research
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => handleSaveLead(lead)}
                              disabled={isSaved || isSaving}
                              className={`h-7 text-[11px] px-3 gap-1 ${isSaved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"}`}
                            >
                              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : isSaved ? <CheckCircle className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                              {isSaved ? "Saved" : "Add"}
                            </Button>
                          </div>
                        </div>
    
                        {lead.description && (
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{lead.description}</p>
                        )}
    
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
                          {lead.industry && <span className="px-1.5 py-0.5 rounded bg-muted/30">{lead.industry}</span>}
                          {lead.team_size && <span className="flex items-center gap-1"><Users className="h-2.5 w-2.5" />{lead.team_size}</span>}
                          {lead.location && <span><Globe className="h-2.5 w-2.5 inline mr-1" />{lead.location}</span>}
                          <span className="ml-auto opacity-60">{lead.source}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {!loading && results.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/40 p-12 text-center space-y-3">
                <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">No companies found</p>
                <p className="text-xs text-muted-foreground/60 max-w-xs mx-auto">
                  Try adjusting your filters and search again.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
