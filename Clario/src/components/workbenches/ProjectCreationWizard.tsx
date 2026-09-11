import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Presentation, Target, Sparkles, UploadCloud, Link as LinkIcon, Camera, CheckCircle2, ArrowRight, X, Copy } from 'lucide-react';
import { RecordingStudio } from './RecordingStudio';
import { ClarioProject, saveProject } from '../../lib/projectStore';
import { generateClaudeCodePrompt } from '../../lib/gemini';
import { getApiBase } from '../../lib/apiClient';

interface ProjectCreationWizardProps {
  onClose: () => void;
  onProjectCreated: (p: ClarioProject) => void;
}

type Step = 
  | 'type' 
  | 'video_category' 
  | 'sales_source' 
  | 'content_source' 
  | 'slides_source' 
  | 'recording_studio'
  | 'processing_video'
  | 'processing_slides'
  | 'success_video'
  | 'success_slides';

export function ProjectCreationWizard({ onClose, onProjectCreated }: ProjectCreationWizardProps) {
  const [step, setStep] = useState<Step>('type');
  const [projectType, setProjectType] = useState<'video'|'slides'|null>(null);
  const [videoCategory, setVideoCategory] = useState<'sales'|'content'|null>(null);
  
  // Faux processing states
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [generatedPrompt, setGeneratedPrompt] = useState('');



  const serverBase = getApiBase();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, []);

  const startPolling = useCallback((jobId: string, type: 'video' | 'slides') => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    pollTimer.current = setInterval(async () => {
      try {
        const res = await fetch(`${serverBase}/harvest/jobs/${jobId}`);
        const job = await res.json();
        
        setProgress(job.progress_pct || 0);
        setStatusText(job.status_msg || 'Processing...');
        
        if (job.status === 'completed' || job.status === 'failed') {
          clearInterval(pollTimer.current!);
          if (job.status === 'completed') {
            if (type === 'slides') {
              setGeneratedPrompt(generateClaudeCodePrompt(
                "The 4 Step Framework for Viral Reach",
                ["#0F1015", "#181922", "#F8FAFC", "#10B981"],
                "Step-by-Step SOP / Tool Matrix",
                "Top category pill, bold hook headline, 4-item horizontal card container, bottom takeaway"
              ));
            }
            setStep(type === 'video' ? 'success_video' : 'success_slides');
          } else {
            setStatusText('Processing failed');
          }
        }
      } catch (err) {
        clearInterval(pollTimer.current!);
        setStatusText('Error fetching status');
      }
    }, 2000);
  }, [serverBase]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectType) return;

    setStep(projectType === 'video' ? 'processing_video' : 'processing_slides');
    setProgress(0);
    setStatusText('Uploading...');

    const form = new FormData();
    form.append('file', file);
    form.append('mode', projectType === 'video' ? 'video_harvester' : 'slide_harvester');

    try {
      const res = await fetch(`${serverBase}/harvest/ingest-file`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      startPolling(data.job_id, projectType);
    } catch (err) {
      setStatusText('Upload failed');
    }
  };

  const handleUrlIngest = async () => {
    if (!projectType) return;
    const url = window.prompt("Enter URL (YouTube, Drive, etc):");
    if (!url) return;

    setStep(projectType === 'video' ? 'processing_video' : 'processing_slides');
    setProgress(0);
    setStatusText('Queuing URL...');

    try {
      const res = await fetch(`${serverBase}/harvest/ingest-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      startPolling(data.job_id, projectType);
    } catch (err) {
      setStatusText('URL Ingest failed');
    }
  };

  const createAndRoute = async () => {
    const newId = `proj_${Date.now()}`;
    const newProject: ClarioProject = {
      id: newId,
      name: `New ${projectType === 'slides' ? 'Slide' : videoCategory === 'sales' ? 'Sales' : 'Content'} Project`,
      mode: 'video_harvester',
      scriptText: '',
      slides: [],
      trackItems: [],
      selectedAssets: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveProject(newProject);
    onProjectCreated(newProject);
  };

  const handleRecordingFinished = async (blob: Blob) => {
    if (!projectType) return;
    setStep('processing_video');
    setProgress(0);
    setStatusText('Uploading Recording...');

    const file = new File([blob], 'recording.webm', { type: 'video/webm' });
    const form = new FormData();
    form.append('file', file);
    form.append('mode', 'video_harvester');

    try {
      const res = await fetch(`${serverBase}/harvest/ingest-file`, {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      startPolling(data.job_id, 'video');
    } catch (err) {
      setStatusText('Upload failed');
    }
  };

  if (step === 'recording_studio') {
    return <RecordingStudio onBack={() => setStep('sales_source')} onFinish={handleRecordingFinished} />;
  }

  // Common wrapper for cards
  const Card = ({ icon: Icon, title, description, onClick }: any) => (
    <button 
      onClick={onClick}
      className="flex flex-col items-start p-6 rounded-2xl border border-border bg-surface-1 hover:bg-surface-2 hover:border-accent hover:shadow-[0_0_30px_rgba(var(--pds-accent-rgb),0.1)] transition-all text-left group"
    >
      <div className="w-12 h-12 rounded-xl bg-surface-3 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-foreground group-hover:text-accent" />
      </div>
      <h3 className="font-display text-xl font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-card border border-border shadow-2xl rounded-3xl overflow-hidden relative min-h-[400px] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/50">
          <h2 className="font-display text-xl font-bold">New Project</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-2 text-muted-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8 relative overflow-hidden flex flex-col justify-center">
          <AnimatePresence mode="wait">
            
            {step === 'type' && (
              <motion.div 
                key="type"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold mb-2">What are we building today?</h3>
                  <p className="text-muted-foreground">Select the primary asset type for this project.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    icon={Video} title="Video Project" 
                    description="Analyze footage, clean inpainted captions, and generate editorial sequences." 
                    onClick={() => { setProjectType('video'); setStep('video_category'); }}
                  />
                  <Card 
                    icon={Presentation} title="Slides & Static" 
                    description="Upload pitch decks or URLs to extract insights and generate LLM redesign prompts." 
                    onClick={() => { setProjectType('slides'); setStep('slides_source'); }}
                  />
                </div>
              </motion.div>
            )}

            {step === 'video_category' && (
              <motion.div 
                key="vcat"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold mb-2">Select Video Category</h3>
                  <p className="text-muted-foreground">Tailor the workflow to the type of video.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Card 
                    icon={Target} title="Sales / Outreach" 
                    description="Record a personalized pitch with the AI Teleprompter and Director cues." 
                    onClick={() => { setVideoCategory('sales'); setStep('sales_source'); }}
                  />
                  <Card 
                    icon={Sparkles} title="Content / Editorial" 
                    description="Ingest existing content, clean assets, and build a reference library." 
                    onClick={() => { setVideoCategory('content'); setStep('content_source'); }}
                  />
                </div>
                <button onClick={() => setStep('type')} className="text-sm text-muted-foreground hover:text-foreground mt-4">
                  ← Back
                </button>
              </motion.div>
            )}

            {(step === 'sales_source' || step === 'content_source' || step === 'slides_source') && (
              <motion.div 
                key="source"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center mb-4">
                  <h3 className="text-2xl font-bold mb-2">Provide Source Material</h3>
                  <p className="text-muted-foreground">Upload your files or paste a link to begin ingestion.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {step === 'sales_source' && (
                    <Card 
                      icon={Camera} title="Record Now" 
                      description="Use the AI Director Studio to record a perfectly paced pitch." 
                      onClick={() => setStep('recording_studio')}
                    />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={projectType === 'video' ? "video/*" : "application/pdf,image/*,.ppt,.pptx"}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <Card 
                    icon={UploadCloud} title="Upload File" 
                    description="Browse your computer for local files." 
                    onClick={() => fileInputRef.current?.click()}
                  />
                  {step !== 'sales_source' && (
                    <Card 
                      icon={LinkIcon} title="Paste URL" 
                      description="Import directly from a web link (YouTube, Drive, etc)." 
                      onClick={() => handleUrlIngest()}
                    />
                  )}
                </div>
                <button 
                  onClick={() => setStep(step === 'slides_source' ? 'type' : 'video_category')} 
                  className="text-sm text-muted-foreground hover:text-foreground mt-4 text-center"
                >
                  ← Back
                </button>
              </motion.div>
            )}

            {(step === 'processing_video' || step === 'processing_slides') && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center py-12"
              >
                <div className="relative w-24 h-24 mb-8">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="48" cy="48" r="45" fill="none" stroke="var(--pds-border-subtle)" strokeWidth="4" />
                    <circle 
                      cx="48" cy="48" r="45" fill="none" stroke="var(--pds-accent)" strokeWidth="4" 
                      strokeDasharray="283" strokeDashoffset={283 - (progress / 100) * 283}
                      className="transition-all duration-100 ease-linear"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-mono text-sm">
                    {progress}%
                  </div>
                </div>
                <h3 className="text-xl font-bold mb-2 animate-pulse">Processing Assets</h3>
                <p className="text-sm text-muted-foreground font-mono bg-surface-2 px-4 py-2 rounded-lg border border-border/50">
                  {statusText || "Initializing pipeline..."}
                </p>
              </motion.div>
            )}

            {step === 'success_video' && (
              <motion.div 
                key="s_vid"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center text-center py-8 gap-8"
              >
                <div className="w-16 h-16 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold mb-2">Video Ingestion Complete</h3>
                  <p className="text-muted-foreground max-w-sm mx-auto">
                    Captions have been removed and clean master assets are now available in your Vault.
                  </p>
                </div>
                <div className="flex gap-4 mt-4 w-full">
                  <button onClick={onClose} className="flex-1 pds-btn-ghost py-3">
                    Save to Library
                  </button>
                  <button onClick={createAndRoute} className="flex-1 pds-btn-primary py-3">
                    Continue & Analyze
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'success_slides' && (
              <motion.div 
                key="s_slide"
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-start text-left py-4 gap-6 w-full"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Slide Analysis Complete</h3>
                    <p className="text-muted-foreground text-sm">Use this prompt in ChatGPT or Claude to recreate your slides.</p>
                  </div>
                </div>

                <div className="w-full bg-surface-2 border border-border rounded-xl p-4 relative group">
                  <button 
                    className="absolute top-2 right-2 p-2 rounded-md hover:bg-surface-3 text-muted-foreground transition-colors"
                    onClick={() => navigator.clipboard.writeText(generatedPrompt)}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <p className="font-mono text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto pr-8">
                    {generatedPrompt}
                  </p>
                </div>

                <div className="flex gap-4 w-full">
                  <button onClick={onClose} className="flex-1 pds-btn-ghost py-3">
                    Close
                  </button>
                  <button onClick={createAndRoute} className="flex-1 pds-btn-primary py-3">
                    Create Slide Project
                    <ArrowRight className="w-4 h-4 ml-2" />
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
