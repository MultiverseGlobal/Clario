import { motion } from "framer-motion";
import { AtlasIcon } from "@/components/atlas/EcosystemIcons";
import { useEffect, useState } from "react";

export function PageLoader() {
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  useEffect(() => {
    const hasLoaded = sessionStorage.getItem('has_loaded_main_app');
    if (hasLoaded) {
      setIsFirstLoad(false);
    } else {
      sessionStorage.setItem('has_loaded_main_app', 'true');
    }
  }, []);

  const delayMultiplier = isFirstLoad ? 1 : 0;
  const durationMultiplier = isFirstLoad ? 1 : 0.2;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-8 overflow-hidden relative">
      {/* Absolute Ambient Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{ duration: 4 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
          className="w-96 h-96 bg-foreground/5 rounded-full blur-3xl"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: isFirstLoad ? 20 : 0, filter: isFirstLoad ? "blur(10px)" : "blur(0px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ duration: 1 * durationMultiplier, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex flex-col items-center justify-center z-10"
      >
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Orbital rings */}
          {[...Array(3)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute inset-0 rounded-full border border-foreground/10"
              style={{
                borderTopColor: i === 0 ? "hsl(var(--foreground) / 0.5)" : "transparent",
                borderRightColor: i === 1 ? "hsl(var(--foreground) / 0.4)" : "transparent",
                borderBottomColor: i === 2 ? "hsl(var(--foreground) / 0.3)" : "transparent",
              }}
              animate={{ rotate: 360 }}
              transition={{
                duration: (3 + i * 2) * (isFirstLoad ? 1 : 0.5),
                repeat: Infinity,
                ease: "linear",
                direction: i % 2 === 0 ? "normal" : "reverse",
              }}
            />
          ))}
          
          {/* Pulsing Core */}
          <motion.div
            animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2 * durationMultiplier, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-2 rounded-full bg-foreground/5 blur-md"
          />

          {/* Solid Container with Icon */}
          <motion.div 
            initial={{ scale: isFirstLoad ? 0 : 1 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 * delayMultiplier, type: "spring", stiffness: 200, damping: 20 }}
            className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-background border border-foreground/20 shadow-2xl overflow-hidden"
          >
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 10 * (isFirstLoad ? 1 : 0.5), repeat: Infinity, ease: "linear" }}
              className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0_340deg,hsl(var(--foreground)/0.2)_360deg)]"
            />
            <div className="absolute inset-[1px] rounded-xl bg-background flex items-center justify-center">
              <AtlasIcon className="h-5 w-5 text-foreground drop-shadow-md" />
            </div>
          </motion.div>
        </div>

        {/* Loading Text Sequence */}
        <motion.div
          initial={{ opacity: isFirstLoad ? 0 : 1 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 * delayMultiplier, duration: 1 * durationMultiplier }}
          className="mt-8 flex flex-col items-center gap-3"
        >
          {/* Progress Bar */}
          <div className="w-32 h-0.5 bg-foreground/10 rounded-full overflow-hidden relative">
            <motion.div
              animate={{
                x: ["-100%", "200%"],
              }}
              transition={{
                duration: 1.5 * durationMultiplier,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute inset-y-0 left-0 w-1/2 bg-foreground/50 rounded-full"
            />
          </div>

          <div className="flex items-center gap-2 text-muted-foreground font-mono text-[10px] tracking-[0.2em] uppercase">
            <span>Initializing Workspace</span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5 * durationMultiplier, repeat: Infinity, ease: "linear" }}
              className="w-1.5 h-1.5 rounded-full bg-foreground/40"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
