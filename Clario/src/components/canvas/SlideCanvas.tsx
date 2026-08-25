import { useState, useRef, useCallback, useEffect } from "react";
import type { CarouselSlideItem, Asset, SlideGraphicElement } from "../../types/assets";
import { generateHook } from "../../lib/ai";
import { getBrandKit } from "../../lib/brandKit";

type SlideText = CarouselSlideItem["texts"][number];

interface SlideCanvasProps {
  slides: CarouselSlideItem[];
  assets: Asset[];
  activeIdx: number;
  selectedTextId: string | null;
  selectedElementId: string | null;
  onChange: (slides: CarouselSlideItem[]) => void;
  onActiveChange: (idx: number) => void;
  onSelectText: (id: string | null) => void;
  onSelectElement: (id: string | null) => void;
}

function FilmstripItem({
  slide, index, active, onClick, onDelete,
  isDragOver, onDragStart, onDragOver, onDrop,
}: {
  slide: CarouselSlideItem; index: number; active: boolean;
  onClick: () => void; onDelete: () => void; isDragOver: boolean;
  onDragStart: () => void; onDragOver: (e: React.DragEvent) => void; onDrop: () => void;
}) {
  const elements = slide.elements || [];
  const texts = slide.texts || [];

  return (
    <div draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop}
      style={{ position: "relative", cursor: "grab", flexShrink: 0 }}>
      {isDragOver && (
        <div style={{
          position: "absolute", top: -2, left: 8, right: 8,
          height: 2, background: "var(--accent)", borderRadius: 1, zIndex: 10,
          boxShadow: "0 0 6px rgba(99,102,241,0.7)",
        }} />
      )}
      <div onClick={onClick} style={{
        width: 120,
        aspectRatio: `${slide.width || 1} / ${slide.height || 1}`,
        borderRadius: 8, overflow: "hidden",
        border: `2px solid ${active ? "var(--accent)" : "rgba(255,255,255,0.07)"}`,
        boxShadow: active
          ? "0 0 0 1px var(--accent-border), 0 4px 16px rgba(99,102,241,0.25)"
          : "0 2px 8px rgba(0,0,0,0.4)",
        background: slide.backgroundColor || "#ffffff",
        cursor: "pointer", position: "relative",
        transition: "border-color 0.15s, box-shadow 0.15s, transform 0.1s",
        transform: active ? "scale(1.03)" : "scale(1)",
      }}>
        {/* Ghost backdrop if enabled */}
        {slide.showBackdrop && slide.backgroundUrl && (
          <img src={slide.backgroundUrl} alt="" draggable={false}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.25, display: "block" }} />
        )}

        {/* Graphic Elements thumbnail preview */}
        {elements.map(el => (
          <img key={el.id} src={el.imageUrl} alt="" draggable={false}
            style={{
              position: "absolute",
              left: `${el.x}%`,
              top: `${el.y}%`,
              width: `${el.width}%`,
              transform: "translate(-50%, -50%)",
              opacity: el.opacity ?? 1,
              pointerEvents: "none",
            }} />
        ))}

        {/* Texts thumbnail preview */}
        {texts.slice(0, 3).map(t => (
          <div key={t.id} style={{
            position: "absolute", left: `${t.x}%`, top: `${t.y}%`,
            transform: "translate(-50%, -50%)",
            fontSize: Math.max(5, t.fontSize * 0.16), fontWeight: t.fontWeight,
            color: t.color, textShadow: "0 1px 2px rgba(0,0,0,0.3)",
            textAlign: t.align, whiteSpace: "nowrap", overflow: "hidden",
            maxWidth: "90%", pointerEvents: "none", lineHeight: 1.1,
          }}>{t.content}</div>
        ))}

        <div style={{
          position: "absolute", bottom: 4, left: 5,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          color: "rgba(255,255,255,0.7)", fontSize: 8,
          fontFamily: "Space Mono, monospace", padding: "1px 5px", borderRadius: 3,
        }}>{index + 1}</div>
        <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{
          position: "absolute", top: 4, right: 4, width: 18, height: 18,
          borderRadius: 5, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
          border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", opacity: active ? 1 : 0, transition: "opacity 0.15s, background 0.15s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(244,63,94,0.75)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.65)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; }}>
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
}

export function SlideCanvas({
  slides, assets, activeIdx, selectedTextId, selectedElementId,
  onChange, onActiveChange, onSelectText, onSelectElement,
}: SlideCanvasProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState(false);
  const [showStickerTray, setShowStickerTray] = useState(false);

  // Dragging refs
  const textDragRef = useRef<{ textId: string; startMX: number; startMY: number; startX: number; startY: number } | null>(null);
  const elementDragRef = useRef<{ elemId: string; startMX: number; startMY: number; startX: number; startY: number } | null>(null);
  const resizeDragRef = useRef<{ elemId: string; startMX: number; startWidth: number } | null>(null);

  const activeSlide = slides[activeIdx] ?? slides[0];

  const addBlankSlide = () => {
    const kit = getBrandKit();
    const s: CarouselSlideItem = {
      id: crypto.randomUUID(),
      backgroundColor: kit.backgroundColor,
      elements: [],
      texts: [{ id: crypto.randomUUID(), content: "New Headline", x: 50, y: 30, fontSize: 32, fontWeight: 800, color: kit.textColor, align: "center" }],
      width: 1080, height: 1080,
    };
    const updated = [...slides, s];
    onChange(updated); onActiveChange(updated.length - 1);
  };

  const addTextToActive = () => {
    if (!activeSlide) return;
    const kit = getBrandKit();
    const newText: SlideText = {
      id: crypto.randomUUID(),
      content: "Editable Text Layer",
      x: 50, y: 50,
      fontSize: 24, fontWeight: 700,
      color: kit.textColor,
      align: "center",
    };
    onChange(slides.map((s, i) => i === activeIdx ? { ...s, texts: [...(s.texts || []), newText] } : s));
    onSelectText(newText.id);
    onSelectElement(null);
  };

  const autoLayoutComponents = () => {
    if (!activeSlide) return;
    const elements = activeSlide.elements || [];
    if (elements.length === 0) return;

    const count = elements.length;
    const colWidth = 84 / count;
    const updatedElements = elements.map((el, idx) => {
      const centerX = Math.round(8 + idx * colWidth + colWidth / 2);
      return {
        ...el,
        x: centerX,
        y: 54,
        width: Math.min(16, Math.round(colWidth * 0.7)),
      };
    });

    // Also auto-align subtitle/title texts
    const texts = activeSlide.texts || [];
    const nonToolTexts = texts.filter(t => t.tag === "step" || t.tag === "title" || t.tag === "subtitle");
    const toolTexts = texts.filter(t => t.tag !== "step" && t.tag !== "title" && t.tag !== "subtitle");

    const updatedToolTexts = toolTexts.map((t, idx) => {
      const colIdx = Math.floor(idx / 2);
      const isTitle = idx % 2 === 0;
      const targetCol = Math.min(colIdx, count - 1);
      const colX = Math.round(8 + targetCol * colWidth + colWidth / 2);
      return {
        ...t,
        x: colX,
        y: isTitle ? 72 : 78,
        align: "center" as const,
      };
    });

    onChange(slides.map((s, i) => i === activeIdx ? {
      ...s,
      elements: updatedElements,
      texts: [...nonToolTexts, ...updatedToolTexts],
    } : s));
  };

  const addStickerElement = (asset: Asset) => {
    if (!activeSlide) return;
    const url = (asset as any).blobUrl || (asset as any).thumbnail;
    if (!url) return;

    const newEl: SlideGraphicElement = {
      id: crypto.randomUUID(),
      assetId: asset.id,
      imageUrl: url,
      x: 50,
      y: 50,
      width: 28,
      opacity: 1,
      label: asset.label,
    };
    onChange(slides.map((s, i) => i === activeIdx ? { ...s, elements: [...(s.elements || []), newEl] } : s));
    onSelectElement(newEl.id);
    onSelectText(null);
    setShowStickerTray(false);
  };

  const handleGenerateHook = async () => {
    if (!activeSlide || aiGenerating) return;
    setAiGenerating(true);
    try {
      const existingText = (activeSlide.texts || []).map(t => t.content).join(" ");
      const hook = await generateHook(existingText);
      const kit = getBrandKit();
      const newText: SlideText = {
        id: crypto.randomUUID(),
        content: hook,
        x: 50,
        y: (activeSlide.texts || []).length === 0 ? 50 : 25,
        fontSize: 32,
        fontWeight: 800,
        color: kit.textColor,
        align: "center",
      };
      onChange(slides.map((s, i) => i === activeIdx ? { ...s, texts: [...(s.texts || []), newText] } : s));
      onSelectText(newText.id);
      onSelectElement(null);
    } finally {
      setAiGenerating(false);
    }
  };

  // ── Apply Brand Kit to ALL slides at once ───────────────────────────────────
  const applyBrandKitToAll = () => {
    const kit = getBrandKit();
    const updated = slides.map(s => ({
      ...s,
      backgroundColor: kit.backgroundColor,
      texts: (s.texts || []).map(t => ({
        ...t,
        color: t.tag === 'title' || t.fontWeight >= 700
          ? kit.textColor
          : t.color, // keep muted/secondary colours as-is
      })),
    }));
    onChange(updated);
  };

  const deleteSlide = (idx: number) => {
    if (slides.length <= 1) return;
    const updated = slides.filter((_, i) => i !== idx);
    onChange(updated); onActiveChange(Math.min(activeIdx, updated.length - 1));
    onSelectText(null); onSelectElement(null);
  };

  const updateActiveSlide = (patch: Partial<CarouselSlideItem>) => {
    onChange(slides.map((s, i) => i === activeIdx ? { ...s, ...patch } : s));
  };

  const updateText = useCallback((textId: string, patch: Partial<SlideText>) => {
    onChange(slides.map((s, i) => i !== activeIdx ? s : {
      ...s,
      texts: (s.texts || []).map(t => t.id === textId ? { ...t, ...patch } : t),
    }));
  }, [slides, activeIdx, onChange]);

  const updateElement = useCallback((elemId: string, patch: Partial<SlideGraphicElement>) => {
    onChange(slides.map((s, i) => i !== activeIdx ? s : {
      ...s,
      elements: (s.elements || []).map(el => el.id === elemId ? { ...el, ...patch } : el),
    }));
  }, [slides, activeIdx, onChange]);

  const handleFilmDragOver = useCallback((e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); }, []);

  const handleFilmDrop = useCallback((targetIdx: number) => {
    if (dragSrcIdx === null || dragSrcIdx === targetIdx) { setDragSrcIdx(null); setDragOverIdx(null); return; }
    const updated = [...slides];
    const [moved] = updated.splice(dragSrcIdx, 1);
    updated.splice(targetIdx, 0, moved);
    onChange(updated); onActiveChange(targetIdx); setDragSrcIdx(null); setDragOverIdx(null);
  }, [dragSrcIdx, slides, onChange, onActiveChange]);

  // Text dragging
  const handleTextMouseDown = (e: React.MouseEvent, textId: string, text: SlideText) => {
    if (editingTextId === textId) return;
    e.preventDefault(); e.stopPropagation();
    onSelectText(textId);
    onSelectElement(null);
    textDragRef.current = { textId, startMX: e.clientX, startMY: e.clientY, startX: text.x, startY: text.y };
  };

  // Element dragging
  const handleElementMouseDown = (e: React.MouseEvent, elemId: string, elem: SlideGraphicElement) => {
    e.preventDefault(); e.stopPropagation();
    onSelectElement(elemId);
    onSelectText(null);
    elementDragRef.current = { elemId, startMX: e.clientX, startMY: e.clientY, startX: elem.x, startY: elem.y };
  };

  // Element corner resize
  const handleResizeHandleMouseDown = (e: React.MouseEvent, elemId: string, elem: SlideGraphicElement) => {
    e.preventDefault(); e.stopPropagation();
    resizeDragRef.current = { elemId, startMX: e.clientX, startWidth: elem.width };
  };

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();

    // Text drag
    if (textDragRef.current) {
      const dx = e.clientX - textDragRef.current.startMX;
      const dy = e.clientY - textDragRef.current.startMY;
      const newX = Math.max(5, Math.min(95, textDragRef.current.startX + (dx / rect.width) * 100));
      const newY = Math.max(5, Math.min(95, textDragRef.current.startY + (dy / rect.height) * 100));
      updateText(textDragRef.current.textId, { x: newX, y: newY });
    }

    // Element drag
    if (elementDragRef.current) {
      const dx = e.clientX - elementDragRef.current.startMX;
      const dy = e.clientY - elementDragRef.current.startMY;
      const newX = Math.max(5, Math.min(95, elementDragRef.current.startX + (dx / rect.width) * 100));
      const newY = Math.max(5, Math.min(95, elementDragRef.current.startY + (dy / rect.height) * 100));
      updateElement(elementDragRef.current.elemId, { x: newX, y: newY });
    }

    // Element resize
    if (resizeDragRef.current) {
      const dx = e.clientX - resizeDragRef.current.startMX;
      const newWidth = Math.max(6, Math.min(95, resizeDragRef.current.startWidth + (dx / rect.width) * 100));
      updateElement(resizeDragRef.current.elemId, { width: Math.round(newWidth) });
    }
  };

  const handlePreviewMouseUp = () => {
    textDragRef.current = null;
    elementDragRef.current = null;
    resizeDragRef.current = null;
  };

  // Canvas Drop Listener for drag-and-drop from Asset tray
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOverCanvas(false);
    if (!previewRef.current || !activeSlide) return;

    const rect = previewRef.current.getBoundingClientRect();
    const dropX = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const dropY = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

    try {
      const raw = e.dataTransfer.getData("application/clario-asset");
      if (raw) {
        const asset: Asset = JSON.parse(raw);
        if (asset.type === "image-frame" || asset.type === "slide") {
          const url = (asset as any).blobUrl || (asset as any).thumbnail;
          const newEl: SlideGraphicElement = {
            id: crypto.randomUUID(),
            assetId: asset.id,
            imageUrl: url,
            x: Math.round(dropX),
            y: Math.round(dropY),
            width: 26,
            opacity: 1,
            label: asset.label,
          };
          const currentElements = activeSlide.elements || [];
          updateActiveSlide({ elements: [...currentElements, newEl] });
          onSelectElement(newEl.id);
          onSelectText(null);
        } else if (asset.type === "text-block") {
          const isDarkBg = activeSlide.backgroundColor ? parseInt(activeSlide.backgroundColor.replace("#", ""), 16) < 0x888888 : false;
          const newText: SlideText = {
            id: crypto.randomUUID(),
            content: (asset as any).content || "Extracted Text",
            x: Math.round(dropX),
            y: Math.round(dropY),
            fontSize: 22,
            fontWeight: 700,
            color: isDarkBg ? "#ffffff" : "#0f172a",
            align: "center",
          };
          updateActiveSlide({ texts: [...(activeSlide.texts || []), newText] });
          onSelectText(newText.id);
          onSelectElement(null);
        }
      }
    } catch (err) {
      console.error("Drop error:", err);
    }
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingTextId(null);
        onSelectText(null);
        onSelectElement(null);
        setShowStickerTray(false);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onSelectText, onSelectElement]);

  if (!activeSlide) return null;
  const slideAspect = (activeSlide.width || 1080) / (activeSlide.height || 1080);
  const elements = activeSlide.elements || [];
  const texts = activeSlide.texts || [];
  const availableImageAssets = assets.filter(a => a.type === "image-frame" || a.type === "slide");

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Filmstrip */}
      <div style={{
        width: 148, flexShrink: 0, background: "var(--panel)",
        borderRight: "1px solid var(--border)", display: "flex",
        flexDirection: "column", overflowY: "auto", overflowX: "hidden",
        padding: "12px 14px", gap: 10,
      }}>
        {slides.map((slide, i) => (
          <FilmstripItem key={slide.id} slide={slide} index={i} active={i === activeIdx}
            isDragOver={dragOverIdx === i}
            onClick={() => { onActiveChange(i); onSelectText(null); onSelectElement(null); }}
            onDelete={() => deleteSlide(i)}
            onDragStart={() => setDragSrcIdx(i)}
            onDragOver={e => handleFilmDragOver(e, i)}
            onDrop={() => handleFilmDrop(i)}
          />
        ))}
        <button onClick={addBlankSlide} style={{
          width: 120, height: 40, borderRadius: 8,
          border: "1.5px dashed rgba(255,255,255,0.1)", background: "transparent",
          color: "var(--text-muted)", cursor: "pointer", flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          gap: 6, fontSize: 11, fontWeight: 600, transition: "all 0.2s",
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)"; (e.currentTarget as HTMLElement).style.color = "#818CF8"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Add slide
        </button>
      </div>

      {/* Right: toolbar + preview */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--base)" }}>
        {/* Clean Sub-Toolbar */}
        <div style={{
          height: 46, borderBottom: "1px solid var(--border)", background: "var(--panel)",
          display: "flex", alignItems: "center", padding: "0 16px", gap: 10, flexShrink: 0,
        }}>
          {/* Insert Tools */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={addTextToActive} className="btn-secondary" style={{ padding: "5px 12px", fontSize: 11 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Text
            </button>

            <button
              onClick={() => setShowStickerTray(!showStickerTray)}
              className={showStickerTray ? "btn-primary" : "btn-secondary"}
              style={{ padding: "5px 12px", fontSize: 11 }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              Component
            </button>
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          {/* Canvas Format Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ display: "flex", background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, padding: 2 }}>
              {[
                { id: "1:1", label: "1:1", w: 1080, h: 1080, title: "Square (1080x1080) · IG Post / LinkedIn" },
                { id: "9:16", label: "9:16", w: 1080, h: 1920, title: "Vertical (1080x1920) · Reels / TikTok" },
                { id: "4:5", label: "4:5", w: 1080, h: 1350, title: "Portrait (1080x1350) · IG / LinkedIn" },
                { id: "16:9", label: "16:9", w: 1920, h: 1080, title: "Landscape (1920x1080) · Deck" },
              ].map(fmt => {
                const isCurrent = Math.abs((activeSlide.width / activeSlide.height) - (fmt.w / fmt.h)) < 0.05;
                return (
                  <button
                    key={fmt.id}
                    title={fmt.title}
                    onClick={() => {
                      const updated = slides.map(s => ({
                        ...s, width: fmt.w, height: fmt.h,
                      }));
                      onChange(updated);
                    }}
                    style={{
                      padding: "3px 8px", borderRadius: 6, border: "none",
                      background: isCurrent ? "#FFFFFF" : "transparent",
                      color: isCurrent ? "var(--text-primary)" : "var(--text-muted)",
                      fontWeight: isCurrent ? 700 : 500,
                      boxShadow: isCurrent ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
                      fontSize: 10, cursor: "pointer", transition: "all 0.15s",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {fmt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          {/* Canvas Adjustments */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <label className="btn-secondary" style={{ padding: "5px 10px", fontSize: 11, cursor: "pointer", position: "relative" }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: activeSlide.backgroundColor || "#ffffff", border: "1px solid var(--border)", flexShrink: 0 }} />
              BG
              <input type="color" value={activeSlide.backgroundColor || "#ffffff"}
                onChange={e => updateActiveSlide({ backgroundColor: e.target.value })}
                style={{ position: "absolute", opacity: 0, width: 1, height: 1, pointerEvents: "none" }} />
            </label>

            <button onClick={autoLayoutComponents} className="btn-secondary" style={{ padding: "5px 10px", fontSize: 11 }} title="Auto-align components with balanced spacing">
              Auto-Align
            </button>

            {activeSlide.backgroundUrl && (
              <button
                onClick={() => updateActiveSlide({ showBackdrop: !activeSlide.showBackdrop })}
                className="btn-secondary"
                style={{
                  padding: "5px 10px", fontSize: 11,
                  background: activeSlide.showBackdrop ? "var(--accent-dim)" : "var(--surface)",
                  color: activeSlide.showBackdrop ? "var(--accent)" : "var(--text-secondary)",
                }}
                title="Overlay original slide as alignment reference"
              >
                Ghost Ref
              </button>
            )}
          </div>

          <div style={{ width: 1, height: 16, background: "var(--border)" }} />

          {/* AI / Brand Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={applyBrandKitToAll}
              className="btn-ghost"
              style={{ fontSize: 11, padding: "5px 8px" }}
              title="Apply saved brand kit colors"
            >
              Brand Kit
            </button>

            <button
              onClick={handleGenerateHook}
              disabled={aiGenerating}
              className="btn-ghost"
              style={{ fontSize: 11, padding: "5px 8px", color: "var(--accent)" }}
            >
              {aiGenerating ? "Writing…" : "✦ AI Hook"}
            </button>
          </div>

          <div style={{ marginLeft: "auto", fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            Slide {activeIdx + 1} of {slides.length}
          </div>
        </div>

        {/* Sticker Tray Dropdown / Quick Picker */}
        {showStickerTray && (
          <div style={{
            background: "var(--panel)", borderBottom: "1px solid var(--border)",
            padding: "12px 16px", display: "flex", gap: 12, overflowX: "auto",
            alignItems: "center", zIndex: 20, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 }}>
              Insert Component:
            </span>
            {availableImageAssets.map(asset => {
              const thumb = (asset as any).thumbnail || (asset as any).blobUrl;
              return (
                <div
                  key={asset.id}
                  onClick={() => addStickerElement(asset)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "4px 8px",
                    background: "var(--surface)", border: "1px solid var(--border)",
                    borderRadius: 8, cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--accent-border)"; (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
                >
                  {thumb && (
                    <img src={thumb} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: "contain", background: "#1a1a24" }} />
                  )}
                  <span style={{ fontSize: 11, color: "var(--text-primary)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {asset.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview & Interactive Canvas */}
        <div style={{
          flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", padding: 32,
          background: "radial-gradient(ellipse at 50% 50%, rgba(99,102,241,0.04) 0%, transparent 70%), var(--base)",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }} />
          <div ref={previewRef}
            onClick={e => {
              if (e.target === previewRef.current) {
                onSelectText(null);
                onSelectElement(null);
                setEditingTextId(null);
              }
            }}
            onMouseMove={handlePreviewMouseMove}
            onMouseUp={handlePreviewMouseUp}
            onMouseLeave={handlePreviewMouseUp}
            onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = "copy"; setIsDragOverCanvas(true); }}
            onDragLeave={() => setIsDragOverCanvas(false)}
            onDrop={handleCanvasDrop}
            style={{
              position: "relative",
              aspectRatio: `${slideAspect}`,
              height: "100%",
              maxHeight: "min(620px, calc(100vh - 180px))",
              maxWidth: "100%",
              borderRadius: 12, overflow: "hidden",
              background: activeSlide.backgroundColor || "#ffffff",
              boxShadow: isDragOverCanvas
                ? "0 0 0 3px var(--accent), 0 12px 64px rgba(99,102,241,0.4)"
                : "0 8px 48px rgba(0,0,0,0.7), 0 2px 12px rgba(0,0,0,0.5)",
              border: `1px solid ${isDragOverCanvas ? "var(--accent)" : "rgba(255,255,255,0.08)"}`,
              userSelect: "none",
              transition: "box-shadow 0.15s, border-color 0.15s",
            }}>

            {/* Ghost Reference Layer */}
            {activeSlide.showBackdrop && activeSlide.backgroundUrl && (
              <img src={activeSlide.backgroundUrl} alt="Reference" draggable={false}
                style={{
                  position: "absolute", inset: 0, width: "100%", height: "100%",
                  objectFit: "contain", opacity: 0.22, pointerEvents: "none", zIndex: 1,
                  filter: "grayscale(30%)",
                }} />
            )}

            {/* Graphic / Icon / Sticker Elements (LEGO Blocks) */}
            {elements.map(el => {
              const isSelected = selectedElementId === el.id;
              return (
                <div
                  key={el.id}
                  onMouseDown={e => handleElementMouseDown(e, el.id, el)}
                  onClick={e => { e.stopPropagation(); onSelectElement(el.id); onSelectText(null); }}
                  style={{
                    position: "absolute",
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: `${el.width}%`,
                    transform: `translate(-50%, -50%) rotate(${el.rotation || 0}deg)`,
                    opacity: el.opacity ?? 1,
                    zIndex: isSelected ? 15 : (el.zIndex || 5),
                    cursor: "grab",
                    outline: isSelected ? "2px solid #818CF8" : "none",
                    outlineOffset: 3,
                    boxShadow: isSelected ? "0 4px 20px rgba(99,102,241,0.4)" : "none",
                    borderRadius: 6,
                  }}
                >
                  <img
                    src={el.imageUrl}
                    alt={el.label || "Element"}
                    draggable={false}
                    style={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      pointerEvents: "none",
                    }}
                  />

                  {/* Corner Resize Handle */}
                  {isSelected && (
                    <div
                      onMouseDown={e => handleResizeHandleMouseDown(e, el.id, el)}
                      style={{
                        position: "absolute",
                        right: -6,
                        bottom: -6,
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        background: "#818CF8",
                        border: "2px solid #ffffff",
                        cursor: "nwse-resize",
                        zIndex: 20,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
                      }}
                    />
                  )}
                </div>
              );
            })}

            {/* Live Editable Text Blocks */}
            {texts.map(text => {
              const isSelected = selectedTextId === text.id;
              const isEditing = editingTextId === text.id;
              return (
                <div key={text.id}
                  onMouseDown={e => handleTextMouseDown(e, text.id, text)}
                  onDoubleClick={e => { e.stopPropagation(); setEditingTextId(text.id); onSelectText(text.id); onSelectElement(null); }}
                  onClick={e => { e.stopPropagation(); onSelectText(text.id); onSelectElement(null); }}
                  style={{
                    position: "absolute", left: `${text.x}%`, top: `${text.y}%`,
                    transform: "translate(-50%, -50%)",
                    fontSize: text.fontSize, fontWeight: text.fontWeight,
                    color: text.color || "var(--text-primary)", textAlign: text.align,
                    fontFamily: "Space Grotesk, Inter, sans-serif",
                    lineHeight: 1.2, padding: "3px 6px", borderRadius: 4,
                    minWidth: 32, maxWidth: "88%", wordBreak: "break-word",
                    cursor: isEditing ? "text" : "move", outline: "none",
                    zIndex: isSelected ? 25 : 10,
                    border: `1.5px solid ${isSelected ? "var(--accent)" : "transparent"}`,
                    background: isSelected ? "rgba(78, 108, 242, 0.04)" : "transparent",
                    transition: "border-color 0.12s",
                    boxSizing: "border-box", whiteSpace: "pre-wrap",
                  }}
                  contentEditable={isEditing}
                  suppressContentEditableWarning
                  onBlur={e => { updateText(text.id, { content: e.currentTarget.textContent ?? "" }); setEditingTextId(null); }}
                  onKeyDown={e => {
                    if (e.key === "Escape") { updateText(text.id, { content: (e.target as HTMLElement).textContent ?? "" }); setEditingTextId(null); }
                    if (!isEditing) e.stopPropagation();
                  }}>
                  {text.content}
                </div>
              );
            })}

            {/* Empty Canvas Prompt */}
            {texts.length === 0 && elements.length === 0 && (
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 8, pointerEvents: "none",
              }}>
                <span style={{ fontSize: 28, opacity: 0.3 }}>🧱</span>
                <span style={{ fontSize: 13, color: "rgba(0,0,0,0.4)", fontWeight: 600 }}>Drag LEGO blocks here or click "+ Text"</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
