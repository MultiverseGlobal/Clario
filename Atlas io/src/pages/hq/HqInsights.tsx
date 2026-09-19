import React, { useState } from "react";
import { 
  BrainCircuit, GitPullRequest, ArrowUpRight, 
  MessageSquare, Zap, AlertTriangle, CheckCircle2, TrendingUp 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function HqInsights() {
  const [themes, setThemes] = useState([
    {
      id: 1,
      title: "Enterprise SSO Integration",
      mentions: 42,
      impact: "$150k Pipeline Blocked",
      impactType: "revenue",
      status: "suggested",
      signals: ["Acme Corp (Sales Call)", "Nebula AI (Support)", "GlobalTech (Email)"]
    },
    {
      id: 2,
      title: "Custom AI Voice Selection",
      mentions: 28,
      impact: "High Churn Risk",
      impactType: "churn",
      status: "suggested",
      signals: ["Creative Studios (Churn Exit)", "Marketing Pro (Support)"]
    }
  ]);

  const rawSignals = [
    { id: 101, source: "Gong (Sales Call)", company: "Acme Corp", text: "We need SAML SSO before we can deploy to our 500 reps. It's a hard infosec requirement.", time: "2 hours ago" },
    { id: 102, source: "Intercom (Support)", company: "Nebula AI", text: "Can we connect this to Okta? Our team is growing and manual auth is a pain.", time: "5 hours ago" },
    { id: 103, source: "Zendesk (Ticket)", company: "Creative Studios", text: "The default voice is okay, but we really need to clone our own spokesperson's voice for our brand guidelines.", time: "1 day ago" },
    { id: 104, source: "Email", company: "GlobalTech", text: "Checking in on the Enterprise SSO roadmap. Any timeline?", time: "2 days ago" }
  ];

  const handlePushToLinear = (themeId: number) => {
    setThemes(prev => prev.map(t => t.id === themeId ? { ...t, status: "accepted" } : t));
    toast.success("Pushed to Linear as an Epic", {
      description: "Engineering has been notified."
    });
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 font-sans text-[#F4F1EA] space-y-12">
      
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-[#A78BFA]" />
          Product Intelligence
        </h1>
        <p className="text-[#9CA3AF] text-lg max-w-2xl">
          Real-time synthesis of customer feedback, support tickets, and sales calls into roadmap priorities, powered by Metaphor.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Synthesized Themes */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-2 border-b border-[#374151] pb-2">
            <TrendingUp className="w-5 h-5 text-[#9CA3AF]" />
            <h2 className="text-xl font-medium">Prioritized Roadmap Themes</h2>
          </div>

          <div className="space-y-4">
            {themes.map(theme => (
              <div key={theme.id} className="bg-[#1A1D24] border border-[#374151] rounded-xl p-6 transition-all hover:border-[#A78BFA]/40">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-xl">{theme.title}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#374151] text-[#E5E7EB]">
                        {theme.mentions} mentions
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {theme.impactType === 'revenue' ? (
                        <Zap className="w-4 h-4 text-[#FBBF24]" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                      )}
                      <span className={`font-medium ${theme.impactType === 'revenue' ? 'text-[#FBBF24]' : 'text-[#EF4444]'}`}>
                        {theme.impact}
                      </span>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-2">
                      {theme.signals.map((sig, idx) => (
                        <span key={idx} className="text-xs bg-[#111318] border border-[#374151] text-[#9CA3AF] px-2 py-1 rounded-md">
                          {sig}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0">
                    {theme.status === 'suggested' ? (
                      <Button 
                        onClick={() => handlePushToLinear(theme.id)}
                        className="bg-[#A78BFA] hover:bg-[#8B5CF6] text-white"
                      >
                        <GitPullRequest className="w-4 h-4 mr-2" /> Push to Linear
                      </Button>
                    ) : (
                      <Button disabled variant="outline" className="border-[#374151] text-[#9CA3AF]">
                        <CheckCircle2 className="w-4 h-4 mr-2 text-[#34D399]" /> In Linear
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Raw Signals Feed */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 border-b border-[#374151] pb-2">
            <MessageSquare className="w-5 h-5 text-[#9CA3AF]" />
            <h2 className="text-xl font-medium">Recent Signals</h2>
          </div>

          <div className="bg-[#1A1D24] border border-[#374151] rounded-xl overflow-hidden">
            <div className="divide-y divide-[#374151]">
              {rawSignals.map(signal => (
                <div key={signal.id} className="p-4 space-y-2 hover:bg-[#252932]/50 transition-colors">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-mono text-[#A78BFA] uppercase tracking-wider">{signal.source}</span>
                    <span className="text-xs text-[#6B7280]">{signal.time}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{signal.company}</span>
                  </div>
                  <p className="text-sm text-[#9CA3AF] line-clamp-3 leading-relaxed">
                    "{signal.text}"
                  </p>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-[#374151] bg-[#111318] text-center">
              <Button variant="link" className="text-[#A78BFA] hover:text-[#8B5CF6] text-sm">
                View all raw feedback <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
