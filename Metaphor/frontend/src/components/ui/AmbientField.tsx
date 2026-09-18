"use client";

import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";

export type FieldState = "idle" | "resolving" | "focused" | "exploring" | "attention";

interface AmbientFieldProps {
  fieldState?: FieldState;
}

export function AmbientField({ fieldState = "idle" }: AmbientFieldProps) {
  const controls = useAnimation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // React to state changes by animating the ambient field
    switch (fieldState) {
      case "idle":
        controls.start({
          opacity: 0.15,
          scale: 1,
          transition: { duration: 2, ease: "easeInOut" }
        });
        break;
      case "resolving":
        controls.start({
          opacity: 0.3,
          scale: 1.05,
          transition: { duration: 0.8, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }
        });
        break;
      case "focused":
        controls.start({
          opacity: 0.4,
          scale: 0.95,
          transition: { duration: 1.2, ease: "easeOut" }
        });
        break;
      case "exploring":
        controls.start({
          opacity: 0.5,
          scale: 1.1,
          transition: { duration: 3, ease: "linear" }
        });
        break;
      case "attention":
        controls.start({
          opacity: 0.6,
          scale: 1.02,
          transition: { duration: 0.4, ease: "easeOut" }
        });
        break;
    }
  }, [fieldState, controls, mounted]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: "var(--z-background)" }}>
      {/* Base dark canvas or subtle light canvas based on theme */}
      <div className="absolute inset-0 bg-background transition-colors duration-1000" />
      
      {/* The spatial moving elements */}
      <motion.div 
        animate={controls}
        initial={{ opacity: 0 }}
        className="absolute inset-0 flex items-center justify-center mix-blend-screen dark:mix-blend-lighten"
      >
        <div 
          className="w-[60vw] h-[60vw] max-w-[800px] max-h-[800px] rounded-full transition-all duration-1000"
          style={{
            background: "radial-gradient(circle, var(--color-accent) 0%, rgba(79, 70, 229, 0.15) 40%, transparent 70%)",
            opacity: 0.25,
            willChange: "transform, opacity",
          }}
        />
        <div 
          className="absolute w-[40vw] h-[40vw] max-w-[600px] max-h-[600px] translate-x-1/4 -translate-y-1/4 rounded-full transition-all duration-1000"
          style={{
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 65%)",
            willChange: "transform, opacity",
          }}
        />
      </motion.div>
      
      {/* Atmosphere Mask */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
    </div>
  );
}
