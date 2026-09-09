import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sun,
  Moon,
  Command,
  FolderOpen,
  Settings,
  Layers,
} from "lucide-react";
import { EcosystemSwitcher } from "../ui/EcosystemSwitcher";
import { ClarioLogo } from "../ui/ClarioLogo";
import { ClarioPhase } from "./AppShell";

interface FloatingNavProps {
  currentPhase: ClarioPhase;
  hasApiKey: boolean;
  theme: "light" | "dark";
  toggleTheme: () => void;
  onNavigatePhase: (phase: ClarioPhase) => void;
  onOpenApiKeyModal: () => void;
}


export function FloatingNav({
  currentPhase,
  hasApiKey,
  theme,
  toggleTheme,
  onNavigatePhase,
  onOpenApiKeyModal,
}: FloatingNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-card/80 border border-border/50 shadow-sm backdrop-blur-md hover:bg-card transition-colors outline-none"
        >
          <ClarioLogo size={16} />
          <span className="text-[11px] font-semibold text-muted-foreground hidden sm:block font-mono uppercase tracking-widest">
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
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] rounded-lg hover:bg-foreground hover:text-background transition-colors text-left"
            >
              <Command className="w-3.5 h-3.5 shrink-0" />
              <span>Command Palette</span>
              <span className="ml-auto text-[10px] font-mono opacity-60">⌘K</span>
            </button>
            <button
              onClick={() => { toggleTheme(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] rounded-lg hover:bg-foreground hover:text-background transition-colors text-left"
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
        <div className="flex items-center p-1 rounded-2xl bg-card/80 border border-border/50 shadow-sm backdrop-blur-md">
          {/* Projects */}
          <button
            onClick={() => onNavigatePhase("home")}
            title="Projects"
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ease-out ${
              currentPhase === "home"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <FolderOpen className={`w-3.5 h-3.5 ${currentPhase === "home" ? "" : "opacity-70 group-hover:opacity-100 transition-opacity"}`} />
            <span className={`text-[11px] font-semibold font-mono tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${
              currentPhase === "home" ? "max-w-24 opacity-100" : "max-w-0 opacity-0 group-hover:max-w-24 group-hover:opacity-100 group-hover:ml-2"
            }`}>
              Projects
            </span>
          </button>

          {/* Reference Library */}
          <button
            onClick={() => onNavigatePhase("reference_library")}
            title="Reference Library"
            className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ease-out ${
              currentPhase === "reference_library"
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${currentPhase === "reference_library" ? "" : "opacity-70 group-hover:opacity-100 transition-opacity"}`} />
            <span className={`text-[11px] font-semibold font-mono tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ease-out ${
              currentPhase === "reference_library" ? "max-w-32 opacity-100" : "max-w-0 opacity-0 group-hover:max-w-32 group-hover:opacity-100 group-hover:ml-2"
            }`}>
              Ref Library
            </span>
          </button>


          <button
            onClick={onOpenApiKeyModal}
            title="Settings"
            className="group flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 ease-out text-muted-foreground hover:bg-muted/80 hover:text-foreground relative"
          >
            <Settings className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
            <div className={`absolute top-1.5 left-1.5 w-1.5 h-1.5 rounded-full ring-2 ring-background ${hasApiKey ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="text-[11px] font-semibold font-mono tracking-wide whitespace-nowrap overflow-hidden transition-all duration-300 ease-out max-w-0 opacity-0 group-hover:max-w-24 group-hover:opacity-100 group-hover:ml-2">
              Settings
            </span>
          </button>

          <div className="w-px h-4 bg-border/50 mx-1 shrink-0" />

          <div className="px-1.5 flex items-center justify-center">
            <EcosystemSwitcher />
          </div>
        </div>
      </motion.div>
    </>
  );
}
