import React from 'react';
import { motion } from 'framer-motion';

interface MetaphorLogoProps {
  className?: string;
  size?: number;
}

export function MetaphorLogo({ className = "", size = 24 }: MetaphorLogoProps) {
  // The Lens (◎) Concept
  // Raw information enters. Clear understanding leaves.
  
  return (
    <div 
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Outer Ring - Represents raw information / the context window */}
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute inset-0 text-foreground"
      >
        <motion.circle 
          cx="12" 
          cy="12" 
          r="9" 
          stroke="currentColor" 
          strokeWidth="2"
          initial={{ strokeDasharray: "0 100" }}
          animate={{ strokeDasharray: "100 100" }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </motion.svg>

      {/* Inner Core - Represents clear understanding / focus */}
      <motion.div
        className="bg-foreground rounded-full"
        style={{ width: size * 0.33, height: size * 0.33 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
      />
    </div>
  );
}
