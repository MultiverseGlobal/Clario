import React, { useState } from "react";
import { Shield, CreditCard, Lock, Eye, Video, Brain, Activity, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HqTrustCenter() {
  const [permissions, setPermissions] = useState({
    metaphor: true,
    atlas: false,
    clario: true,
  });

  const [spendingLimit, setSpendingLimit] = useState(100);
  const currentSpend = 32.50;

  const togglePermission = (key: keyof typeof permissions) => {
    setPermissions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 font-sans text-[#F4F1EA] space-y-12">
      
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#4F46E5]" />
          Trust Center
        </h1>
        <p className="text-[#9CA3AF] text-lg max-w-2xl">
          Manage what your cognitive intelligences can access, and control financial limits for automated workflows.
        </p>
      </div>

      {/* Permissions Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-[#374151] pb-2">
          <Lock className="w-5 h-5 text-[#9CA3AF]" />
          <h2 className="text-xl font-medium">Agent Permissions</h2>
        </div>

        <div className="grid gap-4">
          
          {/* Metaphor */}
          <div className="bg-[#1A1D24] border border-[#374151] rounded-xl p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#252932] rounded-lg">
                <Brain className="w-6 h-6 text-[#A78BFA]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Metaphor Intelligence</h3>
                <p className="text-[#9CA3AF] text-sm mt-1 max-w-md">
                  Allow Metaphor to continuously read your connected Notion docs, Jira tickets, and Slack messages to populate the Knowledge Graph.
                </p>
              </div>
            </div>
            <button 
              onClick={() => togglePermission('metaphor')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${permissions.metaphor ? 'bg-[#4F46E5]' : 'bg-[#374151]'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${permissions.metaphor ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Atlas */}
          <div className="bg-[#1A1D24] border border-[#374151] rounded-xl p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#252932] rounded-lg">
                <Activity className="w-6 h-6 text-[#34D399]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Atlas Outreach</h3>
                <p className="text-[#9CA3AF] text-sm mt-1 max-w-md">
                  Allow the Campaign Engine to autonomously dispatch emails and LinkedIn messages on your behalf without requiring manual approval.
                </p>
              </div>
            </div>
            <button 
              onClick={() => togglePermission('atlas')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${permissions.atlas ? 'bg-[#4F46E5]' : 'bg-[#374151]'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${permissions.atlas ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {/* Clario */}
          <div className="bg-[#1A1D24] border border-[#374151] rounded-xl p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-[#252932] rounded-lg">
                <Video className="w-6 h-6 text-[#FBBF24]" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Clario Video Engine</h3>
                <p className="text-[#9CA3AF] text-sm mt-1 max-w-md">
                  Grant permission to use your cloned voice and likeness to generate synthetic personalized outreach videos.
                </p>
              </div>
            </div>
            <button 
              onClick={() => togglePermission('clario')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${permissions.clario ? 'bg-[#4F46E5]' : 'bg-[#374151]'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${permissions.clario ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

        </div>
      </section>

      {/* Financial Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-[#374151] pb-2">
          <CreditCard className="w-5 h-5 text-[#9CA3AF]" />
          <h2 className="text-xl font-medium">Financial Controls</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Current Usage */}
          <div className="bg-[#1A1D24] border border-[#374151] rounded-xl p-6 space-y-4">
            <h3 className="text-[#9CA3AF] font-medium uppercase tracking-wider text-sm">Current Billing Cycle (Sept)</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">£{currentSpend.toFixed(2)}</span>
              <span className="text-[#9CA3AF] mb-1">/ £{spendingLimit.toFixed(2)} limit</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full bg-[#374151] h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#4F46E5] h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (currentSpend / spendingLimit) * 100)}%` }} 
              />
            </div>

            {/* Breakdown */}
            <div className="pt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#FBBF24]"></div> Clario GPU Time</span>
                <span>£15.00</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#A78BFA]"></div> Metaphor Processing</span>
                <span>£12.20</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-[#34D399]"></div> Atlas Inference (GPT-4o)</span>
                <span>£5.30</span>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="bg-[#1A1D24] border border-[#374151] rounded-xl p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-lg mb-1">Monthly Spending Limit</h3>
              <p className="text-[#9CA3AF] text-sm mb-4">
                Set a hard cap on how much your automated AI workflows can spend each month. Operations will pause if this limit is hit.
              </p>
              
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  step="10"
                  value={spendingLimit}
                  onChange={(e) => setSpendingLimit(Number(e.target.value))}
                  className="w-full accent-[#4F46E5]"
                />
                <span className="font-mono bg-[#111318] px-3 py-1 rounded-md border border-[#374151]">£{spendingLimit}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-[#374151]">
              <Button className="w-full bg-[#374151] hover:bg-[#4B5563] text-white">
                View Detailed Invoices <ArrowUpRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
