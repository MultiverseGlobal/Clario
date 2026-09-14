import { useState } from "react";
import { Loader2, Users, Search, Handshake, ExternalLink, ArrowRight, CheckCircle2, ChevronRight, X, Building2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invokeSourcingMachine } from "@/lib/sourcingMachineProxy";

export interface PartnerProfile {
  id: string;
  companyName: string;
  founderName: string;
  website: string;
  serviceCategory: "Web Agency" | "RevOps / CRM" | "SEO Agency" | "Fractional COO" | "No-Code / Tech" | "Agency Coach";
  targetIcp: string;
  whyComplementary: string;
  referralModel: "Implementation Layer" | "White-Label Partner" | "Strategic Alliance" | "Direct Referral Split";
  stage: "Identified" | "Contacted" | "In Conversation" | "Active Partner";
  recommendedApproach: string;
  proximityScore: number;
}

interface PartnerEngineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPartner?: (partner: PartnerProfile) => void;
}

export function PartnerEngineModal({ isOpen, onClose, onSelectPartner }: PartnerEngineModalProps) {
  const [query, setQuery] = useState("Agencies & consultants serving 5–30 person marketing agencies without automation execution");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<PartnerProfile[]>([]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    setLoading(true);
    
    try {
      const { data, error } = await invokeSourcingMachine( {
        body: {
          action: "partner-search",
          query: query
        },
      });

      if (error) throw error;
      
      if (data && Array.isArray(data) && data.length > 0) {
        setPartners(data);
        toast.success(`Discovered ${data.length} high-leverage partners!`);
      } else {
        toast.error("No partners found matching your query.");
      }
    } catch (err: any) {
      toast.error(`Failed to find partners: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = categoryFilter === "all"
    ? partners
    : partners.filter(p => p.serviceCategory.toLowerCase().includes(categoryFilter.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-xl border border-border/60 bg-[#0F1117] p-6 shadow-2xl text-foreground max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <Handshake className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Tier 1 · Partner Acquisition Engine</h2>
            <p className="text-xs text-muted-foreground">
              Discover complementary agencies & consultants with direct access to our target ICP.
            </p>
          </div>
        </div>

        {/* Discovery Bar */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe target partner profile..."
              className="pl-9 text-xs bg-black/40 border-border/60"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading} className="bg-sky-600 hover:bg-sky-500 text-white text-xs gap-1.5 px-4">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Users className="h-3.5 w-3.5" />}
            Discover Partners
          </Button>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 mb-5 text-xs">
          {["all", "Web Agency", "RevOps / CRM", "Fractional COO", "No-Code / Tech"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                categoryFilter === cat
                  ? "bg-sky-500/20 border border-sky-500/40 text-sky-300 font-medium"
                  : "bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat === "all" ? "All Categories" : cat}
            </button>
          ))}
        </div>

        {/* Partner Cards */}
        <div className="space-y-3.5">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="p-4 rounded-xl border border-border/70 bg-black/30 hover:border-sky-500/40 transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-sm">{partner.companyName}</span>
                    <Badge variant="outline" className="text-[10px] text-sky-300 border-sky-500/30 bg-sky-500/10">
                      {partner.serviceCategory}
                    </Badge>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      ★ {partner.proximityScore} Proximity
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                    <User className="h-3 w-3" /> {partner.founderName} · Serving {partner.targetIcp}
                  </div>
                </div>

                <Badge variant="outline" className="text-[11px] text-muted-foreground border-white/10 bg-white/5">
                  {partner.referralModel}
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded bg-white/5 border border-white/5">
                  <div className="text-[10px] font-semibold text-sky-400 uppercase tracking-wider mb-1">
                    Why Complementary
                  </div>
                  <p className="text-foreground/90 leading-relaxed">{partner.whyComplementary}</p>
                </div>
                <div className="p-2.5 rounded bg-white/5 border border-white/5">
                  <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                    Recommended Approach
                  </div>
                  <p className="text-foreground/90 leading-relaxed">{partner.recommendedApproach}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-muted-foreground">
                  Status: <strong className="text-sky-300">{partner.stage}</strong>
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1 border-sky-500/30 text-sky-300 hover:bg-sky-500/10"
                  onClick={() => {
                    toast.success(`Approaching ${partner.founderName} with implementation partnership!`);
                    if (onSelectPartner) onSelectPartner(partner);
                  }}
                >
                  Initiate Partner Handshake <ArrowRight className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-border/40">
          <Button variant="outline" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
