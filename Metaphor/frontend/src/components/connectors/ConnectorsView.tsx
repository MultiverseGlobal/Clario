// Layer 6: UI - Integrations & Data Sources - ConnectorsView.tsx
'use client';

import React from 'react';
import { Plug, GitCommit, FileText, Calendar, CreditCard, Mail, CheckCircle2, RefreshCw } from 'lucide-react';

export const ConnectorsView: React.FC = () => {
  const connectors = [
    { name: 'GitHub Repositories', icon: GitCommit, type: 'Code & Commits', status: 'Active', desc: 'Syncs commit history, pull requests, and code branches into living context.' },
    { name: 'Notion Workspaces', icon: FileText, type: 'Documents & Spec', status: 'Active', desc: 'Indexes strategy docs, interview notes, and pricing decisions.' },
    { name: 'Google Calendar', icon: Calendar, type: 'Meetings & Schedule', status: 'Active', desc: 'Tracks upcoming sync meetings, client calls, and schedule availability.' },
    { name: 'Stripe Billing', icon: CreditCard, type: 'Subscriptions & MRR', status: 'Active', desc: 'Monitors paid invoices, customer churn, and pricing tier changes.' },
    { name: 'Gmail Exhaust', icon: Mail, type: 'Email & Inbound', status: 'Active', desc: 'Extracts client feedback and outbound sales communication.' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-fade text-left">
      
      <div className="space-y-1">
        <div className="eyebrow text-primary font-mono">Data Pipeline</div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Active Integration Connectors</h2>
        <p className="text-xs text-muted-foreground">Manage live external credentials feeding raw digital exhaust into the Metaphor Context OS.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {connectors.map((conn) => {
          const Icon = conn.icon;
          return (
            <div 
              key={conn.name}
              className="metaphor-glass p-5 border border-border bg-card/60 rounded-xl space-y-3 hover:border-primary/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-serif text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{conn.name}</h4>
                    <span className="eyebrow text-[9px]">{conn.type}</span>
                  </div>
                </div>

                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {conn.status}
                </span>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{conn.desc}</p>
            </div>
          );
        })}
      </div>

    </div>
  );
};
