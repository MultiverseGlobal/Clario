import { motion } from 'framer-motion';
import { Download, ArrowLeft } from 'lucide-react';

interface MatchedClip {
  id: string;
  shot_id: string;
  title?: string;
  source_url?: string;
  source_type?: string;
  frame_url?: string;
  description?: string;
  start_sec?: number;
  end_sec?: number;
  duration?: number;
  similarity?: number;
}

interface ChunkResult {
  chunk_index: number;
  chunk_text: string;
  matches: MatchedClip[];
  error?: string;
}

interface ScriptMatchResponse {
  chunks: ChunkResult[];
  ranked_clips: MatchedClip[];
  total_chunks: number;
  total_unique_clips: number;
}

interface DeliverableViewProps {
  projectName: string;
  result: ScriptMatchResponse | null;
  onBack: () => void;
}

export function DeliverableView({ projectName, result, onBack }: DeliverableViewProps) {
  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-12">
        <p className="text-muted-foreground mb-4">No deliverable data found.</p>
        <button onClick={onBack} className="pds-btn-ghost">Go Back</button>
      </div>
    );
  }

  const handleExport = () => {
    window.print();
  };

  return (
    <div className="flex-1 flex flex-col w-full h-full overflow-y-auto bg-canvas pb-24">
      {/* ── Top Nav (Hidden when printing) ────────────────────────────── */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-8 py-4 bg-canvas/90 backdrop-blur border-b border-border print:hidden">
        <button onClick={onBack} className="pds-btn-ghost flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
        <button onClick={handleExport} className="pds-btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* ── Document Content ───────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto w-full px-8 py-16">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-20 text-center"
        >
          <p className="text-[11px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-4">
            Generated Treatment
          </p>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight mb-6 text-foreground">
            {projectName}
          </h1>
          <div className="w-16 h-1 bg-accent mx-auto rounded-full" />
        </motion.div>

        <div className="flex flex-col gap-24">
          {result.chunks.map((chunk, ci) => {
            const topClip = chunk.matches[0];
            return (
              <motion.div 
                key={ci}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="flex flex-col md:flex-row gap-10 items-center"
              >
                {/* Image Section */}
                <div className="w-full md:w-3/5 rounded-2xl overflow-hidden shadow-2xl border border-border bg-surface-2 aspect-video relative">
                  {topClip?.frame_url ? (
                    <img 
                      src={topClip.frame_url} 
                      alt="Matched Frame" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-muted-foreground font-mono text-xs">
                      No matching clip
                    </div>
                  )}
                  {topClip && (
                    <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur text-white text-[10px] font-mono px-2 py-1 rounded">
                      {topClip.title || topClip.shot_id}
                    </div>
                  )}
                </div>

                {/* Text Section */}
                <div className="w-full md:w-2/5 flex flex-col justify-center">
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
                    Scene {String(ci + 1).padStart(2, '0')}
                  </span>
                  <p className="text-lg md:text-xl text-foreground leading-relaxed">
                    {chunk.chunk_text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Print styles applied globally via CSS but keeping layout clean */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .bg-canvas { background: white !important; }
          .text-foreground { color: black !important; }
          .text-muted-foreground { color: #666 !important; }
          .border-border { border-color: #eee !important; }
          .print\\\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
