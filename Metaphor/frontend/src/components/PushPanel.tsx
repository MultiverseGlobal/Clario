import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, ChevronRight, X } from 'lucide-react';

interface PushPanelProps {
  selectedNodes: any[];
  onPush: (model: string) => void;
  onClose: () => void;
}

export function PushPanel({ selectedNodes, onPush, onClose }: PushPanelProps) {
  const [model, setModel] = useState('gemini-1.5-pro');
  const isOpen = selectedNodes.length > 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="absolute right-0 top-0 bottom-0 w-80 bg-surface-1/80 backdrop-blur-xl border-l border-border-strong z-50 flex flex-col shadow-2xl"
        >
          <div className="p-6 border-b border-border-strong flex items-center justify-between">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles size={18} className="text-primary" />
              Push Protocol
            </h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 block">
                Assembled Context ({selectedNodes.length})
              </label>
              <div className="space-y-3">
                {selectedNodes.map((node) => (
                  <div key={node.id} className="p-3 bg-surface-2 rounded-lg border border-border-strong">
                    <div className="text-sm font-medium text-foreground mb-1">{node.data.label}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{node.data.summary}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 block">
                Model Engine
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full bg-surface-2 border border-border-strong rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
              </select>
            </div>
          </div>

          <div className="p-6 border-t border-border-strong bg-surface-1/90 backdrop-blur-md">
            <button
              onClick={() => onPush(model)}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20"
            >
              <Send size={18} />
              Push Context
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
