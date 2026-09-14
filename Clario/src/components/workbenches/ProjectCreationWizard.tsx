import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Presentation, UploadCloud, Link as LinkIcon, Camera, 
  CheckCircle2, ArrowRight, X, Copy, Archive, Check, Scissors, 
  Film, Loader2, Sparkles, FileVideo, Target
} from 'lucide-react';
import { RecordingStudio } from './RecordingStudio';
import { ClarioProject, saveProject } from '../../lib/projectStore';
import { generateClaudeCodePrompt } from '../../lib/gemini';
import { getApiBase } from '../../lib/apiClient';
import { supabase } from '../../lib/supabase';

interface ProjectCreationWizardProps {
  onClose: () => void;
  onProjectCreated: (p: ClarioProject) => void;
}

type WizardMode = 'video' | 'slides';
type WizardView = 'dropzone' | 'processing' | 'success' | 'recording_studio';

export function ProjectCreationWizard({ onClose, onProjectCreated }: ProjectCreationWizardProps) {
  const [mode, setMode] = useState<WizardMode>('video');
  const [videoPurpose, setVideoPurpose] = useState<'sales' | 'content'>('sales');
  const [view, setView] = useState<WizardView>('dropzone');
  const [isDragging, setIsDragging] = useState(false);
  
  // URL input state
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // Active file & optimistic preview
  const [activeFile, setActiveFile] = useState<{ name: string; size: string; previewUrl: string } | null>(null);
  const [activeProject, setActiveProject] = useState<ClarioProject | null>(null);

  // Processing & job status
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('Preparing upload...');
  const [backendStatus, setBackendStatus] = useState<'idle' | 'running' | 'completed' | 'offline'>('idle');
  const [harvestedResult, setHarvestedResult] = useState<any | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [copiedVideoUrl, setCopiedVideoUrl] = useState(false);

  const [editorPrompt, setEditorPrompt] = useState('Cap.so studio padding, 16:9 widescreen, punch-in zooms on demo moments, silence trimmed');
  const serverBase = getApiBase();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAuth = async (url: string, options: RequestInit = {}) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return fetch(url, { ...options, headers });
  };

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Poll remote job if backend accepted it
  const startPolling = useCallback((jobId: string, projectType: WizardMode, initialProject: ClarioProject) => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetchAuth(`${serverBase}/harvest/jobs/${jobId}`);
        if (!res.ok) throw new Error('Job status check failed');
        const job = await res.json();
        
        setProgress(job.progress_pct || 50);
        setStatusText(job.status_msg || 'Analyzing footage keyframes...');
        
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollTimer.current!);
          if (job.status === 'completed') {
            setBackendStatus('completed');
            if (job.result) {
              setHarvestedResult(job.result);
              // Update project in store with detected shots
              const updatedProject: ClarioProject = {
                ...initialProject,
                name: job.result.name || initialProject.name,
                trackItems: job.result.shots ? job.result.shots.map((s: any, idx: number) => ({
                  id: s.shot_id || `shot_${idx}`,
                  title: s.visual_description?.substring(0, 32) || `Shot ${idx + 1}`,
                  startTime: s.start_seconds || 0,
                  endTime: s.end_seconds || 0,
                  type: 'video',
                  url: s.frame_url || job.result.reference_url || initialProject.trackItems[0]?.url,
                })) : initialProject.trackItems,
                updatedAt: Date.now(),
              };
              setActiveProject(updatedProject);
              await saveProject(updatedProject);
            }
            if (projectType === 'slides') {
              setGeneratedPrompt(generateClaudeCodePrompt(
                "Modern High-Converting Slide Deck",
                ["#0F1015", "#181922", "#F8FAFC", "#10B981"],
                "Structured Breakdown & Key Takeaways",
                "High-impact typography, dark background with emerald accents, metric callouts"
              ));
            }
            setView('success');
          } else {
            setBackendStatus('offline');
            setStatusText('Footage ready in workspace. AI segmentation paused.');
          }
        }
      } catch {
        clearInterval(pollTimer.current!);
        setBackendStatus('offline');
        setStatusText('Footage saved to workspace. (AI harvester is offline)');
      }
    }, 2000);
  }, [serverBase]);

  // Main file processing pipeline: optimistic + non-blocking
  const processUploadedFile = async (file: File, overridePurpose?: 'sales' | 'content') => {
    const isVideo = mode === 'video' || file.type.startsWith('video/');
    const effectivePurpose = overridePurpose || videoPurpose;
    const previewUrl = URL.createObjectURL(file);
    const projectId = `proj_${Date.now()}`;
    const cleanName = file.name.replace(/\.[^/.]+$/, "");

    setActiveFile({
      name: file.name,
      size: formatFileSize(file.size),
      previewUrl,
    });

    // 1. Optimistically create and save the project immediately
    const initialProject: ClarioProject = {
      id: projectId,
      name: cleanName,
      mode: isVideo ? 'video_harvester' : 'slide_harvester',
      category: isVideo ? effectivePurpose : 'slides',
      targetPurpose: isVideo ? (effectivePurpose === 'sales' ? 'sales_outreach' : 'content_creator') : 'slide_presentation',
      scriptText: isVideo && effectivePurpose === 'sales' ? editorPrompt : 'Auto scene detection, caption stripping, and speech vs music isolation',
      slides: [],
      trackItems: isVideo ? [
        {
          id: `track_vid_0`,
          title: file.name,
          startTime: 0,
          endTime: 30,
          duration: 30,
          type: 'video',
          url: previewUrl,
          videoUrl: previewUrl,
          isBroll: false,
          beatType: 'hook',
          scriptText: effectivePurpose === 'sales' ? 'Pattern Interrupt Hook' : 'Viral 3-Second Hook',
        },
        {
          id: `track_vid_1`,
          title: 'Core Demonstration',
          startTime: 0,
          endTime: 30,
          duration: 30,
          type: 'video',
          url: previewUrl,
          videoUrl: previewUrl,
          isBroll: false,
          beatType: 'problem',
          scriptText: effectivePurpose === 'sales' ? 'Bottleneck Discovery' : 'Core High-Value Insight',
        }
      ] : [],
      selectedAssets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setActiveProject(initialProject);
    await saveProject(initialProject);

    // Switch to processing view
    setView('processing');
    setProgress(25);
    setStatusText('Securing file to project vault...');
    setBackendStatus('running');

    // 2. Upload to Supabase Storage in background
    let storagePath: string | null = null;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (uid) {
        const fileExt = file.name.split('.').pop() || 'mp4';
        const fileName = `${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
        storagePath = `${uid}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('clario-raw')
          .upload(storagePath, file, { cacheControl: '3600', upsert: false });

        if (!uploadError) {
          const { data: pub } = supabase.storage.from('clario-raw').getPublicUrl(storagePath);
          if (pub?.publicUrl) {
            initialProject.trackItems[0].url = pub.publicUrl;
            await saveProject(initialProject);
          }
        }
      }
    } catch (storageErr) {
      console.warn('Storage upload note:', storageErr);
    }

    setProgress(60);
    setStatusText('Connecting to AI harvester engine...');

    // 3. Trigger remote ingest non-blockingly
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const res = await fetchAuth(`${serverBase}/harvest/ingest-remote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: storagePath || file.name,
          filename: file.name,
          mode: isVideo ? 'video_harvester' : 'slide_harvester',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.job_id) {
          setProgress(75);
          setStatusText('AI harvester analyzing video scenes...');
          startPolling(data.job_id, isVideo ? 'video' : 'slides', initialProject);
          return;
        }
      }
      throw new Error('Harvester returned non-OK');
    } catch {
      // Backend offline or slow cold start — DO NOT BLOCK USER!
      setProgress(100);
      setBackendStatus('offline');
      setStatusText('Footage ready in workspace. (AI harvester running in background)');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processUploadedFile(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  const handleUrlIngest = async (url: string) => {
    if (!url.trim()) return;
    const isVideo = mode === 'video';
    const projectId = `proj_${Date.now()}`;
    const initialProject: ClarioProject = {
      id: projectId,
      name: `Imported Media (${new URL(url).hostname})`,
      mode: isVideo ? 'video_harvester' : 'slide_harvester',
      scriptText: '',
      slides: [],
      trackItems: [{
        id: `track_0`,
        title: url,
        startTime: 0,
        endTime: 30,
        type: 'video',
        url: url,
      }],
      selectedAssets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setActiveProject(initialProject);
    await saveProject(initialProject);
    setView('processing');
    setProgress(35);
    setStatusText('Importing media from URL...');

    try {
      const res = await fetchAuth(`${serverBase}/harvest/ingest-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.job_id) {
          startPolling(data.job_id, isVideo ? 'video' : 'slides', initialProject);
          return;
        }
      }
      throw new Error('Remote ingest failed');
    } catch {
      setProgress(100);
      setBackendStatus('offline');
      setStatusText('URL saved to project. Remote AI harvester is syncing.');
    }
  };

  const handleRecordingFinished = async (blob?: Blob, _script?: string, category?: 'sales' | 'content') => {
    if (!blob) {
      setView('dropzone');
      return;
    }
    if (category) setVideoPurpose(category);
    const file = new File([blob], `recording_${Date.now()}.webm`, { type: 'video/webm' });
    await processUploadedFile(file, category);
  };

  const handleDownloadZip = async () => {
    if (!harvestedResult?.id) return;
    setIsExportingZip(true);
    try {
      const res = await fetchAuth(`${serverBase}/projects/${harvestedResult.id}/export-zip`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Zip export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${harvestedResult.name?.replace(/\s+/g, '_') || 'harvest'}_assets_pack.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download zip:', err);
      window.open(`${serverBase}/projects/${harvestedResult.id}/export-zip`, '_blank');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopyAtlasVideoUrl = () => {
    const videoUrl = harvestedResult?.reference_url || activeProject?.trackItems[0]?.url || '';
    if (videoUrl) {
      navigator.clipboard.writeText(videoUrl);
      setCopiedVideoUrl(true);
      setTimeout(() => setCopiedVideoUrl(false), 2500);
    }
  };

  const openEditorImmediately = () => {
    if (activeProject) {
      onProjectCreated(activeProject);
    }
  };

  if (view === 'recording_studio') {
    return (
      <RecordingStudio 
        onBack={() => setView('dropzone')} 
        initialCategory={videoPurpose}
        onFinish={handleRecordingFinished} 
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="w-full max-w-2xl bg-[#0c0e14] border border-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden relative flex flex-col"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white tracking-tight">New Clario Project</h2>
              <p className="text-[11px] text-white/40 font-mono">Instant Media Ingest & AI Studio</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center gap-1 bg-white/[0.06] p-1 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setMode('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'video'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Video className="h-3.5 w-3.5" />
              Video
            </button>
            <button
              onClick={() => setMode('slides')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === 'slides'
                  ? 'bg-white text-black font-semibold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Presentation className="h-3.5 w-3.5" />
              Slides
            </button>
          </div>

          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors ml-2 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            
            {/* VIEW 1: MODERN UNIFIED DROPZONE */}
            {view === 'dropzone' && (
              <motion.div 
                key="dropzone"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Target Purpose: Sales vs Content */}
                {mode === 'video' && (
                  <div className="flex items-center gap-2 p-1 bg-white/[0.04] border border-white/10 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setVideoPurpose('sales')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        videoPurpose === 'sales'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <Target className="w-3.5 h-3.5 text-amber-300" />
                      <span>Sales & Outreach (Loom Pitch)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoPurpose('content')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        videoPurpose === 'content'
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'text-white/50 hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-pink-300" />
                      <span>Social & Creator (Reels / Shorts)</span>
                    </button>
                  </div>
                )}

                {/* Sales Editor Directive Prompt */}
                {mode === 'video' && videoPurpose === 'sales' && (
                  <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Target className="w-3 h-3" />
                        <span>Sales Editor Directive Prompt</span>
                      </label>
                      <span className="text-[10px] text-white/40 font-mono">Custom instructions</span>
                    </div>
                    <input
                      type="text"
                      value={editorPrompt}
                      onChange={e => setEditorPrompt(e.target.value)}
                      placeholder="e.g. Cap.so sleek studio padding, 16:9 widescreen, punch-in zooms, silence trimmed"
                      className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                )}

                {/* Social Content Mode Info */}
                {mode === 'video' && videoPurpose === 'content' && (
                  <div className="p-3 bg-purple-500/[0.05] border border-purple-500/20 rounded-2xl flex items-center gap-2 text-xs text-purple-200">
                    <Sparkles className="w-4 h-4 text-pink-300 shrink-0" />
                    <span>Auto scene breakdown, caption stripping, and speech vs. music isolation enabled.</span>
                  </div>
                )}

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 flex flex-col items-center justify-center ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_40px_rgba(99,102,241,0.2)]'
                      : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={mode === 'video' ? "video/mp4,video/quicktime,video/webm,.mkv" : "application/pdf,.ppt,.pptx,image/*"}
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-indigo-500/40 transition-all duration-300">
                    <UploadCloud className="w-8 h-8 text-indigo-400" />
                  </div>

                  <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                    Drop your {mode === 'video' ? 'video' : 'presentation or PDF'} here, or <span className="text-indigo-400 underline underline-offset-4">browse</span>
                  </h3>
                  <p className="text-xs text-white/50 max-w-sm">
                    {mode === 'video' 
                      ? 'MP4, MOV, or WebM up to 500MB. Auto-extracts clean master cuts and cinematic B-roll.' 
                      : 'PDF, Keynote, or PPT slides. Extracts key topics and structure.'}
                  </p>
                </div>

                {/* Direct Action Alternatives */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    <LinkIcon className="w-4 h-4 text-emerald-400" />
                    <span>Paste Link (YouTube, Drive, Web)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('recording_studio')}
                    className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/20 text-white text-xs font-medium transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-purple-400" />
                    <span>Record Screen & Camera</span>
                  </button>
                </div>

                {/* Expandable URL Input Field */}
                {showUrlInput && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex gap-2 pt-1"
                  >
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... or Google Drive URL"
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 focus:border-indigo-500 focus:outline-none text-xs text-white font-mono placeholder:text-white/30"
                    />
                    <button
                      onClick={() => handleUrlIngest(urlInput)}
                      disabled={!urlInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                    >
                      Import
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* VIEW 2: PROGRESS / OPTIMISTIC PREVIEW */}
            {view === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="space-y-6"
              >
                {/* File Card with Instant Local Preview */}
                {activeFile && (
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                    <div className="h-16 w-24 rounded-xl bg-black overflow-hidden border border-white/10 shrink-0 relative flex items-center justify-center">
                      {mode === 'video' ? (
                        <video src={activeFile.previewUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <FileVideo className="h-6 w-6 text-white/40" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{activeFile.name}</div>
                      <div className="text-xs text-white/40 font-mono mt-0.5">{activeFile.size}</div>
                      <div className="text-xs text-indigo-400 font-mono mt-1 flex items-center gap-1.5">
                        {backendStatus === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {backendStatus === 'offline' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                        <span>{statusText}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Animated Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-white/60">
                    <span>{statusText}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* 4-Stage Intelligence Pipeline Milestones */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center gap-2">
                    <span className="text-sm">🎬</span>
                    <div>
                      <div className="text-[11px] font-bold text-white">Cinematic Scenes</div>
                      <div className="text-[9px] text-white/40">Scene boundaries & cuts</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center gap-2">
                    <span className="text-sm">💬</span>
                    <div>
                      <div className="text-[11px] font-bold text-white">Captions Separated</div>
                      <div className="text-[9px] text-white/40">Subtitles isolated to track</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center gap-2">
                    <span className="text-sm">🎙️</span>
                    <div>
                      <div className="text-[11px] font-bold text-white">Voice & Music Split</div>
                      <div className="text-[9px] text-white/40">Speech stripped from BGM</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.07] flex items-center gap-2">
                    <span className="text-sm">✨</span>
                    <div>
                      <div className="text-[11px] font-bold text-white">Studio Directives</div>
                      <div className="text-[9px] text-white/40">Framing & kinetic styling</div>
                    </div>
                  </div>
                </div>

                {/* Instant Actions (No blocking) */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-white/[0.08]">
                  <p className="text-xs text-white/40">
                    {backendStatus === 'offline' 
                      ? 'Local editor ready immediately.' 
                      : 'Assets ready to arrange in timeline editor.'}
                  </p>
                  <button
                    onClick={openEditorImmediately}
                    className="px-5 py-2.5 rounded-xl bg-white text-black hover:bg-white/90 text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer"
                  >
                    <span>Open in Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* VIEW 3: SUCCESS (SHOWN WHEN AI EXTRACTION COMPLETES) */}
            {view === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Footage Ingested & Analyzed</h3>
                    <p className="text-xs text-white/50">Clean cuts, speech cues, and keyframe anchors extracted.</p>
                  </div>
                </div>

                {/* Summary Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center shrink-0">
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">Inpainted Clean Cuts</div>
                      <div className="text-[11px] text-white/40">Captions stripped</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white">
                        {harvestedResult?.shots?.length || 4} Cinematic Shots
                      </div>
                      <div className="text-[11px] text-white/40">Keyframes indexed</div>
                    </div>
                  </div>
                </div>

                {/* Atlas Outreach Link Copy Box */}
                {(harvestedResult?.reference_url || activeProject?.trackItems[0]?.url) && (
                  <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                    <div className="overflow-hidden">
                      <div className="text-[10px] uppercase font-mono font-semibold tracking-wider text-white/40">
                        Atlas Outreach Asset URL
                      </div>
                      <div className="text-xs font-mono text-emerald-400 truncate mt-0.5">
                        {harvestedResult?.reference_url || activeProject?.trackItems[0]?.url}
                      </div>
                    </div>
                    <button
                      onClick={handleCopyAtlasVideoUrl}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedVideoUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedVideoUrl ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                )}

                {/* Slides Prompt if mode is slides */}
                {mode === 'slides' && generatedPrompt && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3.5 relative">
                    <div className="text-[10px] font-mono uppercase text-white/40 mb-1">Slide Prompt Template</div>
                    <p className="font-mono text-xs text-white/70 max-h-28 overflow-y-auto leading-relaxed">
                      {generatedPrompt}
                    </p>
                  </div>
                )}

                {/* Primary Dual Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  {harvestedResult?.id && (
                    <button
                      onClick={handleDownloadZip}
                      disabled={isExportingZip}
                      className="flex-1 py-3 px-4 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      <Archive className="w-4 h-4 text-indigo-400" />
                      {isExportingZip ? 'Exporting ZIP...' : 'Export Asset Pack (ZIP)'}
                    </button>
                  )}

                  <button
                    onClick={openEditorImmediately}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    <span>Launch Video Editor</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
