import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BellRinging, X } from '@phosphor-icons/react';

export interface ProactiveSignalPayload {
  need: string;
  message: string;
  signalId?: string;
}

interface ProactiveToastProps {
  signal: ProactiveSignalPayload | null;
  onDismiss: () => void;
}

export const ProactiveToast: React.FC<ProactiveToastProps> = ({ signal, onDismiss }) => {
  return (
    <AnimatePresence>
      {signal && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-6 right-6 z-50 max-w-md w-full"
        >
          <div className="aurora-glass-card rounded-2xl p-4 flex gap-4 items-start shadow-2xl border border-white/20 dark:border-white/10 relative overflow-hidden group">
            {/* Ambient background glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 pointer-events-none" />
            
            <div className="mt-1 relative z-10 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center relative">
                <div className="absolute inset-0 rounded-full bg-blue-400/20 animate-ping" />
                <BellRinging size={20} weight="fill" className="text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            
            <div className="flex-1 min-w-0 relative z-10">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400 capitalize tracking-wide">
                  {signal.need.replace('_', ' ')}
                </p>
                <button
                  onClick={onDismiss}
                  className="text-[var(--aurora-text-sub)] hover:text-[var(--aurora-text-main)] transition-colors p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10"
                  aria-label="Dismiss"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
              <p className="mt-1 text-sm font-medium text-[var(--aurora-text-main)] leading-relaxed">
                {signal.message}
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
