"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";

type Phase = "connect" | "projects" | "complete";

function OnboardingContent() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("connect");
  
  // Phase 1: Connect
  const [githubToken, setGithubToken] = useState("");
  const [notionToken, setNotionToken] = useState("");

  // Phase 2: Projects
  const [projects, setProjects] = useState<{ name: string; attachedAIs: string[] }[]>([]);
  const [currentProjectName, setCurrentProjectName] = useState("");
  
  // Finish
  const finalize = () => {
    document.cookie = "metaphor_onboarded=true; path=/; max-age=31536000";
    localStorage.setItem("metaphor_onboarded", "true");
    
    // Save tokens locally if provided
    if (githubToken.trim()) localStorage.setItem("metaphor_github_token", githubToken.trim());
    if (notionToken.trim()) localStorage.setItem("metaphor_notion_token", notionToken.trim());
    
    // Save projects
    if (projects.length > 0) {
      localStorage.setItem("metaphor_projects", JSON.stringify(projects));
    }
    
    import("@/lib/settings").then(m => m.pushSettingsToCloud());
    router.push("/dashboard");
  };

  if (phase === "connect") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans animate-in fade-in duration-500">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center mb-6">
              <MetaphorLogo size={48} />
            </div>
            <h1 className="text-3xl font-medium tracking-tight">Connect your knowledge</h1>
            <p className="text-sm text-muted">Securely link your data sources. In sovereign mode, tokens are stored locally.</p>
          </div>

          <div className="space-y-4 bg-surface-1 border border-border-subtle p-6 rounded-2xl">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 block">GitHub Personal Access Token</label>
              <input 
                type="password" 
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-border-strong"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 block">Notion Internal Integration Token</label>
              <input 
                type="password" 
                value={notionToken}
                onChange={(e) => setNotionToken(e.target.value)}
                placeholder="secret_xxxxxxxxxxxxxxxxxxxx"
                className="w-full bg-background border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-border-strong"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setPhase("projects")}
              className="flex-1 py-4 border border-border-strong text-foreground rounded-xl text-sm font-medium hover:bg-surface-2 transition-colors cursor-pointer"
            >
              Skip for now
            </button>
            <button 
              onClick={() => setPhase("projects")}
              className="flex-1 py-4 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
            >
              Continue <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "projects") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-foreground font-sans animate-in fade-in duration-500">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-medium tracking-tight">Initialize Workspace</h1>
            <p className="text-sm text-muted">Create your first project context.</p>
          </div>

          <div className="space-y-4 bg-surface-1 border border-border-subtle p-6 rounded-2xl">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 block">Project Name</label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={currentProjectName}
                  onChange={(e) => setCurrentProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && currentProjectName.trim()) {
                      setProjects([...projects, { name: currentProjectName.trim(), attachedAIs: [] }]);
                      setCurrentProjectName("");
                    }
                  }}
                  placeholder="e.g. Metaphor OS Core..."
                  className="flex-1 bg-background border border-border-subtle rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-border-strong"
                />
                <button 
                  onClick={() => {
                    if (currentProjectName.trim()) {
                      setProjects([...projects, { name: currentProjectName.trim(), attachedAIs: [] }]);
                      setCurrentProjectName("");
                    }
                  }}
                  className="px-6 bg-surface-2 border border-border-strong rounded-xl text-sm font-medium hover:bg-background transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {projects.length > 0 && (
              <div className="mt-6 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 block">Added Projects</label>
                {projects.map((p, i) => (
                  <div key={i} className="px-4 py-3 bg-background border border-border-subtle rounded-xl flex items-center justify-between">
                    <span className="text-sm font-medium">{p.name}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <button 
            onClick={finalize}
            className="w-full py-4 bg-foreground text-background rounded-xl text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer flex items-center justify-center gap-2"
          >
            Launch System <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <OnboardingContent />
    </Suspense>
  );
}
