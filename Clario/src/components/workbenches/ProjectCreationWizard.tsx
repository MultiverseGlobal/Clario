import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Video, Presentation, UploadCloud, Link as LinkIcon, Camera, 
  CheckCircle2, ArrowRight, X, Scissors, Edit2, Play, FileText, Send, Loader2, Sparkles, Layout
} from 'lucide-react';
import { Button } from '@pseudonyms/ui';
import { ClarioProject } from '../../lib/projectStore';

interface ProjectCreationWizardProps {
  onClose: () => void;
  onProjectCreated: (p: ClarioProject) => void;
  onSaveToLibrary?: (p: any) => void;
}

export function ProjectCreationWizard({ onClose, onProjectCreated }: ProjectCreationWizardProps) {
  const [step, setStep] = useState(0);
  
  // Handoff state
  const [atlasBrief, setAtlasBrief] = useState<any>(null);

  useEffect(() => {
    // Parse handoff data from URL if coming from Atlas
    const params = new URLSearchParams(window.location.search);
    const handoff = params.get('handoff');
    if (handoff) {
      try {
        const decoded = JSON.parse(decodeURIComponent(handoff));
        setAtlasBrief(decoded);
        setStep(0); // Show step 0 with the prefilled option
      } catch (e) {
        console.error("Failed to parse handoff data", e);
      }
    }
  }, []);

  // Step 2 State
  const [script, setScript] = useState(
    "Hey, I noticed your team is expanding its customer-support product. Many SaaS teams reach a point where support volume grows faster than their ability to respond personally. I wanted to show you a simple way to reduce that pressure..."
  );

  // Step 3 State
  const [recordingMethod, setRecordingMethod] = useState<'camera' | 'screen' | 'upload' | null>(null);
  
  // Step 4 State
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'done'>('idle');

  // Step 5 State
  const [polishing, setPolishing] = useState(false);
  const [polished, setPolished] = useState(false);

  const handleExport = () => {
    // Finish onboarding
    onProjectCreated({
      id: Date.now().toString(),
      name: atlasBrief ? `Pitch for ${atlasBrief.target}` : 'New Video Draft',
      mode: 'video',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111318] flex flex-col font-sans text-[#F4F1EA] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-[#374151]/40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
            <Video className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg">Clario Studio</span>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-[#1F2937] rounded-full transition-colors">
          <X className="w-5 h-5 text-[#9CA3AF]" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center py-12 px-6 max-w-4xl mx-auto w-full">
        
        {/* Step 0: Choose outcome */}
        {step === 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-8">
            <div className="text-center space-y-3 mb-12">
              <h1 className="text-3xl font-semibold tracking-tight">What do you want to make today?</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {atlasBrief && (
                <div 
                  onClick={() => setStep(1)}
                  className="col-span-1 md:col-span-3 p-6 rounded-xl border border-[#4F46E5] bg-[#4F46E5]/10 hover:bg-[#4F46E5]/20 transition-all cursor-pointer flex flex-col md:flex-row items-center justify-between gap-6"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                      Create a video for an Atlas opportunity
                    </h3>
                    <p className="text-sm text-[#9CA3AF] mt-1">
                      Target: <span className="text-white font-medium">{atlasBrief.target}</span>
                    </p>
                  </div>
                  <Button className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">Start Draft <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </div>
              )}

              <div onClick={() => setStep(1)} className="p-6 rounded-xl border border-[#374151] bg-[#1A1D24] hover:border-[#6B7280] transition-all cursor-pointer group">
                <Presentation className="w-8 h-8 text-[#10B981] mb-4" />
                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-[#10B981]">Send a personalized pitch</h3>
                <p className="text-sm text-[#9CA3AF]">Record a 1-to-1 video for outreach.</p>
              </div>
              <div onClick={() => setStep(1)} className="p-6 rounded-xl border border-[#374151] bg-[#1A1D24] hover:border-[#6B7280] transition-all cursor-pointer group">
                <Scissors className="w-8 h-8 text-[#F59E0B] mb-4" />
                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-[#F59E0B]">Turn footage into clips</h3>
                <p className="text-sm text-[#9CA3AF]">Extract highlights from long videos.</p>
              </div>
              <div onClick={() => setStep(1)} className="p-6 rounded-xl border border-[#374151] bg-[#1A1D24] hover:border-[#6B7280] transition-all cursor-pointer group">
                <Video className="w-8 h-8 text-[#3B82F6] mb-4" />
                <h3 className="text-base font-semibold text-white mb-2 group-hover:text-[#3B82F6]">Create a social video</h3>
                <p className="text-sm text-[#9CA3AF]">Produce fast-paced social content.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 1: Source */}
        {step === 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-semibold tracking-tight">How would you like to start?</h1>
            </div>
            
            <div className="flex flex-col gap-3">
              {atlasBrief && (
                <Button onClick={() => setStep(2)} className="h-16 justify-start px-6 bg-[#1A1D24] border border-[#4F46E5] hover:bg-[#4F46E5]/10 text-white w-full text-lg">
                  <FileText className="w-5 h-5 mr-3 text-[#4F46E5]" /> Use the Atlas brief
                </Button>
              )}
              <Button onClick={() => setStep(2)} variant="secondary" className="h-14 justify-start px-6 border-[#374151] hover:bg-[#1F2937] text-white w-full">
                <FileText className="w-5 h-5 mr-3 text-[#9CA3AF]" /> Start from a script
              </Button>
              <Button onClick={() => setStep(3)} variant="secondary" className="h-14 justify-start px-6 border-[#374151] hover:bg-[#1F2937] text-white w-full">
                <Camera className="w-5 h-5 mr-3 text-[#9CA3AF]" /> Record now
              </Button>
              <Button onClick={() => setStep(3)} variant="secondary" className="h-14 justify-start px-6 border-[#374151] hover:bg-[#1F2937] text-white w-full">
                <UploadCloud className="w-5 h-5 mr-3 text-[#9CA3AF]" /> Upload a video
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Generated Script */}
        {step === 2 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">Here's a 30-second draft{atlasBrief && ` for ${atlasBrief.target}`}</h1>
              <p className="text-[#9CA3AF] text-sm">Review and edit your personalized script before recording.</p>
            </div>
            
            <div className="relative">
              <textarea 
                value={script}
                onChange={e => setScript(e.target.value)}
                className="w-full h-48 bg-[#1A1D24] border border-[#374151] rounded-xl p-5 text-[#E5E7EB] text-lg leading-relaxed focus:ring-2 focus:ring-[#4F46E5] outline-none resize-none"
              />
              <div className="absolute bottom-4 right-4 text-xs font-mono text-[#6B7280]">
                ~ {script.split(' ').length} words / 30s
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="h-8 text-xs border-[#374151] hover:bg-[#1F2937]"><Edit2 className="w-3 h-3 mr-2" /> Rewrite</Button>
              <Button variant="secondary" className="h-8 text-xs border-[#374151] hover:bg-[#1F2937]">Make shorter</Button>
              <Button variant="secondary" className="h-8 text-xs border-[#374151] hover:bg-[#1F2937]">Make conversational</Button>
            </div>

            <div className="pt-6 border-t border-[#374151]/50 flex justify-end">
              <Button onClick={() => setStep(3)} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white h-12 px-8">
                Use this script
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Recording Method */}
        {step === 3 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl space-y-8">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">How will you record?</h1>
              <p className="text-[#9CA3AF] text-sm">Camera access is used only to record this video. You can change this later.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div onClick={() => setStep(4)} className="p-6 rounded-xl border border-[#374151] bg-[#1A1D24] hover:border-[#4F46E5]/50 transition-all cursor-pointer text-center">
                <Camera className="w-8 h-8 text-white mx-auto mb-4" />
                <h3 className="font-semibold text-white">Camera only</h3>
              </div>
              <div onClick={() => setStep(4)} className="p-6 rounded-xl border border-[#374151] bg-[#1A1D24] hover:border-[#4F46E5]/50 transition-all cursor-pointer text-center">
                <Layout className="w-8 h-8 text-white mx-auto mb-4" />
                <h3 className="font-semibold text-white">Camera + screen</h3>
              </div>
            </div>

            <div className="text-center pt-4">
              <button onClick={() => setStep(4)} className="text-sm text-[#6B7280] hover:text-white underline underline-offset-4">
                Upload existing footage instead
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Record guided take */}
        {step === 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full h-full flex flex-col">
            <div className="flex-1 bg-black rounded-2xl border border-[#374151] overflow-hidden relative flex flex-col items-center justify-center min-h-[400px]">
              
              {/* Teleprompter */}
              <div className="absolute top-8 w-full max-w-lg px-8 text-center text-white/90 text-2xl font-medium leading-relaxed drop-shadow-lg" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                {script}
              </div>

              {/* Camera Preview Fake */}
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <Camera className="w-24 h-24 text-white/20" />
              </div>

              {/* Controls */}
              <div className="absolute bottom-8 flex items-center gap-4 z-10">
                {recordingState === 'idle' && (
                  <Button onClick={() => setRecordingState('recording')} className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 border-4 border-red-500/30 p-0 flex items-center justify-center transition-transform hover:scale-105" />
                )}
                {recordingState === 'recording' && (
                  <Button onClick={() => setRecordingState('done')} className="h-16 w-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 p-0 flex items-center justify-center transition-transform hover:scale-105">
                    <div className="w-6 h-6 bg-red-500 rounded-sm" />
                  </Button>
                )}
                {recordingState === 'done' && (
                  <div className="flex flex-col items-center gap-4 bg-[#1A1D24]/90 backdrop-blur-md p-6 rounded-xl border border-[#374151]">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-[#10B981]" /> Nice. Your first take is ready.</h3>
                    <div className="flex gap-3">
                      <Button onClick={() => setStep(5)} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white">Use this take</Button>
                      <Button variant="secondary" onClick={() => setRecordingState('idle')} className="border-[#374151] hover:bg-[#1F2937]">Retake</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 5: One-click polish */}
        {step === 5 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-2xl space-y-8">
            <div className="text-center">
              <h1 className="text-3xl font-semibold tracking-tight">Apply one-click polish</h1>
              <p className="text-[#9CA3AF] text-sm mt-2">Let Clario clean up silences and add captions automatically.</p>
            </div>

            <div className="bg-[#1A1D24] border border-[#374151] rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-[#4F46E5]" />
                  <span className="font-semibold text-white">Recommended Polish</span>
                </div>
                <div className="text-xs text-[#9CA3AF] bg-[#111318] px-2 py-1 rounded">~15s process</div>
              </div>
              
              <ul className="space-y-3 mb-6 text-sm text-[#D1D5DB]">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Remove long silences</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Add dynamic captions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Normalize audio levels</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[#10B981]" /> Apply basic framing</li>
              </ul>

              {polishing ? (
                <div className="bg-[#111318] rounded-lg p-4 border border-[#374151] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-[#4F46E5] animate-spin" />
                    <span className="text-sm font-medium text-white">Applying polish...</span>
                  </div>
                  <div className="w-32 h-2 bg-[#1F2937] rounded-full overflow-hidden">
                    <div className="h-full bg-[#4F46E5] w-2/3 animate-pulse"></div>
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={() => {
                    setPolishing(true);
                    setTimeout(() => {
                      setPolishing(false);
                      setStep(6);
                    }, 2500);
                  }}
                  className="w-full h-12 bg-[#4F46E5] hover:bg-[#4338CA] text-white"
                >
                  Apply recommended polish
                </Button>
              )}
            </div>

            <div className="text-center">
              <button onClick={() => setStep(6)} className="text-sm text-[#6B7280] hover:text-white underline underline-offset-4">
                Skip and fine-tune manually
              </button>
            </div>
          </motion.div>
        )}

        {/* Step 6: Preview and Export */}
        {step === 6 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-black border border-[#374151] rounded-2xl overflow-hidden aspect-video relative group flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <Camera className="w-16 h-16 text-white/20" />
              </div>
              <Button className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 p-0 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Play className="w-5 h-5 text-white ml-1" />
              </Button>
              {/* Fake captions */}
              <div className="absolute bottom-4 left-0 right-0 text-center text-xl font-black text-white px-8" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                I wanted to show you a simple way...
              </div>
            </div>

            <div className="space-y-6 flex flex-col justify-center">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Your video is ready</h1>
                <p className="text-[#9CA3AF] mt-2">Quality checks passed. Audio is clear and captions are synced.</p>
              </div>
              
              <div className="bg-[#1A1D24] border border-[#374151] rounded-xl p-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#9CA3AF]">Duration</span>
                  <span className="font-medium text-white">0:28</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-2">
                  <span className="text-[#9CA3AF]">Target</span>
                  <span className="font-medium text-white">{atlasBrief?.target || 'Custom Pitch'}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-4 border-t border-[#374151]/50">
                {atlasBrief ? (
                  <Button onClick={handleExport} className="h-14 bg-[#10B981] hover:bg-[#059669] text-white text-lg">
                    <Send className="w-5 h-5 mr-2" /> Send back to Atlas
                  </Button>
                ) : (
                  <Button onClick={handleExport} className="h-14 bg-[#4F46E5] hover:bg-[#4338CA] text-white text-lg">
                    Export Video
                  </Button>
                )}
                <Button variant="secondary" onClick={() => setStep(5)} className="h-12 border-[#374151] hover:bg-[#1F2937]">
                  Make adjustments
                </Button>
              </div>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
