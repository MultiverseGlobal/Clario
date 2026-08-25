'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [stage, setStage] = useState<'intro' | 'fadeout' | 'done'>('intro');

  useEffect(() => {
    const timer1 = setTimeout(() => {
      setStage('fadeout');
    }, 2200);

    const timer2 = setTimeout(() => {
      setStage('done');
      if (onFinish) onFinish();
    }, 2800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  if (stage === 'done') return null;

  return (
    <AnimatePresence>
      {true && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: stage === 'fadeout' ? 0 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: '#000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {/* Natural AI / William Signature Emblem */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              position: 'relative',
              zIndex: 2
            }}
          >
            {/* Minimalist Organic Neural Loop Mark */}
            <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="64" height="64" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="36" cy="36" r="34" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                <motion.path
                  d="M24 44C24 33 48 33 48 24C48 18 36 18 36 28C36 48 48 48 48 44"
                  stroke="#ffffff"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                />
              </svg>
            </div>

            {/* Wordmark */}
            <div style={{ textAlign: 'center' }}>
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1.0, ease: 'easeOut', delay: 0.1 }}
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 400,
                  fontFamily: 'var(--font-sans), system-ui, -apple-system, sans-serif',
                  color: '#ffffff',
                  margin: 0,
                  letterSpacing: '0.02em'
                }}
              >
                William
              </motion.h1>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
