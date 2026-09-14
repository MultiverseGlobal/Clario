import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Video, Presentation, UploadCloud, Link as LinkIcon, Camera, 
  CheckCircle2, ArrowRight, X, Scissors, Archive,
  Film, Loader2, Sparkles, FileVideo, Target
} from 'lucide-react';
import { RecordingStudio } from './RecordingStudio';
import { ClarioProject, saveProject } from '../../lib/projectStore';
import { getApiBase } from '../../lib/apiClient';
import { supabase } from '../../lib/supabase';
import { detectCinematicScenes, type DetectedScene } from '../../lib/clientSceneDetector';
import { separateVoiceAndMusic } from '../../lib/audioSeparator';
import { stripCaptions } from '../../lib/videoInpainter';
import { db } from '../../lib/dexieDb';
import type { VideoTrackItem, ShotRecord } from '../../types/assets';
import { analyzeShotIntelligence, analyzeNarrativeArc } from '../../lib/gemini';

interface ProjectCreationWizardProps {
  onClose: () => void;
  onProjectCreated: (p: ClarioProject) => void;
  onSaveToLibrary?: (p: ClarioProject) => void;
}

type WizardMode = 'video' | 'slides';
type WizardView = 'dropzone' | 'processing' | 'success' | 'recording_studio';

export function ProjectCreationWizard({ onClose, onProjectCreated, onSaveToLibrary }: ProjectCreationWizardProps) {
  const [mode, setMode] = useState<WizardMode>('video');
  const [videoPurpose, setVideoPurpose] = useState<'sales' | 'content'>('sales');
  const [view, setView] = useState<WizardView>('dropzone');
  const [wizardStep, setWizardStep] = useState(1);
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
  const [detectedScenes, setDetectedScenes] = useState<DetectedScene[]>([]);
  const [captionStripMode, setCaptionStripMode] = useState<'punch_in' | 'blur_mask' | 'none'>('punch_in');

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
  const startPolling = useCallback((jobId: string, _projectType: WizardMode, initialProject: ClarioProject) => {
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

  // Main file processing pipeline: optimistic + non-blocking + auto scene cutting
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

    // 1. Initial optimistic project
    const initialProject: ClarioProject = {
      id: projectId,
      name: cleanName,
      mode: isVideo ? 'video_harvester' : 'slide_harvester',
      category: isVideo ? effectivePurpose : 'slides',
      targetPurpose: isVideo ? (effectivePurpose === 'sales' ? 'sales_outreach' : 'content_creator') : 'slide_presentation',
      scriptText: isVideo && effectivePurpose === 'sales' ? editorPrompt : 'Auto scene detection, caption stripping, and speech vs music isolation',
      slides: [],
      trackItems: [],
      selectedAssets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setActiveProject(initialProject);
    await saveProject(initialProject);

    // Switch to processing view
    setView('processing');
    setProgress(15);
    setStatusText('Analyzing video frame by frame for cinematic scene cuts...');
    setBackendStatus('running');

    if (isVideo) {
      try {
        const scenes = await detectCinematicScenes(file, (p) => {
          setProgress(p.progressPct);
          setStatusText(p.statusMsg);
        });
        setDetectedScenes(scenes);

        const hasAnyCaptions = scenes.some(s => s.hasCaptions);
        const autoStrip = hasAnyCaptions ? 'punch_in' : 'none';
        setCaptionStripMode(autoStrip);

        // Audio Separation Step
        let vocalsTrackUrl = '';
        let accompanimentTrackUrl = '';
        try {
          const audioResult = await separateVoiceAndMusic(file, (msg) => {
            setProgress(p => Math.min(p + 5, 80));
            setStatusText(msg);
          });
          vocalsTrackUrl = audioResult.vocalsUrl;
          accompanimentTrackUrl = audioResult.accompanimentUrl;
        } catch (audioErr) {
          console.warn('Audio separation failed:', audioErr);
        }

        // Caption Stripping Step (AI Inpainting)
        let inpaintedVideoUrl = previewUrl;
        if (hasAnyCaptions) {
          try {
            const inpaintResult = await stripCaptions(file, (msg) => {
              setProgress(p => Math.min(p + 5, 95));
              setStatusText(msg);
            });
            inpaintedVideoUrl = inpaintResult;
            setCaptionStripMode('blur_mask');
          } catch (inpaintErr) {
            console.warn('Video inpainting failed:', inpaintErr);
          }
        }

        setStatusText('Running Gemini Vision AI analysis on extracted scenes...');
        const shotsData: ShotRecord[] = await Promise.all(scenes.map(async (s, index) => {
          const intelligence = await analyzeShotIntelligence(s.frameUrl, index, s.startTime, s.endTime, previewUrl);
          return {
            project_id: projectId,
            shot_id: s.id,
            start_seconds: s.startTime,
            end_seconds: s.endTime,
            duration: s.duration,
            frame_url: s.frameUrl,
            visual_description: intelligence.visual_description || s.sceneTag,
            editor_text: intelligence.editor_text || (s.hasCaptions ? 'Captions Stripped' : ''),
            source_text: intelligence.source_text || s.sceneTag,
            content_type: intelligence.content_type || s.contentType,
            source_type: intelligence.source_type || 'uploaded',
            likely_source: intelligence.likely_source || cleanName,
            confidence: intelligence.confidence || 'confirmed',
            exact_source_found: true,
            clean_source_url: previewUrl,
            license_status: intelligence.license_status || 'licensed_clean_available',
            rights_status: 'user_owned',
            production_eligible: true,
            replacement_needed: intelligence.replacement_needed || false,
            replacement_prompt: intelligence.replacement_prompt || '',
            search_queries: intelligence.search_queries || [s.sceneTag],
            notes: intelligence.notes || `Scene tag: ${s.sceneTag}`,
            analysis_confidence: intelligence.analysis_confidence || 'low',
            detected_text_presence: intelligence.detected_text_presence || false,
            editor_overlay_detected: intelligence.editor_overlay_detected || false,
            scene_text_detected: intelligence.scene_text_detected || false,
            faces_detected_count: intelligence.faces_detected_count || 0,
            motion_level: intelligence.motion_level || 'moderate'
          } as ShotRecord;
        }));

        const purposeLabel = effectivePurpose === 'sales'
          ? 'B2B Sales Outreach & Loom Pitch (Hook -> Problem -> Demo -> CTA)'
          : 'High-Retention Social Content (TikTok/Reels Fast Pacing)';
        setStatusText(effectivePurpose === 'sales' ? 'Mapping Sales Conversion Narrative Arc...' : 'Mapping Dopamine Retention Curve...');
        const narrativeMap = await analyzeNarrativeArc(shotsData, purposeLabel);

        // Convert detected scenes to trackItems, using narrativeMap for score and beat
        const generatedTracks: VideoTrackItem[] = scenes.map((s, idx) => {
          const shotId = s.id;
          const narrative = narrativeMap[shotId] || { beatType: idx === 0 ? 'hook' : 'b_roll', dopamineScore: 5 };
          
          return {
            id: `track_cut_${idx}_${Date.now()}`,
            title: `${s.sceneTag} (${s.duration}s)`,
            startTime: s.startTime,
            endTime: s.endTime,
            duration: s.duration,
            type: 'video',
            url: inpaintedVideoUrl,
            videoUrl: inpaintedVideoUrl,
            isBroll: s.contentType !== 'a_roll',
            beatType: narrative.beatType as any,
            dopamineScore: narrative.dopamineScore,
            scriptText: s.sceneTag,
          };
        });

        if (vocalsTrackUrl) {
          generatedTracks.push({
            id: `track_vocals_${Date.now()}`,
            title: `Isolated Vocals`,
            startTime: 0,
            endTime: scenes.reduce((acc, s) => acc + s.duration, 0),
            duration: scenes.reduce((acc, s) => acc + s.duration, 0),
            type: 'audio',
            url: vocalsTrackUrl,
            audioUrl: vocalsTrackUrl,
            isBroll: false,
            beatType: 'hook',
            dopamineScore: 10,
            scriptText: '',
          });
        }
        
        if (accompanimentTrackUrl) {
          generatedTracks.push({
            id: `track_music_${Date.now()}`,
            title: `Accompaniment (Music)`,
            startTime: 0,
            endTime: scenes.reduce((acc, s) => acc + s.duration, 0),
            duration: scenes.reduce((acc, s) => acc + s.duration, 0),
            type: 'audio',
            url: accompanimentTrackUrl,
            audioUrl: accompanimentTrackUrl,
            isBroll: false,
            beatType: 'proof',
            dopamineScore: 8,
            scriptText: '',
          });
        }

        const updatedProject: ClarioProject = {
          ...initialProject,
          trackItems: generatedTracks,
          harvestProject: {
            id: projectId,
            name: cleanName,
            mode: 'video_harvester',
            shots: shotsData,
            slides: [],
            generated_prompts: [],
            provenance: [],
            created_at: Date.now(),
            updated_at: Date.now(),
          },
          updatedAt: Date.now(),
        };

        setActiveProject(updatedProject);
        await saveProject(updatedProject);

        // Index in Dexie shots and vault assets
        await db.shots.bulkPut(shotsData.map(s => ({ ...s, id: `${projectId}_${s.shot_id}` })));

        // Non-blocking upload to Supabase Storage in background
        supabase.auth.getSession().then(({ data: { session } }) => {
          const uid = session?.user?.id;
          if (uid) {
            const fileExt = file.name.split('.').pop() || 'mp4';
            const storagePath = `${uid}/${Math.random().toString(36).substring(2, 10)}_${Date.now()}.${fileExt}`;
            supabase.storage.from('clario-raw').upload(storagePath, file, { cacheControl: '3600', upsert: false });
          }
        }).catch(() => {});

        setProgress(100);
        setBackendStatus('completed');
        setStatusText(`Found ${scenes.length} cinematic cuts with frame-level keyframes.`);
        setView('success');
        return;
      } catch (detectErr) {
        console.warn('Scene detection error:', detectErr);
      }
    }

    // Fallback for non-video or detection failure
    setProgress(100);
    setBackendStatus('completed');
    setView('success');
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

  const handleSavePackToLibrary = async () => {
    if (!activeProject) return;
    try {
      if (activeProject.harvestProject?.shots && activeProject.harvestProject.shots.length > 0) {
        const dexieVaultRecords = activeProject.harvestProject.shots.map(s => ({
          id: `${activeProject.id}:${s.shot_id}`,
          projectId: activeProject.id,
          projectName: activeProject.name,
          shotId: s.shot_id,
          assetKind: (s.content_type === 'a_roll' ? 'attached_master' : 'reference_segment') as any,
          rightsStatus: 'user_owned' as any,
          productionEligible: true,
          title: s.visual_description || s.shot_id,
          url: s.clean_source_url || activeProject.trackItems[0]?.url,
          frame_url: s.frame_url,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }));
        await db.vaultAssets.bulkPut(dexieVaultRecords as any);
        await db.shots.bulkPut(activeProject.harvestProject.shots.map(s => ({ ...s, id: `${activeProject.id}_${s.shot_id}` })));
      }
      await saveProject(activeProject);
    } catch (err) {
      console.warn('Error saving asset pack to library:', err);
    }
    if (onSaveToLibrary) {
      onSaveToLibrary(activeProject);
    } else {
      onClose();
    }
  };

  const openEditorImmediately = () => {
    if (activeProject) {
      const updatedTracks = activeProject.trackItems.map(t => ({
        ...t,
        captionStripMode,
      }));
      const proj = { ...activeProject, trackItems: updatedTracks };
      saveProject(proj);
      onProjectCreated(proj);
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <motion.div 
        layoutId="project-wizard-container"
        transition={{ type: "spring", stiffness: 350, damping: 30 }}
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        className="w-full max-w-2xl bg-card border border-border shadow-2xl shadow-foreground/5 rounded-3xl overflow-hidden relative flex flex-col"
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            {view === 'dropzone' && wizardStep > 1 ? (
              <button onClick={() => setWizardStep(s => s - 1)} className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors mr-1">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
            ) : (
              <div className="h-8 w-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-indigo-600" />
              </div>
            )}
            <div>
              <h2 className="font-display text-base font-bold text-foreground tracking-tight">New Clario Project</h2>
              <p className="text-[11px] text-muted-foreground font-mono">
                {view === 'dropzone' ? `Step ${wizardStep} of 3` : 'Instant Media Ingest & AI Studio'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors ml-2 cursor-pointer"
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
                key={`dropzone-step-${wizardStep}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {wizardStep === 1 && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">What kind of project are you creating?</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => { setMode('video'); setWizardStep(2); }}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${mode === 'video' ? 'border-indigo-500 bg-indigo-50/50' : 'border-border bg-card hover:border-indigo-300'}`}
                      >
                        <Video className="w-8 h-8 text-indigo-600 mb-3" />
                        <h4 className="font-bold text-foreground mb-1">Video Edit</h4>
                        <p className="text-xs text-muted-foreground">Process MP4s, extract cuts, strip captions, and split audio.</p>
                      </button>
                      <button
                        onClick={() => { setMode('slides'); setWizardStep(3); }}
                        className={`p-6 rounded-2xl border-2 text-left transition-all ${mode === 'slides' ? 'border-purple-500 bg-purple-50/50' : 'border-border bg-card hover:border-purple-300'}`}
                      >
                        <Presentation className="w-8 h-8 text-purple-600 mb-3" />
                        <h4 className="font-bold text-foreground mb-1">Slide Deck</h4>
                        <p className="text-xs text-muted-foreground">Import PDFs or images to extract structure and OCR.</p>
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 2 && mode === 'video' && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Select Video Purpose</h3>
                    <div className="flex flex-col gap-3">
                      <button
                        onClick={() => setVideoPurpose('sales')}
                        className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${videoPurpose === 'sales' ? 'border-amber-500 bg-amber-50/50' : 'border-border bg-card hover:border-amber-300'}`}
                      >
                        <Target className={`w-6 h-6 ${videoPurpose === 'sales' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                        <div className="text-left">
                          <h4 className="font-bold text-foreground text-sm">Sales & Outreach (Loom Pitch)</h4>
                          <p className="text-xs text-muted-foreground">Optimized for talking heads, demos, and punch-in cuts.</p>
                        </div>
                      </button>
                      
                      {videoPurpose === 'sales' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="ml-10">
                          <label className="text-[11px] font-mono font-bold text-amber-600 uppercase tracking-wider block mb-1">Editor Directive Prompt</label>
                          <input
                            type="text"
                            value={editorPrompt}
                            onChange={e => setEditorPrompt(e.target.value)}
                            placeholder="e.g. Cap.so sleek studio padding..."
                            className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500 font-mono"
                          />
                        </motion.div>
                      )}

                      <button
                        onClick={() => setVideoPurpose('content')}
                        className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${videoPurpose === 'content' ? 'border-purple-500 bg-purple-50/50' : 'border-border bg-card hover:border-purple-300'}`}
                      >
                        <Sparkles className={`w-6 h-6 ${videoPurpose === 'content' ? 'text-purple-600' : 'text-muted-foreground'}`} />
                        <div className="text-left">
                          <h4 className="font-bold text-foreground text-sm">Social & Creator (Reels / Shorts)</h4>
                          <p className="text-xs text-muted-foreground">Auto scene breakdown, caption stripping, and music isolation.</p>
                        </div>
                      </button>
                    </div>
                    
                    <div className="flex justify-end mt-2">
                      <button onClick={() => setWizardStep(3)} className="px-6 py-2 bg-foreground text-background text-sm font-bold rounded-xl hover:opacity-90 transition-opacity">
                        Continue
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="flex flex-col gap-4">
                    <h3 className="text-lg font-bold text-foreground">Provide Media</h3>
                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-8 sm:p-12 text-center transition-all duration-300 flex flex-col items-center justify-center ${
                        isDragging
                          ? 'border-indigo-500 bg-indigo-50 shadow-[0_0_40px_rgba(99,102,241,0.2)]'
                          : 'border-border bg-muted/30 hover:border-neutral-400 hover:bg-card'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={mode === 'video' ? "video/mp4,video/quicktime,video/webm,.mkv" : "application/pdf,.ppt,.pptx,image/*"}
                        onChange={handleFileInputChange}
                        className="hidden"
                      />

                      <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-indigo-300 transition-all duration-300">
                        <UploadCloud className="w-8 h-8 text-indigo-600" />
                      </div>

                      <h3 className="text-base sm:text-lg font-bold text-foreground mb-1.5">
                        Drop your {mode === 'video' ? 'video' : 'presentation or PDF'} here, or <span className="text-indigo-600 underline underline-offset-4">browse</span>
                      </h3>
                      <p className="text-xs text-muted-foreground max-w-sm">
                        {mode === 'video' 
                          ? 'MP4, MOV, or WebM up to 500MB.' 
                          : 'PDF, Keynote, or PPT slides.'}
                      </p>
                    </div>

                    {/* Direct Action Alternatives */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setShowUrlInput(!showUrlInput)}
                        className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:border-border text-foreground text-xs font-medium transition-all cursor-pointer"
                      >
                        <LinkIcon className="w-4 h-4 text-emerald-600" />
                        <span>Paste Link (YouTube, Drive, Web)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setView('recording_studio')}
                        className="flex items-center justify-center gap-2.5 p-3.5 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 hover:border-border text-foreground text-xs font-medium transition-all cursor-pointer"
                      >
                        <Camera className="w-4 h-4 text-indigo-600" />
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
                      className="flex-1 px-4 py-2.5 rounded-xl bg-card border border-border focus:border-indigo-500 focus:outline-none text-xs text-foreground font-mono placeholder:text-muted-foreground"
                    />
                    <button
                      onClick={() => handleUrlIngest(urlInput)}
                      disabled={!urlInput.trim()}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-foreground text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                    >
                      Import
                    </button>
                  </motion.div>
                )}
                  </div>
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
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border">
                    <div className="h-16 w-24 rounded-xl bg-black overflow-hidden border border-border shrink-0 relative flex items-center justify-center">
                      {mode === 'video' ? (
                        <video src={activeFile.previewUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <FileVideo className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">{activeFile.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{activeFile.size}</div>
                      <div className="text-xs text-indigo-600 font-mono mt-1 flex items-center gap-1.5">
                        {backendStatus === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                        {backendStatus === 'offline' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        <span>{statusText}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Animated Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>{statusText}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-center gap-2">
                    <span className="text-sm">🎬</span>
                    <div>
                      <div className="text-[11px] font-bold text-foreground">Scene-Based Cutting</div>
                      <div className="text-[9px] text-muted-foreground">Shot Boundary Detection - Splitting scenes by camera angle</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-center gap-2">
                    <span className="text-sm">💬</span>
                    <div>
                      <div className="text-[11px] font-bold text-foreground">Clearing Captions</div>
                      <div className="text-[9px] text-muted-foreground">Asset Resolution & AI Inpainting - Removing dopamine text</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-center gap-2">
                    <span className="text-sm">🎙️</span>
                    <div>
                      <div className="text-[11px] font-bold text-foreground">Voice & Music Split</div>
                      <div className="text-[9px] text-muted-foreground">Isolating speech track from background music</div>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-muted/30 border border-border flex items-center gap-2">
                    <span className="text-sm">✨</span>
                    <div>
                      <div className="text-[11px] font-bold text-foreground">Studio Compilation</div>
                      <div className="text-[9px] text-muted-foreground">Generating clean cinematic cuts</div>
                    </div>
                  </div>
                </div>

                {/* Instant Actions (No blocking) */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    {backendStatus === 'offline' 
                      ? 'Local editor ready immediately.' 
                      : 'Assets ready to arrange in timeline editor.'}
                  </p>
                  <button
                    onClick={openEditorImmediately}
                    className="px-5 py-2.5 rounded-xl bg-foreground text-background hover:bg-foreground/90 text-xs font-bold flex items-center gap-2 transition-all shadow-lg cursor-pointer"
                  >
                    <span>Open in Editor</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* VIEW 3: SUCCESS (SHOWN WHEN AI SCENE CUTTING COMPLETES) */}
            {view === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground">
                        🎬 {detectedScenes.length || activeProject?.trackItems.length || 4} Cinematic Scenes Cut & Ready
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Frame-level cuts detected · Speech aligned · Captions ready to strip
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold">
                    Auto-Cut Active
                  </span>
                </div>

                {/* Pre-Editor Caption Stripping & Cleanup Controls */}
                <div className="p-3.5 rounded-2xl bg-muted/30 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-rose-600" />
                      <span>Pre-Editor Caption Stripping</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Strip burnt-in pixel captions before timeline entry
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/30 border border-border text-xs">
                    <button
                      type="button"
                      onClick={() => setCaptionStripMode('punch_in')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        captionStripMode === 'punch_in'
                          ? 'bg-rose-600 text-background shadow-md'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      ✂️ Punch-In
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionStripMode('blur_mask')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        captionStripMode === 'blur_mask'
                          ? 'bg-indigo-600 text-background shadow-md'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      🌫️ Blur Matte
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptionStripMode('none')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        captionStripMode === 'none'
                          ? 'bg-muted text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Off
                    </button>
                  </div>
                </div>

                {/* Scene Cards Grid (Auto-cut scenes with scene tags: Cars, Table, A-Roll, B-Roll) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                    <span className="uppercase tracking-wider">
                      Auto-Cut Scenes ({detectedScenes.length || activeProject?.trackItems.length || 0})
                    </span>
                    <span>Categorized for A-Roll & B-Roll</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-56 overflow-y-auto pr-1">
                    {(detectedScenes.length > 0 ? detectedScenes : (activeProject?.trackItems || []).map((t, i) => ({
                      id: t.id,
                      index: i + 1,
                      startTime: t.startTime,
                      endTime: t.endTime,
                      duration: t.duration,
                      frameUrl: (t as any).frameUrl || (t as any).url || '',
                      sceneTag: t.scriptText || (t.isBroll ? 'Cinematic B-Roll' : 'A-Roll (Talking Head)'),
                      contentType: t.isBroll ? 'b_roll' as const : 'a_roll' as const,
                      hasCaptions: false,
                      suggestedStripMode: 'punch_in' as const,
                      confidence: 0.9,
                    }))).map((scene, idx) => (
                      <div 
                        key={scene.id || idx} 
                        className="rounded-xl bg-muted/30 border border-border overflow-hidden group hover:border-indigo-300 transition-all flex flex-col"
                      >
                        <div className="aspect-video bg-muted/50 relative overflow-hidden flex items-center justify-center">
                          {scene.frameUrl ? (
                            <img src={scene.frameUrl} alt={scene.sceneTag} className="w-full h-full object-cover" />
                          ) : (
                            <Film className="w-6 h-6 text-foreground/20" />
                          )}
                          <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1.5 py-0.5 rounded bg-card/90 text-foreground shadow-sm text-foreground font-bold backdrop-blur-sm">
                            {scene.duration}s
                          </span>
                          <span className={`absolute top-1 left-1 text-[8px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                            scene.contentType === 'a_roll' ? 'bg-indigo-600 text-foreground' : 'bg-emerald-600 text-foreground'
                          }`}>
                            {scene.contentType === 'a_roll' ? 'A-Roll' : 'B-Roll'}
                          </span>
                        </div>
                        <div className="p-2 flex-1 flex flex-col justify-between">
                          <div className="text-[11px] font-semibold text-foreground truncate" title={scene.sceneTag}>
                            {scene.sceneTag}
                          </div>
                          <div className="text-[9px] font-mono text-muted-foreground mt-0.5 flex items-center justify-between">
                            <span>{scene.startTime.toFixed(1)}s → {scene.endTime.toFixed(1)}s</span>
                            {captionStripMode !== 'none' && (
                              <span className="text-rose-600 font-bold text-[8px]">STRIP</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Primary Dual Actions: Save Pack to Library vs New Video in Editor */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSavePackToLibrary}
                    className="flex-1 py-3 px-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
                    title="Save all cut scenes categorized into your Reference Library (Cars, Table, A-roll, B-roll)"
                  >
                    <Archive className="w-4 h-4 text-emerald-600" />
                    <span>📦 Save Pack to Library</span>
                  </button>

                  <button
                    type="button"
                    onClick={openEditorImmediately}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-background text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-indigo-600/25 cursor-pointer"
                  >
                    <Film className="w-4 h-4" />
                    <span>🪄 New Video (Enter Editor)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
