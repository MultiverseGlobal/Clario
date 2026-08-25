import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const SplashScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Keep splash screen visible for a minimum of 2.5 seconds to establish the aesthetic
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 1500); // Allow fade out animation to finish
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#000000',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          {/* Ambient Glow behind the logo */}
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              width: '400px',
              height: '400px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 60%)',
              filter: 'blur(40px)',
            }}
          />
          
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 2, delay: 0.5, ease: 'easeOut' }}
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '2.5rem',
              fontWeight: 400,
              color: '#ffffff',
              letterSpacing: '0.05em',
              zIndex: 1,
            }}
          >
            William
          </motion.h1>
          
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ duration: 2, delay: 1.5, ease: 'easeOut' }}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              fontWeight: 300,
              color: '#a1a1aa',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginTop: '16px',
              zIndex: 1,
            }}
          >
            Cognitive Workspace
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
