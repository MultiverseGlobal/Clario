import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  Scissors,
  CheckCircle2,
  AlertCircle,
  Download,
  Save,
  Play,
  Eye,
  ChevronLeft,
  Loader2,
  Film,
  Type,
  Layers,
} from 'lucide-react';
import { detectCinematicScenes, type DetectedScene } from '../../lib/clientSceneDetector';
import { db } from '../../lib/dexieDb';

type WorkbenchState = 'idle' | 'detecting' | 'review' | 'error';

interface DetectedAsset extends DetectedScene {
  savedToVault?: boolean;
  previewOpen?: boolean;
}

interface AssetExtractionWorkbenchProps {
  onBack: () => void;
}

export function AssetExtractionWorkbench({ onBack }: AssetExtractionWorkbenchProps) {
  const [state, setState] = useState<WorkbenchState>('idle');
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [assets, setAssets] = useState<DetectedAsset[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [previewAsset, setPreviewAsset] = useState<DetectedAsset | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [dragging, setDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const projectIdRef = useRef<string>(`extract_${Date.now()}`);

  const runDetection = useCallback(async (source: File | Blob, name: string, blobUrl: string) => {
    setState('detecting');
    setSourceUrl(blobUrl);
    setSourceName(name);
    setProgress(5);
    setProgressMsg('Uploading to scene detector…');

    try {
      const result = await detectCinematicScenes(source, (p) => {
        setProgress(p.progressPct);
        setProgressMsg(p.statusMsg);
      });

      const detectedAssets: DetectedAsset[] = result.scenes.map((s) => ({
        ...s,
        savedToVault: false,
        previewOpen: false,
      }));

      setAssets(detectedAssets);
      setState('review');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Scene detection failed. Is the backend running?');
      setState('error');
    }
  }, []);

  const handleFileSelect = (file: File) => {
    const blobUrl = URL.createObjectURL(file);
    const name = file.name.replace(/\.[^/.]+$/, '');
    runDetection(file, name, blobUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) handleFileSelect(file);
  };

  const handleSaveToVault = async (asset: DetectedAsset) => {
    const shotId = `shot_${Date.now()}_${asset.id}`;
    await db.shots.put({
      id: shotId,
      harvest_job_id: projectIdRef.current,
      shot_id: shotId,
      start_seconds: asset.startTime,
      end_seconds: asset.endTime,
      duration: asset.duration,
      visual_description: asset.sceneTag,
      clean_source_url: sourceUrl,
      frame_url: asset.frameUrl,
      content_type: asset.contentType,
      scene_tag: asset.sceneTag,
      notes: `Extracted from "${sourceName}" · ${asset.hasCaptions ? 'Overlays detected' : 'Clean'}`,
    } as any);

    await db.vaultAssets.put({
      id: `vault_${shotId}`,
      shotId,
      projectId: projectIdRef.current,
      title: asset.sceneTag,
      assetKind: asset.contentType === 'a_roll' ? 'attached_master' : 'vault_broll',
      sourceUrl,
      rightsNote: 'Extracted Source Asset',
      createdAt: Date.now(),
    } as any);

    setAssets((prev) =>
      prev.map((a) => (a.id === asset.id ? { ...a, savedToVault: true } : a))
    );
    setSavedCount((n) => n + 1);
  };

  const handleSaveAll = async () => {
    for (const asset of assets) {
      if (!asset.savedToVault) await handleSaveToVault(asset);
    }
  };

  // ─── Content Type Formatting ─────────────────────────────────────────────

  const contentTypeLabel = (ct: DetectedScene['contentType']) => {
    if (ct === 'a_roll') return 'A-Roll';
    if (ct === 'b_roll') return 'B-Roll';
    return 'UI Screen';
  };

  const contentTypeColor = (ct: DetectedScene['contentType']) => {
    if (ct === 'a_roll') return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    if (ct === 'b_roll') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return `${m}:${sec.padStart(4, '0')}`;
  };

  // ─── Render States ───────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col w-full max-w-6xl mx-auto px-6 py-8">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
          <Scissors className="w-4 h-4" />
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-foreground leading-tight">Extract Source Assets</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detect segments · extract clean clips · flag overlays · save to vault
          </p>
        </div>
        {state === 'review' && assets.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-mono">
              {savedCount}/{assets.length} saved
            </span>
            <button
              onClick={handleSaveAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white font-semibold text-xs shadow-md hover:bg-emerald-600 transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Save All to Vault
            </button>
          </div>
        )}
      </div>

      {/* ── Idle: Drop Zone ────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center
                min-h-[360px] rounded-2xl border-2 border-dashed
                transition-all duration-200 cursor-pointer group
                ${dragging
                  ? 'border-emerald-500/70 bg-emerald-500/5 scale-[1.01]'
                  : 'border-border/50 bg-card/40 hover:border-emerald-500/40 hover:bg-card/70'}
              `}
            >
              <div className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-5
                transition-all duration-200
                ${dragging ? 'bg-emerald-500/20 border-emerald-500/40 scale-110' : 'bg-muted/30 border border-border/50 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30'}
              `}>
                <Upload className={`w-7 h-7 transition-colors ${dragging ? 'text-emerald-400' : 'text-muted-foreground group-hover:text-emerald-400'}`} />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {dragging ? 'Drop to Analyse' : 'Drop a Finished Video'}
              </h3>
              <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed">
                Upload any faceless video. Clario will detect every visual segment, extract clean clips, and flag text overlays for review.
              </p>
              <div className="mt-6 flex items-center gap-4 text-[11px] text-muted-foreground/70 font-mono">
                <span className="flex items-center gap-1"><Film className="w-3 h-3" /> MP4 · MOV · WEBM</span>
                <span>·</span>
                <span>Up to 200MB</span>
              </div>
            </div>

            {/* Pipeline Steps Preview */}
            <div className="grid grid-cols-4 gap-3 mt-6">
              {[
                { icon: Scissors, label: 'Detect Segments', desc: 'FFmpeg scene boundaries' },
                { icon: Film, label: 'Extract Keyframes', desc: 'Mid-shot frame per clip' },
                { icon: Type, label: 'Flag Overlays', desc: 'Detect burned-in text' },
                { icon: Layers, label: 'Save to Vault', desc: 'Organised by content type' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="p-3 rounded-xl bg-card/40 border border-border/40 text-center">
                  <div className="w-8 h-8 rounded-lg bg-muted/30 border border-border/40 flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <p className="text-[11px] font-semibold text-foreground font-display mb-0.5">{label}</p>
                  <p className="text-[10px] text-muted-foreground/70">{desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Detecting: Progress ───────────────────────────────────────── */}
        {state === 'detecting' && (
          <motion.div
            key="detecting"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center min-h-[360px]"
          >
            <div className="clario-glass-card rounded-2xl p-10 max-w-md w-full text-center border border-border shadow-2xl">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2 truncate max-w-xs mx-auto">
                {sourceName || 'Analysing video…'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6 min-h-[20px]">{progressMsg}</p>
              <div className="w-full h-2 rounded-full bg-border/60 overflow-hidden mb-2">
                <motion.div
                  className="h-full rounded-full bg-emerald-500"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-muted-foreground font-mono">{progress}%</p>
            </div>
          </motion.div>
        )}

        {/* ── Error State ───────────────────────────────────────────────── */}
        {state === 'error' && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center min-h-[360px]"
          >
            <div className="clario-glass-card rounded-2xl p-8 max-w-sm w-full text-center border border-red-500/20">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="font-display text-base font-bold text-foreground mb-2">Detection Failed</h3>
              <p className="text-xs text-muted-foreground mb-6 leading-relaxed">{errorMsg}</p>
              <button
                onClick={() => { setState('idle'); setErrorMsg(''); }}
                className="px-4 py-2 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
              >
                Try Again
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Review Grid ───────────────────────────────────────────────── */}
        {state === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            {/* Summary Bar */}
            <div className="flex items-center gap-3 mb-6 p-3 rounded-xl bg-card/60 border border-border/50 text-xs text-muted-foreground font-mono">
              <span className="text-foreground font-semibold font-sans">{sourceName}</span>
              <span>·</span>
              <span>{assets.length} segments detected</span>
              <span>·</span>
              <span>{assets.filter(a => a.hasCaptions).length} with overlays</span>
              <span>·</span>
              <span className="text-emerald-400">{savedCount} saved to vault</span>
              <button
                onClick={() => { setState('idle'); setAssets([]); setSavedCount(0); }}
                className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
              >
                New Video ↺
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assets.map((asset, idx) => (
                <motion.div
                  key={asset.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: idx * 0.03 }}
                  className={`
                    rounded-2xl border bg-card/70 p-4 flex flex-col gap-3
                    transition-all duration-200
                    ${asset.savedToVault ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/50 hover:border-border hover:bg-card/95'}
                  `}
                >
                  {/* Thumbnail */}
                  <div className="relative w-full h-32 rounded-xl bg-surface-2 border border-border/40 overflow-hidden flex items-center justify-center">
                    {asset.frameUrl ? (
                      <img
                        src={asset.frameUrl}
                        alt={asset.sceneTag}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Film className="w-6 h-6 text-muted-foreground/40" />
                    )}

                    {/* Overlay badge */}
                    {asset.hasCaptions && (
                      <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-amber-500/90 text-[9px] font-mono font-bold text-black">
                        TEXT
                      </div>
                    )}

                    {/* Saved badge */}
                    {asset.savedToVault && (
                      <div className="absolute inset-0 bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                      </div>
                    )}

                    {/* Play preview button */}
                    <button
                      onClick={() => setPreviewAsset(asset)}
                      className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/40"
                    >
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                        <Play className="w-4 h-4 text-black fill-current ml-0.5" />
                      </div>
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground font-display truncate">{asset.sceneTag}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        {formatTime(asset.startTime)} → {formatTime(asset.endTime)}
                        <span className="ml-2 text-muted-foreground/60">{asset.duration.toFixed(1)}s</span>
                      </p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${contentTypeColor(asset.contentType)}`}>
                      {contentTypeLabel(asset.contentType)}
                    </span>
                  </div>

                  {/* Overlay indicator */}
                  {asset.hasCaptions && (
                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-mono">
                      <Type className="w-3 h-3" />
                      <span>Text/logo overlay detected · suggest: {asset.suggestedStripMode === 'blur_mask' ? 'blur mask' : 'punch-in'}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-auto pt-1">
                    <button
                      onClick={() => setPreviewAsset(asset)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-border/40"
                    >
                      <Eye className="w-3 h-3" />
                      Preview
                    </button>
                    <a
                      href={sourceUrl}
                      download={`${asset.sceneTag.replace(/\s+/g, '_')}.mp4`}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors border border-border/40"
                    >
                      <Download className="w-3 h-3" />
                      Export
                    </a>
                    <button
                      onClick={() => handleSaveToVault(asset)}
                      disabled={asset.savedToVault}
                      className={`
                        ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors
                        ${asset.savedToVault
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                          : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'}
                      `}
                    >
                      {asset.savedToVault ? (
                        <><CheckCircle2 className="w-3 h-3" /> Saved</>
                      ) : (
                        <><Save className="w-3 h-3" /> Save</>
                      )}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Preview Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {previewAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
            onClick={() => setPreviewAsset(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.175, 0.885, 0.32, 1.05] }}
              onClick={(e) => e.stopPropagation()}
              className="clario-glass-card rounded-2xl border border-border shadow-2xl max-w-2xl w-full overflow-hidden"
            >
              <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">{previewAsset.sceneTag}</h3>
                  <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                    {formatTime(previewAsset.startTime)} → {formatTime(previewAsset.endTime)} · {previewAsset.duration.toFixed(1)}s
                  </p>
                </div>
                <button
                  onClick={() => setPreviewAsset(null)}
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
              <video
                src={`${sourceUrl}#t=${previewAsset.startTime},${previewAsset.endTime}`}
                controls
                autoPlay
                className="w-full max-h-[60vh] bg-black"
              />
              <div className="p-4 flex items-center justify-between">
                <span className={`text-[11px] font-mono font-bold px-2 py-1 rounded border ${contentTypeColor(previewAsset.contentType)}`}>
                  {contentTypeLabel(previewAsset.contentType)}
                </span>
                <button
                  onClick={() => { handleSaveToVault(previewAsset); setPreviewAsset(null); }}
                  disabled={previewAsset.savedToVault}
                  className={`
                    flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-colors
                    ${previewAsset.savedToVault
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 cursor-default'
                      : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm'}
                  `}
                >
                  {previewAsset.savedToVault ? <><CheckCircle2 className="w-3.5 h-3.5" /> Saved to Vault</> : <><Save className="w-3.5 h-3.5" /> Save to Vault</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
