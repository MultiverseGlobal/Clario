import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp, 
  Video, 
  Users, 
  Target, 
  ArrowRight,
  RefreshCcw,
  ShieldAlert,
  Play
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function FounderHome() {
  const [priorities, setPriorities] = useState([
    { id: 1, text: "Follow up with Acme Logistics (High Fit, New Funding)", action: "Create Video", icon: <Video className="w-4 h-4" /> },
    { id: 2, text: "Fix onboarding bug blocking 12 users", action: "View Issue", icon: <AlertCircle className="w-4 h-4 text-red-400" /> },
    { id: 3, text: "Review weekly Clario content batch", action: "Approve 4 Drafts", icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> }
  ]);

  const [approvals, setApprovals] = useState([
    { id: 1, title: "High-Cost AI Job", desc: "Clario batch processing 15 videos (Est: £8.40)", type: "warning" },
    { id: 2, title: "Outreach Sequence", desc: "Send 5 personalized emails to Nebula AI team", type: "info" }
  ]);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-[#111318] text-[#F4F1EA] p-6 lg:p-10 font-sans">
      
      {/* Header & Greeting */}
      <div className="max-w-5xl mx-auto space-y-2 mb-12">
        <h1 className="text-3xl font-semibold tracking-tight">Good morning.</h1>
        <p className="text-[#9CA3AF] text-lg leading-relaxed max-w-3xl">
          You have <span className="text-white font-medium">3 important actions</span> today. One opportunity is waiting for a follow-up, one product issue is blocking activation, and your weekly revenue target is 42% complete.
        </p>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Priorities & Approvals */}
        <div className="lg:col-span-2 space-y-10">
          
          {/* Priorities */}
          <section className="space-y-4">
            <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-[#4F46E5] mb-2">Today's Priorities</h2>
            <div className="space-y-3">
              {priorities.map((p, i) => (
                <div key={p.id} className="p-4 bg-[#1A1D24] border border-[#374151] rounded-xl hover:border-[#4F46E5]/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 w-6 h-6 rounded-full bg-[#111318] border border-[#374151] flex items-center justify-center text-xs font-mono text-[#9CA3AF]">
                      {i + 1}
                    </div>
                    <p className="text-[#E5E7EB] font-medium leading-relaxed">{p.text}</p>
                  </div>
                  <Button className="shrink-0 bg-[#4F46E5] hover:bg-[#4338CA] text-white">
                    {p.icon}
                    <span className="ml-2">{p.action}</span>
                  </Button>
                </div>
              ))}
            </div>
          </section>

          {/* Approval Inbox */}
          <section className="space-y-4">
            <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-[#9CA3AF] mb-2 flex items-center gap-2">
              Approval Inbox <span className="bg-[#374151] text-white text-[10px] px-2 py-0.5 rounded-full">{approvals.length}</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {approvals.map(a => (
                <div key={a.id} className="p-4 bg-[#111318] border border-[#374151] rounded-xl flex flex-col justify-between">
                  <div className="space-y-1 mb-4">
                    <div className="flex items-center gap-2">
                      {a.type === 'warning' ? <ShieldAlert className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-blue-400" />}
                      <h3 className="font-semibold text-white">{a.title}</h3>
                    </div>
                    <p className="text-sm text-[#9CA3AF]">{a.desc}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="flex-1 h-8 text-xs bg-[#1F2937] hover:bg-[#374151] text-white border-0">Approve</Button>
                    <Button variant="ghost" className="flex-1 h-8 text-xs text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/10">Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* Right Column: Metrics & Blockers */}
        <div className="space-y-10">
          
          {/* Core Metrics Strip */}
          <section className="space-y-4">
            <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">Weekly Performance</h2>
            <div className="space-y-3">
              
              <div className="p-4 bg-[#1A1D24] border border-[#374151] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg"><TrendingUp className="w-4 h-4 text-emerald-400" /></div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-[#6B7280]">Revenue</p>
                    <p className="font-semibold text-white">$4,250</p>
                  </div>
                </div>
                <div className="text-xs text-emerald-400 font-medium">+12%</div>
              </div>

              <div className="p-4 bg-[#1A1D24] border border-[#374151] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg"><Users className="w-4 h-4 text-blue-400" /></div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-[#6B7280]">Activation Rate</p>
                    <p className="font-semibold text-white">28%</p>
                  </div>
                </div>
                <div className="text-xs text-red-400 font-medium">-2%</div>
              </div>

              <div className="p-4 bg-[#1A1D24] border border-[#374151] rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#4F46E5]/10 rounded-lg"><Target className="w-4 h-4 text-[#4F46E5]" /></div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-[#6B7280]">New Opps</p>
                    <p className="font-semibold text-white">12 Pipeline</p>
                  </div>
                </div>
                <div className="text-xs text-[#9CA3AF] font-medium">3 Need Action</div>
              </div>

            </div>
          </section>

          {/* Blockers & Alerts */}
          <section className="space-y-4">
            <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-red-400 mb-2">Blockers & Alerts</h2>
            <div className="p-4 bg-red-950/20 border border-red-900/50 rounded-xl space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-200">Payment Sync Failed</h3>
                  <p className="text-xs text-red-400/80 mt-1">Stripe integration token expired. Revenue metrics may be delayed.</p>
                </div>
              </div>
              <Button className="w-full h-8 text-xs bg-red-900/40 hover:bg-red-900/60 text-red-200 border-0">
                Reconnect Stripe
              </Button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
