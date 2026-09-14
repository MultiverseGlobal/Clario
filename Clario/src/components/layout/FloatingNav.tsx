import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Command,
  FolderKanban,
  Film,
  Radio,
  Library,
  SlidersHorizontal,
} from "lucide-react";
import { EcosystemSwitcher } from "../ui/EcosystemSwitcher";
import { ClarioLogo } from "../ui/ClarioLogo";
import { ClarioPhase } from "./AppShell";
import { checkServerHealth } from "../../lib/apiClient";

interface FloatingNavProps {
  currentPhase: ClarioPhase;
  hasApiKey: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onNavigatePhase: (phase: ClarioPhase) => void;
  onOpenApiKeyModal: () => void;
  hasActiveProject?: boolean;
}

export function FloatingNav({
  currentPhase,
  hasApiKey,
  theme,
  toggleTheme,
  onNavigatePhase,
  onOpenApiKeyModal,
  hasActiveProject,
}: FloatingNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [serverHealthy, setServerHealthy] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      const healthy = await checkServerHealth();
      if (mounted) setServerHealthy(healthy);
    };
    check();
    const interval = setInterval(check, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const isEditorActive = currentPhase === "video_canvas" || currentPhase === "slide_canvas";
  const isStudioActive = currentPhase === "studio" || currentPhase === "preview";

  return (
    <>
      {/* ── Brand Mark — top left ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-5 left-5 z-50"
        ref={menuRef}
      >
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card/85 border border-border/60 shadow-sm backdrop-blur-md hover:bg-card transition-colors outline-none cursor-pointer"
        >
          <ClarioLogo size={16} />
          <span className="text-[11px] font-bold text-foreground font-mono uppercase tracking-widest">
            Clario
          </span>
        </button>

        {menuOpen && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-card/95 backdrop-blur-xl border border-border/50 shadow-xl rounded-xl p-1 z-50">
            <button
              onClick={() => {
                const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
                document.dispatchEvent(e);
                setMenuOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] rounded-lg hover:bg-foreground hover:text-background transition-colors text-left cursor-pointer"
            >
              <Command className="w-3.5 h-3.5 shrink-0" />
              <span>Command Palette</span>
              <span className="ml-auto text-[10px] font-mono opacity-60">⌘K</span>
            </button>
            <button
              onClick={() => { toggleTheme(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] rounded-lg hover:bg-foreground hover:text-background transition-colors text-left cursor-pointer"
            >
              {theme === "dark" ? <Sun className="w-3.5 h-3.5 shrink-0" /> : <Moon className="w-3.5 h-3.5 shrink-0" />}
              <span>Toggle Theme</span>
            </button>
          </div>
        )}
      </motion.div>

      {/* ── Main Navigation Dock — top right ────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-5 right-5 z-50"
      >
        <div className="flex items-center p-1 rounded-2xl bg-card/85 border border-border/60 shadow-lg backdrop-blur-xl">
          
          {/* 1. Projects Tab */}
          <button
            onClick={() => onNavigatePhase("home")}
            title="Projects Catalog"
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
              currentPhase === "home"
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-medium">Projects</span>
          </button>

          {/* 2. Editor Tab */}
          <button
            onClick={() => onNavigatePhase("video_canvas")}
            title="Timeline & Canvas Editor"
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
              isEditorActive
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Film className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-medium">Editor</span>
            {hasActiveProject && !isEditorActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            )}
          </button>

          {/* 3. Studio / Recording Tab */}
          <button
            onClick={() => onNavigatePhase("studio")}
            title="AI Director Recording Studio"
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer relative ${
              isStudioActive
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span className="text-xs font-medium">Studio</span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
          </button>

          {/* 4. Library & Vault Tab */}
          <button
            onClick={() => onNavigatePhase("reference_library")}
            title="Asset Vault & Script Analysis"
            className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
              currentPhase === "reference_library"
                ? "bg-foreground text-background font-semibold shadow-sm"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
          >
            <Library className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs font-medium">Library</span>
          </button>

          {/* Divider */}
          <div className="w-px h-4 bg-border/60 mx-1 shrink-0" />

          {/* 5. Settings Modal Trigger */}
          <button
            onClick={onOpenApiKeyModal}
            title="Configuration & AI Keys"
            className="group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl transition-all duration-200 text-muted-foreground hover:bg-muted/60 hover:text-foreground cursor-pointer relative"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? "bg-emerald-500" : "bg-amber-500"}`} />
          </button>

          {/* 6. Backend Status Indicator */}
          <div 
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono border border-border/40 bg-muted/20 cursor-help"
            title={serverHealthy ? "Backend AI Processor: Online & Connected" : "Local Mode: AI Processor Sleeping (Auto-wakes on jobs)"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${serverHealthy ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-amber-400'}`} />
            <span className="text-muted-foreground hidden sm:inline">{serverHealthy ? 'AI Online' : 'Local'}</span>
          </div>

          {/* 7. Ecosystem Switcher */}
          <div className="pl-1 flex items-center justify-center">
            <EcosystemSwitcher />
          </div>
        </div>
      </motion.div>
    </>
  );
}
