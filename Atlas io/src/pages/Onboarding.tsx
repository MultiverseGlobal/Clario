import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/atlas/Logo";
import { Target, Users, Briefcase, RefreshCcw, Sparkles, Globe, Edit2, Play, Layout, ExternalLink, MessageSquare, Video } from "lucide-react";

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  
  // Step 2 State
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [helpDesc, setHelpDesc] = useState("");
  const [buyerDesc, setBuyerDesc] = useState("");

  // Step 3 State
  const [profile, setProfile] = useState({
    industry: "B2B SaaS",
    size: "5–50 employees",
    geo: "Global",
    buyer: "Sales & Support Leaders",
    trigger: "Active growth / hiring",
    exclusions: "Agencies"
  });

  // Step 4 State
  const [progressStage, setProgressStage] = useState(0);

  // Step 5 State
  const [opportunities, setOpportunities] = useState([
    {
      id: 1,
      name: "HeyDeacon",
      reason: "Likely need for founder-led outbound.",
      signal: "Hiring for growth-related roles, detected 6 days ago.",
      evidence: ["Company website", "Job listing", "LinkedIn"],
      action: "Send a short diagnostic video",
      saved: false
    },
    {
      id: 2,
      name: "Acme Logistics",
      reason: "Expanding their B2B portal.",
      signal: "Recent funding announcement.",
      evidence: ["TechCrunch", "Press release"],
      action: "Send an email about portal optimization",
      saved: false
    },
    {
      id: 3,
      name: "Nebula AI",
      reason: "Scaling their sales engineering team.",
      signal: "3 new sales engineers joined this month.",
      evidence: ["LinkedIn public data"],
      action: "Message VP of Sales on LinkedIn",
      saved: false
    }
  ]);

  // Handle fake progress in step 4
  useEffect(() => {
    if (step === 4) {
      const interval = setInterval(() => {
        setProgressStage((prev) => {
          if (prev >= 4) {
            clearInterval(interval);
            setTimeout(() => setStep(5), 800);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [step]);

  const toggleSave = (id: number) => {
    setOpportunities(opportunities.map(o => o.id === id ? { ...o, saved: !o.saved } : o));
  };

  const handleCreateOutreach = (opp: typeof opportunities[0]) => {
    // Navigate directly to Clario handoff state
    // Encoding the target context for the handoff
    const contextStr = encodeURIComponent(JSON.stringify({
      target: opp.name,
      reason: opp.reason,
      signal: opp.signal,
      action: opp.action
    }));
    
    // For now we simulate opening Clario (we would use window.location.href or a cross-app router)
    window.location.href = `http://localhost:5173/onboarding?handoff=${contextStr}`;
  };

  return (
    <div className="min-h-screen bg-[#111318] text-[#F4F1EA] flex flex-col font-sans selection:bg-[#4F46E5]/30 p-8">
      <div className="max-w-3xl mx-auto w-full pt-12 pb-24">
        
        {/* Step 0: Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center justify-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 mt-20">
            <div className="w-16 h-16 flex items-center justify-center bg-[#4F46E5]/10 rounded-2xl mb-4">
              <Logo className="w-8 h-8 text-[#4F46E5]" />
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">Find your next best customer.</h1>
            <p className="text-lg text-[#9CA3AF] max-w-lg leading-relaxed">
              Tell Atlas who you want to reach, and we'll find relevant companies, explain why they fit, and help you decide what to do next.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-8 w-full max-w-sm">
              <Button onClick={() => setStep(1)} className="w-full h-12 text-base font-medium bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                Find my first opportunities
              </Button>
              <Button onClick={() => setStep(4)} variant="outline" className="w-full h-12 text-base font-medium border-[#374151] hover:bg-[#1F2937] text-white">
                Explore with sample data
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Choose a goal */}
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#4F46E5] mb-2 block">Step 1 of 3</span>
              <h1 className="text-3xl font-semibold tracking-tight">What is your primary goal?</h1>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: <Target className="w-5 h-5 text-emerald-400" />, title: "Find companies to sell to", desc: "Discover active buyers fitting your ICP." },
                { icon: <Users className="w-5 h-5 text-blue-400" />, title: "Find potential partners", desc: "Identify strategic ecosystem allies." },
                { icon: <Briefcase className="w-5 h-5 text-purple-400" />, title: "Find recently funded companies", desc: "Target high-growth startups." },
                { icon: <RefreshCcw className="w-5 h-5 text-amber-400" />, title: "Follow up with existing prospects", desc: "Re-engage cold leads with new signals." }
              ].map((card, i) => (
                <div 
                  key={i}
                  onClick={() => setStep(2)}
                  className="p-5 rounded-xl border border-[#374151] bg-[#1F2937]/30 hover:border-[#4F46E5]/50 hover:bg-[#1F2937]/80 transition-all cursor-pointer group"
                >
                  <div className="mb-3 p-2 bg-[#111318] rounded-lg inline-block">{card.icon}</div>
                  <h3 className="text-sm font-semibold mb-1 group-hover:text-[#4F46E5] transition-colors">{card.title}</h3>
                  <p className="text-xs text-[#9CA3AF]">{card.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-4 flex justify-center">
              <button className="text-sm text-[#9CA3AF] hover:text-white underline decoration-dashed underline-offset-4">
                Describe my own goal
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Context */}
        {step === 2 && (
          <div className="space-y-8 animate-in fade-in duration-500 max-w-xl mx-auto mt-12">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#4F46E5] mb-2 block">Step 2 of 3</span>
              <h1 className="text-3xl font-semibold tracking-tight mb-3">What do you sell?</h1>
              <p className="text-[#9CA3AF] text-sm">Add your website and we'll create a starting profile.</p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#D1D5DB]">Website URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
                  <Input 
                    placeholder="https://yourcompany.com" 
                    className="pl-10 h-12 bg-[#1A1D24] border-[#374151] focus-visible:ring-[#4F46E5]"
                    value={websiteUrl}
                    onChange={e => setWebsiteUrl(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#D1D5DB]">What do you help customers do? <span className="text-[#6B7280] font-normal">(Optional)</span></label>
                <Input 
                  placeholder="e.g. Reduce customer support volume" 
                  className="h-12 bg-[#1A1D24] border-[#374151]"
                  value={helpDesc}
                  onChange={e => setHelpDesc(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#D1D5DB]">Who usually buys from you? <span className="text-[#6B7280] font-normal">(Optional)</span></label>
                <Input 
                  placeholder="e.g. Founders or VP of Sales" 
                  className="h-12 bg-[#1A1D24] border-[#374151]"
                  value={buyerDesc}
                  onChange={e => setBuyerDesc(e.target.value)}
                />
              </div>
            </div>

            <div className="pt-6">
              <Button onClick={() => setStep(3)} disabled={!websiteUrl} className="w-full h-12 bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                Create my starting profile
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Inferred Profile */}
        {step === 3 && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#4F46E5] mb-2 block">Step 3 of 3</span>
              <h1 className="text-3xl font-semibold tracking-tight mb-3">Here's the target profile Atlas created</h1>
              <div className="flex items-center gap-2 text-sm text-[#10B981] bg-[#10B981]/10 px-3 py-1.5 rounded-full inline-flex border border-[#10B981]/20">
                <Sparkles className="w-4 h-4" />
                <span>Confidence: Medium — based on your website</span>
              </div>
            </div>

            <div className="p-6 bg-[#1A1D24] border border-[#374151] rounded-xl space-y-6">
              <div className="text-lg leading-relaxed text-[#D1D5DB]">
                <span className="font-semibold text-white">{profile.industry}</span> companies with <span className="font-semibold text-white">{profile.size}</span> employees, targeting <span className="font-semibold text-white">{profile.buyer}</span>, and showing signs of <span className="font-semibold text-white">{profile.trigger}</span>. Excluding <span className="font-semibold text-white">{profile.exclusions}</span>.
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(profile).map(([k, v]) => (
                  <div key={k} className="p-3 bg-[#111318] border border-[#374151]/50 rounded-lg group cursor-pointer hover:border-[#4F46E5]/50 transition-colors">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-[10px] font-mono text-[#6B7280] uppercase tracking-wider">{k}</span>
                      <Edit2 className="w-3 h-3 text-[#4F46E5] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-sm font-medium text-[#E5E7EB] truncate">{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button onClick={() => setStep(4)} className="w-full sm:w-auto h-12 px-8 bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                Find matching companies
              </Button>
              <Button variant="outline" className="w-full sm:w-auto h-12 px-8 border-[#374151] hover:bg-[#1F2937] text-white">
                Adjust profile
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Progress Indicator */}
        {step === 4 && (
          <div className="flex flex-col items-center justify-center text-center space-y-8 min-h-[50vh] animate-in fade-in duration-500">
            <div className="relative w-24 h-24">
              <div className="absolute inset-0 border-4 border-[#374151] rounded-full"></div>
              <div 
                className="absolute inset-0 border-4 border-[#4F46E5] rounded-full transition-all duration-1000 ease-in-out"
                style={{ clipPath: `inset(0 0 ${100 - (progressStage / 4) * 100}% 0)` }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <Target className="w-8 h-8 text-[#4F46E5] animate-pulse" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h2 className="text-2xl font-semibold tracking-tight text-white transition-all duration-300">
                {progressStage === 0 && "Reading your company profile..."}
                {progressStage === 1 && "Searching selected public sources..."}
                {progressStage === 2 && "Checking company fit and exclusions..."}
                {progressStage === 3 && "Finding recent buying signals..."}
                {progressStage === 4 && "Preparing final recommendations..."}
              </h2>
              <p className="text-sm text-[#9CA3AF] max-w-md mx-auto bg-[#1F2937]/50 py-2 px-4 rounded-lg">
                Atlas is reviewing public sources. Nothing will be contacted or sent without your approval.
              </p>
            </div>
          </div>
        )}

        {/* Step 5 & 6: Opportunities & Outreach */}
        {step === 5 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight mb-2">Here are 5 companies that match your target.</h1>
                <p className="text-[#9CA3AF]">Each includes fit evidence, why-now signals, and a recommended next action.</p>
              </div>
            </div>

            <div className="space-y-4">
              {opportunities.map((opp) => (
                <div key={opp.id} className="p-5 bg-[#1A1D24] border border-[#374151] rounded-xl hover:border-[#4F46E5]/40 transition-colors group">
                  <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="space-y-4 flex-1">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold text-white">{opp.name}</h3>
                          <div className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">High Fit</div>
                        </div>
                        <p className="text-sm text-[#D1D5DB]"><span className="font-semibold text-[#9CA3AF]">Why it fits:</span> {opp.reason}</p>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                          <p className="text-[#E5E7EB]"><span className="font-semibold text-[#9CA3AF]">Signal:</span> {opp.signal}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <Layout className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                          <p className="text-[#E5E7EB]"><span className="font-semibold text-[#9CA3AF]">Evidence:</span> {opp.evidence.join(", ")}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 min-w-[220px] justify-between border-t md:border-t-0 md:border-l border-[#374151] pt-4 md:pt-0 md:pl-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono font-bold text-[#6B7280] uppercase">Recommended Action</span>
                        <p className="text-sm font-medium text-white">{opp.action}</p>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        {opp.saved ? (
                          <div className="space-y-2">
                            <Button onClick={() => toggleSave(opp.id)} variant="outline" className="w-full h-9 bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300">
                              Opportunity Saved
                            </Button>
                            
                            <div className="pt-2 border-t border-[#374151]/50 space-y-2">
                              <span className="text-[10px] font-mono font-bold text-[#6B7280] uppercase block text-center">Turn into first message?</span>
                              
                              <Button 
                                onClick={() => handleCreateOutreach(opp)}
                                className="w-full h-10 bg-[#4F46E5] hover:bg-[#4338CA] text-white flex items-center justify-center gap-2"
                              >
                                <Video className="w-4 h-4" />
                                Create video brief
                              </Button>
                              <div className="flex gap-2">
                                <Button variant="outline" className="flex-1 h-8 text-xs border-[#374151] hover:bg-[#1F2937]">Email</Button>
                                <Button variant="outline" className="flex-1 h-8 text-xs border-[#374151] hover:bg-[#1F2937]">LinkedIn</Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button onClick={() => toggleSave(opp.id)} variant="outline" className="flex-1 h-9 border-[#374151] hover:bg-[#1F2937] hover:text-white">
                              Save
                            </Button>
                            <Button variant="ghost" className="h-9 px-3 text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/10">
                              Skip
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="pt-8 text-center">
              <Button variant="ghost" className="text-[#6B7280] hover:text-white">
                Show more opportunities
              </Button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}