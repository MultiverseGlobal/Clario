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
  Check,
  Edit2,
  ChevronRight,
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
  projectName?: string;
  onRenameProject?: (name: string) => void;
}

export function FloatingNav({
  currentPhase,
  hasApiKey,
  theme,
  toggleTheme,
  onNavigatePhase,
  onOpenApiKeyModal,
  hasActiveProject,
  projectName,
  onRenameProject,
}: FloatingNavProps) {
  const [serverHealthy, setServerHealthy] = useState(true);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(projectName || "");
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitleInput(projectName || "");
  }, [projectName]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (titleInput.trim() && onRenameProject && titleInput.trim() !== projectName) {
      onRenameProject(titleInput.trim());
    }
  };

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

  const isEditorActive = currentPhase === "video_canvas" || currentPhase === "slide_canvas";
  const isStudioActive = currentPhase === "studio" || currentPhase === "preview";

  return (
    <header className="fixed top-0 left-0 right-0 h-12 z-50 bg-background/85 backdrop-blur-xl border-b border-border/50 select-none">
      <div className="h-full w-full px-4 flex items-center justify-between gap-4">
        
        {/* ── Left: Brand & Active Project Context ──────────────────── */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => onNavigatePhase("home")}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer shrink-0"
            title="Return to Clario Home"
          >
            <ClarioLogo size={16} />
            <span className="text-xs font-bold text-foreground font-mono uppercase tracking-widest hidden sm:inline">
              Clario
            </span>
          </button>

          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 hidden sm:block" />

          {/* Project Title / Breadcrumb */}
          {hasActiveProject && projectName ? (
            <div className="flex items-center gap-2 min-w-0">
              {isEditingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleTitleSubmit();
                      if (e.key === "Escape") {
                        setTitleInput(projectName || "");
                        setIsEditingTitle(false);
                      }
                    }}
                    onBlur={handleTitleSubmit}
                    className="px-2 py-0.5 text-xs font-semibold bg-muted/60 border border-border rounded-md text-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40 sm:w-56"
                  />
                  <button
                    onClick={handleTitleSubmit}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setIsEditingTitle(true)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-md hover:bg-muted/50 cursor-pointer group transition-colors min-w-0"
                  title="Click to rename project"
                >
                  <span className="text-xs font-semibold text-foreground truncate max-w-[140px] sm:max-w-[220px]">
                    {projectName}
                  </span>
                  <Edit2 className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
                </div>
              )}

              {/* Autosave badge */}
              <div className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 shrink-0">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                <span>Vault Synced</span>
              </div>
            </div>
          ) : (
            <span className="text-xs font-medium text-muted-foreground hidden sm:inline">
              Studio Workspace
            </span>
          )}
        </div>

        {/* ── Center: Workbench Phase Switcher ──────────────────────── */}
        <nav className="flex items-center p-0.5 rounded-xl bg-muted/40 border border-border/40 backdrop-blur-md shrink-0">
          
          {/* 1. Projects / Workspace */}
          <button
            onClick={() => onNavigatePhase("home")}
            title="Projects Catalog"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              currentPhase === "home"
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Projects</span>
          </button>

          {/* 2. Editor Tab — Clean Shots */}
          <button
            onClick={() => onNavigatePhase("video_canvas")}
            title="Clean Shots Editor"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer relative ${
              isEditorActive
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Film className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Clean Shots</span>
            {hasActiveProject && !isEditorActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {/* 3. Loom Pitch Studio Tab */}
          <button
            onClick={() => onNavigatePhase("studio")}
            title="Loom Pitch Studio — Record & Edit"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer relative ${
              isStudioActive
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Radio className="w-3.5 h-3.5 shrink-0 text-red-500" />
            <span className="hidden sm:inline">Loom Pitch</span>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
            </span>
          </button>

          {/* 4. Assets Vault Tab */}
          <button
            onClick={() => onNavigatePhase("reference_library")}
            title="Assets — Media Vault & Script Intelligence"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150 cursor-pointer ${
              currentPhase === "reference_library"
                ? "bg-foreground text-background shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Library className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Assets</span>
          </button>
        </nav>

        {/* ── Right: Telemetry, Shortcuts & Settings ────────────────── */}
        <div className="flex items-center gap-2 shrink-0">
          
          {/* Cloud GPU Telemetry Pill */}
          <div
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border border-border/50 bg-muted/20 cursor-help"
            title={serverHealthy ? "Cloud GPU Engine: Online (Modal T4 Active)" : "Local Mode: Engine standby"}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${serverHealthy ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" : "bg-amber-400"}`} />
            <span className="text-muted-foreground hidden lg:inline font-sans font-medium">
              {serverHealthy ? "Modal GPU Online" : "Local Standby"}
            </span>
          </div>

          {/* Command Palette Launcher */}
          <button
            onClick={() => {
              const e = new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true });
              document.dispatchEvent(e);
            }}
            title="Open Command Palette (⌘K)"
            className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/40 text-[11px] font-mono cursor-pointer transition-colors"
          >
            <Command className="w-3 h-3" />
            <span>⌘K</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
          >
            {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          {/* Settings / API Key Modal */}
          <button
            onClick={onOpenApiKeyModal}
            title="Settings & AI Keys"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer relative"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${hasApiKey ? "bg-emerald-500" : "bg-amber-500"}`} />
          </button>

          <div className="w-px h-4 bg-border/50 mx-0.5 shrink-0" />

          {/* Ecosystem Switcher */}
          <div className="flex items-center">
            <EcosystemSwitcher />
          </div>
        </div>

      </div>
    </header>
  );
}
