import { useEffect, useState, useRef } from 'react';
import { listProjects, deleteProject, saveProject, duplicateProject, ClarioProject } from '../../lib/projectStore';
import { 
  Play, 
  Plus, 
  Clock, 
  FileVideo, 
  Trash2, 
  Edit2, 
  Radio, 
  Upload, 
  Link2, 
  Scissors,
  Search, 
  Copy, 
  Sparkles, 
  Cpu, 
  HardDrive,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ProjectCreationWizard } from './ProjectCreationWizard';
import { resolveVideoDuration } from '../../lib/resolveVideoDuration';
import { detectCinematicScenes } from '../../lib/clientSceneDetector';

export function HomeView({ 
  onSelectProject,
  onNavigatePhase
}: { 
  onSelectProject: (p: ClarioProject) => void;
  onNavigatePhase?: (phase: any) => void;
}) {
  const [projects, setProjects] = useState<ClarioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'sales' | 'social' | 'slides'>('all');
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [importUrlInput, setImportUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [analysingFile, setAnalysingFile] = useState<{ name: string; progress: number; msg: string } | null>(null);

  async function load() {
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const [projectToDelete, setProjectToDelete] = useState<ClarioProject | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<ClarioProject | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = () => {
    setShowWizard(true);
  };

  const handleDelete = (e: React.MouseEvent, p: ClarioProject) => {
    e.stopPropagation();
    setProjectToDelete(p);
  };

  const handleEdit = (e: React.MouseEvent, p: ClarioProject) => {
    e.stopPropagation();
    setProjectToEdit(p);
    setEditName(p.name);
  };

  const handleDuplicate = async (e: React.MouseEvent, p: ClarioProject) => {
    e.stopPropagation();
    try {
      const cloned = await duplicateProject(p.id);
      if (cloned) {
        await load();
      }
    } catch (err) {
      console.error('Failed to duplicate:', err);
    }
  };

  const confirmDelete = async () => {
    if (projectToDelete) {
      await deleteProject(projectToDelete.id);
      setProjectToDelete(null);
      load();
    }
  };

  const confirmEdit = async () => {
    if (projectToEdit && editName.trim()) {
      await saveProject({ ...projectToEdit, name: editName.trim() });
      setProjectToEdit(null);
      load();
    }
  };

  // Instant Quick-Action: Upload File — reads real duration and runs scene detection
  const handleQuickUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset input so same file can be re-selected
    e.target.value = '';

    const blobUrl = URL.createObjectURL(file);
    const projId = `proj_${Date.now()}`;
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    setAnalysingFile({ name: baseName, progress: 5, msg: 'Reading video metadata…' });

    // Step 1: resolve real duration from browser
    const realDuration = await resolveVideoDuration(file);

    setAnalysingFile({ name: baseName, progress: 15, msg: 'Uploading to scene detector…' });

    let trackItems: ClarioProject['trackItems'];

    try {
      const result = await detectCinematicScenes(file, (p) => {
        setAnalysingFile({ name: baseName, progress: p.progressPct, msg: p.statusMsg });
      });

      trackItems = result.scenes.map((s, idx) => ({
        id: `track_${s.id}_${idx}`,
        title: s.sceneTag,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        type: 'video' as const,
        url: blobUrl,
        videoUrl: blobUrl,
        isBroll: s.contentType !== 'a_roll',
        beatType: (idx === 0 ? 'hook' : s.contentType === 'a_roll' ? 'problem' : 'proof') as any,
        scriptText: s.sceneTag,
        thumbnailUrl: s.frameUrl,
        scene_tag: s.sceneTag,
      }));
    } catch {
      // Server unreachable — fall back to single track with real duration
      const dur = realDuration ?? 30;
      trackItems = [{
        id: `track_0`,
        type: 'video',
        startTime: 0,
        endTime: dur,
        duration: dur,
        title: baseName,
        label: file.name,
        sourceFileName: file.name,
        videoUrl: blobUrl,
        url: blobUrl,
        beatType: 'hook',
        dopamineScore: 8,
      } as any];
    }

    setAnalysingFile(null);

    const newProj: ClarioProject = {
      id: projId,
      name: baseName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: 'video_harvester',
      targetPurpose: 'content_creator',
      category: 'content',
      aspectRatio: '16:9',
      trackItems,
    };
    await saveProject(newProj);
    onSelectProject(newProj);
  };

  // Instant Quick-Action: URL Import — resolves real duration before creating project
  const handleUrlSubmit = async () => {
    if (!importUrlInput.trim()) return;
    setUrlModalOpen(false);

    const url = importUrlInput.trim();
    const projId = `proj_${Date.now()}`;
    const label = url.length > 40 ? url.slice(0, 40) + '…' : url;

    setAnalysingFile({ name: label, progress: 10, msg: 'Resolving video duration…' });
    const realDuration = await resolveVideoDuration(url);
    setAnalysingFile({ name: label, progress: 20, msg: 'Uploading to scene detector…' });

    let trackItems: ClarioProject['trackItems'];
    try {
      const result = await detectCinematicScenes(new URL(url) as unknown as File, (p) => {
        setAnalysingFile({ name: label, progress: p.progressPct, msg: p.statusMsg });
      });
      trackItems = result.scenes.map((s, idx) => ({
        id: `track_${s.id}_${idx}`,
        title: s.sceneTag,
        startTime: s.startTime,
        endTime: s.endTime,
        duration: s.duration,
        type: 'video' as const,
        url,
        videoUrl: url,
        isBroll: s.contentType !== 'a_roll',
        beatType: (idx === 0 ? 'hook' : 'proof') as any,
        scene_tag: s.sceneTag,
      }));
    } catch {
      const dur = realDuration ?? 30;
      trackItems = [{
        id: `track_0`,
        type: 'video',
        startTime: 0,
        endTime: dur,
        duration: dur,
        title: 'Web Source Video',
        label: url,
        videoUrl: url,
        url,
        beatType: 'hook',
        dopamineScore: 7,
      } as any];
    }

    setAnalysingFile(null);

    const newProj: ClarioProject = {
      id: projId,
      name: `Import: ${label}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      mode: 'video_harvester',
      targetPurpose: 'content_creator',
      category: 'content',
      aspectRatio: '16:9',
      trackItems,
    };
    await saveProject(newProj);
    onSelectProject(newProj);
  };

  // Filtered & Searched Projects
  const filteredProjects = projects.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === 'all') return true;
    if (activeFilter === 'sales') return p.targetPurpose === 'sales_outreach' || p.category === 'sales';
    if (activeFilter === 'social') return p.targetPurpose === 'content_creator' || p.category === 'content';
    if (activeFilter === 'slides') return p.mode === 'slide_harvester' || p.mode === 'carousel';
    return true;
  });

  return (
    <div className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6 py-8 animate-fade-in">
      
      {/* Hidden file input for Instant Upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="video/*" 
        style={{ display: "none" }} 
        onChange={handleQuickUpload}
      />

      {/* ── Studio Header & Primary Action ────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono uppercase tracking-wider bg-primary/10 text-primary font-bold border border-primary/20">
              Studio Command Center
            </span>
            <span className="text-xs text-muted-foreground font-mono">PDS-v5</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">
            Projects & Studio
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            Create high-retention video stories, outreach pitch videos, and editorial cuts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleCreate} 
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md hover:bg-primary/90 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* ── Studio Quick-Action Launchpad Cards ───────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        
        {/* 1. Instant Camera & Screen Studio */}
        <div 
          onClick={() => onNavigatePhase?.('studio')}
          className="group p-4 rounded-2xl bg-card/60 hover:bg-card/90 border border-border/50 hover:border-red-500/40 transition-all cursor-pointer backdrop-blur-md relative overflow-hidden shadow-xs hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 group-hover:scale-105 transition-transform">
              <Radio className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
              Live HUD
            </span>
          </div>
          <h3 className="font-display text-sm font-bold text-foreground mb-1 group-hover:text-red-400 transition-colors">
            Instant Studio
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Record screen & camera with floating eye-line teleprompter.
          </p>
        </div>

        {/* 2. Upload Video Footage */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group p-4 rounded-2xl bg-card/60 hover:bg-card/90 border border-border/50 hover:border-primary/40 transition-all cursor-pointer backdrop-blur-md relative overflow-hidden shadow-xs hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
              <Upload className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary font-semibold">
              Direct Ingest
            </span>
          </div>
          <h3 className="font-display text-sm font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
            Upload Footage
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Instant drop to auto-detect scene cuts and transcribe beats.
          </p>
        </div>

        {/* 3. Import from URL */}
        <div 
          onClick={() => setUrlModalOpen(true)}
          className="group p-4 rounded-2xl bg-card/60 hover:bg-card/90 border border-border/50 hover:border-amber-500/40 transition-all cursor-pointer backdrop-blur-md relative overflow-hidden shadow-xs hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-105 transition-transform">
              <Link2 className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-semibold">
              Web Media
            </span>
          </div>
          <h3 className="font-display text-sm font-bold text-foreground mb-1 group-hover:text-amber-400 transition-colors">
            Import from URL
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Paste YouTube, Drive, or raw MP4 links for AI breakdown.
          </p>
        </div>

        {/* 4. Extract Source Assets */}
        <div 
          onClick={() => onNavigatePhase?.('extract_assets')}
          className="group p-4 rounded-2xl bg-card/60 hover:bg-card/90 border border-border/50 hover:border-emerald-500/40 transition-all cursor-pointer backdrop-blur-md relative overflow-hidden shadow-xs hover:shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
              <Scissors className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-semibold">
              Asset Extract
            </span>
          </div>
          <h3 className="font-display text-sm font-bold text-foreground mb-1 group-hover:text-emerald-400 transition-colors">
            Extract Source Assets
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Detect every segment, extract clean clips, flag overlays, save to vault.
          </p>
        </div>

      </div>

      {/* ── Search & Filter Control Bar ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-border/40">
        
        {/* Category Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-muted/40 border border-border/40 backdrop-blur-md w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Projects ({projects.length})
          </button>
          <button
            onClick={() => setActiveFilter('sales')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'sales'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            🎯 Sales Outreach
          </button>
          <button
            onClick={() => setActiveFilter('social')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'social'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            ⚡ Social Viral
          </button>
          <button
            onClick={() => setActiveFilter('slides')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'slides'
                ? 'bg-foreground text-background font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📊 Slide Decks
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-card/60 border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* ── Analysing Overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {analysingFile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/60 backdrop-blur-md"
          >
            <div className="clario-glass-card rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl border border-border">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-5">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground mb-1 truncate">{analysingFile.name}</h3>
              <p className="text-xs text-muted-foreground mb-5">{analysingFile.msg}</p>
              <div className="w-full h-1.5 rounded-full bg-border/60 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  animate={{ width: `${analysingFile.progress}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">{analysingFile.progress}%</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Project Grid / Catalog ───────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 rounded-2xl bg-card/40 border border-border/50 animate-pulse" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 rounded-2xl bg-card/30 border border-dashed border-border/60 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center mb-4 text-muted-foreground">
            <FileVideo className="w-6 h-6" />
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mb-1">
            {searchQuery ? "No matching projects found" : "No projects in this category"}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mb-6">
            {searchQuery
              ? `No projects match "${searchQuery}". Clear your search or create a new project.`
              : "Launch a new studio project, upload footage, or record directly to start editing."}
          </p>
          <button onClick={handleCreate} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md cursor-pointer">
            <Plus className="w-3.5 h-3.5" />
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(p => {
            const cutCount = p.trackItems?.length || 0;
            const totalDuration = p.trackItems?.reduce((sum, item) => sum + (item.duration || 0), 0) || 0;
            const durationFormatted = totalDuration > 0
              ? `${Math.floor(totalDuration / 60)}:${String(Math.floor(totalDuration % 60)).padStart(2, '0')}`
              : null;
            const isSales = p.targetPurpose === 'sales_outreach' || p.category === 'sales';
            const isSlides = p.mode === 'slide_harvester' || p.mode === 'carousel';

            return (
              <div
                key={p.id}
                onClick={() => onSelectProject(p)}
                className="group rounded-2xl bg-card/70 hover:bg-card/95 border border-border/50 hover:border-border transition-all duration-200 p-5 flex flex-col cursor-pointer shadow-xs hover:shadow-lg relative overflow-hidden select-none"
              >
                {/* Visual Header / Thumbnail Stage */}
                <div className="w-full h-36 rounded-xl bg-surface-2 border border-border/40 mb-4 relative overflow-hidden flex items-center justify-center">
                  
                  {/* Aspect Ratio Guide Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-10 font-mono text-3xl font-black">
                    {p.aspectRatio || "16:9"}
                  </div>

                  {/* Play Trigger Badge */}
                  <div className="w-10 h-10 rounded-full bg-foreground/90 text-background flex items-center justify-center shadow-md group-hover:scale-110 transition-transform z-10">
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>

                  {/* Top Badges */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider bg-background/80 backdrop-blur-md border border-border/60 text-foreground">
                      {isSlides ? "Slide Deck" : isSales ? "🎯 Sales Pitch" : "⚡ Viral Cut"}
                    </span>
                    {p.aspectRatio && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-background/60 backdrop-blur-md text-muted-foreground border border-border/40">
                        {p.aspectRatio}
                      </span>
                    )}
                  </div>

                  {/* Duration & Cut Count Badge */}
                  {durationFormatted && (
                    <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 z-10">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/80 text-white font-medium">
                        {durationFormatted}
                      </span>
                      {cutCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-black/80 text-emerald-400 font-medium">
                          {cutCount} cuts
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Project Title & Quick Actions */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {p.name}
                  </h3>

                  {/* Quick Action Icons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(e) => handleDuplicate(e, p)}
                      title="Duplicate Project"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleEdit(e, p)}
                      title="Rename Project"
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, p)}
                      title="Delete Project"
                      className="p-1 rounded-md text-red-500/70 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Footer Metadata */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-auto pt-3 border-t border-border/40 font-mono">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-muted-foreground/60" />
                    <span>{new Date(p.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <span className="text-primary font-sans font-medium text-xs group-hover:translate-x-0.5 transition-transform">
                    Open Studio →
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── System Telemetry Status Bar ──────────────────────────────── */}
      <div className="mt-12 pt-6 border-t border-border/40 flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground font-mono">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cloud GPU: Modal Serverless T4 (Ready)</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Vision AI: Gemini 2.0 Flash</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Storage: Dexie IndexedDB Vault</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Engine Status: Nominal</span>
        </div>
      </div>

      {/* ── Wizard Modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showWizard && (
          <ProjectCreationWizard 
            onClose={() => setShowWizard(false)} 
            onProjectCreated={(p) => {
              setShowWizard(false);
              onSelectProject(p);
            }}
            onSaveToLibrary={(p) => {
              setShowWizard(false);
              onSelectProject(p);
              onNavigatePhase?.('reference_library');
            }}
          />
        )}
      </AnimatePresence>

      {/* ── URL Import Modal ─────────────────────────────────────────── */}
      {urlModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" 
          onClick={() => setUrlModalOpen(false)}
        >
          <div 
            className="clario-glass-card max-w-md w-full p-6 rounded-2xl shadow-2xl border border-border" 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Link2 className="w-4 h-4" />
              </div>
              <h3 className="font-display text-lg font-bold">Import Media from URL</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Enter a direct video URL, Loom, YouTube link, or cloud asset. Clario will stream and parse it into your timeline.
            </p>
            <input
              type="url"
              value={importUrlInput}
              onChange={e => setImportUrlInput(e.target.value)}
              placeholder="https://example.com/video.mp4"
              className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary mb-5"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleUrlSubmit()}
            />
            <div className="flex justify-end gap-2.5">
              <button 
                onClick={() => setUrlModalOpen(false)} 
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              >
                Cancel
              </button>
              <button 
                onClick={handleUrlSubmit} 
                disabled={!importUrlInput.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground disabled:opacity-50 transition-colors shadow-sm"
              >
                Ingest to Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Dialog ───────────────────────────────── */}
      {projectToDelete && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" 
          onClick={() => setProjectToDelete(null)}
        >
          <div 
            className="clario-glass-card max-w-sm w-full p-6 rounded-2xl shadow-2xl border border-border" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold mb-2 text-foreground">Delete Project?</h3>
            <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{projectToDelete.name}"</span>?<br/>This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2.5">
              <button 
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" 
                onClick={() => setProjectToDelete(null)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-xs" 
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Dialog ────────────────────────────────────────────── */}
      {projectToEdit && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in" 
          onClick={() => setProjectToEdit(null)}
        >
          <div 
            className="clario-glass-card max-w-sm w-full p-6 rounded-2xl shadow-2xl border border-border" 
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold mb-3 text-foreground">Rename Project</h3>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary mb-5"
              placeholder="Project Name"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && confirmEdit()}
            />
            <div className="flex justify-end gap-2.5">
              <button 
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground" 
                onClick={() => setProjectToEdit(null)}
              >
                Cancel
              </button>
              <button 
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs" 
                onClick={confirmEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
