"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Network, Database, Key, Plug, Settings, Sidebar, User, ChevronDown, Layers, Terminal, Inbox, LogOut, Folder, Activity, Zap } from "lucide-react";

import { Kbd } from "@/components/ui/Kbd";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";
import { EcosystemSwitcher } from "@/components/ui/EcosystemSwitcher";
import { WeavePanel } from "@/components/WeavePanel";

export default function LinearLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isWeavePanelOpen, setIsWeavePanelOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  const pathname = usePathname();

  React.useEffect(() => {
    async function fetchUser() {
      try {
        const { fetchFromMetaphor } = await import("@/app/api");
        const data = await fetchFromMetaphor("/auth/me");
        
        const { createClient } = await import("@/utils/supabase/client");
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        const sbUser = session?.user;
        const storedCustomName = typeof window !== "undefined" ? localStorage.getItem("metaphor_user_name") : null;
        // Prefer Google full_name → first name from email → generic fallback (never the raw email prefix)
        const googleFullName = sbUser?.user_metadata?.full_name || sbUser?.user_metadata?.name;
        const emailPrefix = sbUser?.email ? sbUser.email.split("@")[0] : null;
        // Only use email prefix if it looks like an actual personal name (short, no numbers, no compound words)
        const emailFirstWord = emailPrefix ? emailPrefix.replace(/[^a-zA-Z]/g, " ").trim().split(" ")[0] : null;
        const cleanEmailName = emailFirstWord && emailFirstWord.length >= 3 && emailFirstWord.length <= 10
          ? emailFirstWord.charAt(0).toUpperCase() + emailFirstWord.slice(1)
          : null;
        const fallbackName = googleFullName || cleanEmailName || "Your Workspace";
        const fallbackEmail = sbUser?.email || "workspace@metaphor.os";

        const isGenericName = !data?.name || data.name === "Developer User" || data.name === "Supabase User";
        const resolvedName = storedCustomName || (!isGenericName ? data.name : fallbackName);
        setUser({
          name: resolvedName,
          email: data?.email || fallbackEmail
        });


      } catch (e) {
        console.warn("Failed to fetch user in layout (Sovereign mode likely active):", e);
        const storedCustomName = typeof window !== "undefined" ? localStorage.getItem("metaphor_user_name") : null;
        setUser({ name: storedCustomName || "Sovereign User", email: "sovereign@local" });
      }
    }
    fetchUser();
    
    // Cloud Sync
    import("@/lib/settings").then(m => m.pullSettingsFromCloud());

    const handleProfileUpdate = () => {
      fetchUser();
      import("@/lib/settings").then(m => m.pushSettingsToCloud());
    };
    window.addEventListener("user-profile-updated", handleProfileUpdate);
    return () => window.removeEventListener("user-profile-updated", handleProfileUpdate);
  }, []);



  return (
    <div className="flex h-screen w-screen bg-background overflow-hidden text-sm">
      
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
        />
      )}

      {/* Responsive Sidebar Drawer */}
      <div 
        className={`flex flex-col bg-surface-1 border-r border-border-subtle ease-in-out z-50 fixed md:static inset-y-0 left-0 h-full ${
          isSidebarOpen ? "w-64 opacity-100 translate-x-0" : "w-0 opacity-0 -translate-x-full md:translate-x-0 overflow-hidden"
        }`}
        style={{ transition: 'all var(--transition-fast)' }}
      >

        {/* Workspace Header */}
        <div className="h-14 flex items-center px-6 mt-2 mb-2 font-semibold text-foreground tracking-tight">
          <MetaphorLogo size={20} className="mr-3" />
          Metaphor OS
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar py-2 px-3 space-y-5">
          
          {/* Section 1: Workspace & Memory */}
          <div className="space-y-0.5">
            <div className="px-3 py-1 text-[10px] font-bold text-muted/70 uppercase tracking-widest">
              Workspace & Memory
            </div>
            <NavItem href="/dashboard" icon={<Database />} label="Context Dashboard" shortcut="⌘D" pathname={pathname} exact />
            <NavItem href="/dashboard/graph" icon={<Network />} label="Knowledge Graph" shortcut="⌘G" pathname={pathname} />
            <NavItem href="/dashboard/projects" icon={<Folder />} label="Projects" shortcut="⌘J" pathname={pathname} />
            <NavItem href="/dashboard/editor" icon={<Terminal />} label="Draft Editor" shortcut="⌘E" pathname={pathname} />
            <NavItem href="/dashboard/inbox" icon={<Inbox />} label="Context Inbox" shortcut="⌘I" pathname={pathname} />
          </div>

          {/* Section 2: Cognitive Engine */}
          <div className="space-y-0.5">
            <div className="px-3 py-1 text-[10px] font-bold text-muted/70 uppercase tracking-widest">
              Cognitive Engine
            </div>
            <NavItem href="/dashboard/playground" icon={<Terminal />} label="The Context Layer" shortcut="⌘P" pathname={pathname} />
            <NavItem href="/dashboard/models" icon={<Layers />} label="Context Models" shortcut="⌘M" pathname={pathname} />
          </div>

          {/* Section 2.5: Pseudonyms */}
          <div className="space-y-0.5">
            <div className="px-3 py-1 text-[10px] font-bold text-muted/70 uppercase tracking-widest">
              Pseudonyms
            </div>
            <NavItem href="/dashboard/pipeline" icon={<Activity />} label="Cognitive Pipeline" shortcut="⌘O" pathname={pathname} />
          </div>

          {/* Section 3: Integrations & MCP */}
          <div className="space-y-0.5">
            <div className="px-3 py-1 text-[10px] font-bold text-muted/70 uppercase tracking-widest">
              Integrations & Remote MCP
            </div>
            <NavItem href="/dashboard/integrations" icon={<Plug />} label="Integrations" shortcut="⌘K" pathname={pathname} />
            <NavItem href="/dashboard/api" icon={<Key />} label="API Access & MCP" shortcut="⌘A" pathname={pathname} />
          </div>

        </div>


        {/* Footer Navigation */}
        <div className="p-3 space-y-1 mb-2 border-t border-border-subtle/50 pt-3">
          <NavItem href="/dashboard/settings" icon={<Settings />} label="Settings" shortcut="⌘," pathname={pathname} />
          
          {/* Account Profile & Sign Out Controls */}
          <div className="pt-2">
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-surface-1 border border-border-subtle hover:border-strong transition-all group">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : "M"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-medium text-foreground truncate">
                    {user ? user.name : "Loading..."}
                  </div>
                  <div className="text-[10px] text-muted truncate">
                    {user ? user.email : "..."}
                  </div>
                </div>
              </div>
              <button
                onClick={async () => {
                  try {
                    const { createClient } = await import("@/utils/supabase/client");
                    const supabase = createClient();
                    await supabase.auth.signOut();
                  } catch (e) {
                    console.error("Sign out error:", e);
                  }
                  if (typeof window !== "undefined") {
                    localStorage.clear();
                  }
                  document.cookie = "metaphor_onboarded=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                  window.location.href = "/login";
                }}

                className="p-1.5 rounded-md text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0 bg-background h-full overflow-hidden">
        
        {/* Topbar Header */}
        <header className="nav-glass h-12 px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-md text-muted hover:bg-surface-2 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 transition-colors"
              title="Toggle Sidebar"
            >
              <Sidebar className="w-4 h-4" />
            </button>
            <div className="h-4 w-[1px] bg-border-subtle" />
            <span className="text-xs font-medium text-muted tracking-tight">Metaphor OS</span>
          </div>

          {/* Google-Style 9-Dot Ecosystem Waffle Switcher */}
          <div className="flex items-center gap-2">
            {/* Weave Panel Toggle */}
            <button
              onClick={() => setIsWeavePanelOpen(o => !o)}
              className={`p-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)] ${
                isWeavePanelOpen
                  ? 'bg-[var(--color-accent-dim)] text-[var(--color-foreground)] border border-[var(--color-border-mid)]'
                  : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]'
              }`}
              title="Toggle Weave Intelligence Panel"
            >
              <Zap className="w-4 h-4" />
            </button>
            <EcosystemSwitcher />
          </div>
        </header>

        {/* Workspace Void */}
        <div className="flex-1 overflow-hidden relative z-10 flex">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>

          {/* Weave Panel — collapsible right column */}
          <div
            style={{
              width: isWeavePanelOpen ? 340 : 0,
              minWidth: isWeavePanelOpen ? 340 : 0,
              overflow: 'hidden',
              transition: 'all 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
              borderLeft: isWeavePanelOpen ? '1px solid var(--color-border-subtle)' : 'none',
              background: 'var(--color-surface-1)',
            }}
          >
            {isWeavePanelOpen && (
              <div style={{ width: 340, height: '100%', overflowY: 'auto' }}>
                <WeavePanel />
              </div>
            )}
          </div>
        </div>
      </div>
      
    </div>
  );
}

function NavItem({ 
  icon, 
  label, 
  shortcut, 
  href = "#", 
  pathname = "", 
  exact = false 
}: { 
  icon: React.ReactNode, 
  label: string, 
  shortcut?: string, 
  href?: string,
  pathname?: string,
  exact?: boolean
}) {
  const active = exact ? pathname === href : pathname.startsWith(href) && (href !== "/dashboard" || pathname === "/dashboard");

  return (
    <Link 
      href={href}
      className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-strong)] transition-colors ${
        active 
          ? "bg-[var(--color-accent-dim)] border border-[var(--color-border-mid)] text-[var(--color-foreground)]" 
          : "text-[var(--color-muted)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
      }`}
    >
      <div className="flex items-center gap-3">
        {React.cloneElement(icon as React.ReactElement, { 
          className: `w-4 h-4 ${active ? "text-[var(--color-foreground)]" : "opacity-60 group-hover:opacity-100"} transition-opacity duration-150` 
        })}
        <span className="font-medium text-[13px] tracking-tight">{label}</span>
      </div>
      {shortcut && (
        <div className={`opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 ${active ? 'opacity-100' : ''}`}>
          <Kbd>{shortcut}</Kbd>
        </div>
      )}
    </Link>
  );
}
