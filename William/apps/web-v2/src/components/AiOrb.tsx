"use client";

import React, { useState, useEffect, useRef } from "react";
import type { WebRTCState } from "@/lib/webrtc";

interface AiOrbProps {
  expression?: "idle" | "listening" | "happy" | "thinking";
  connectionState?: WebRTCState;
  remoteStream?: MediaStream | null;
  onClick?: () => void;
}

export const AiOrb: React.FC<AiOrbProps> = ({
  expression = "idle",
  connectionState = "disconnected",
  remoteStream,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Play remote stream when connected
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch(e => console.error("Audio playback error:", e));
    }
  }, [remoteStream]);

  // Determine current effective expression (WebRTC state overrides idle)
  const currentExpression =
    connectionState === "connecting" ? "thinking" :
    connectionState === "connected" && expression === "idle" ? "listening" : 
    expression;

  const renderFace = () => {
    switch (currentExpression) {
      case "listening":
        return (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3 bg-stone-800 rounded-full animate-bounce" />
            <span className="w-1.5 h-3 bg-stone-800 rounded-full animate-bounce delay-100" />
          </div>
        );
      case "happy":
        return (
          <div className="flex items-center gap-2 text-stone-800 font-bold text-sm">
            <span>^</span>
            <span>^</span>
          </div>
        );
      case "thinking":
        return (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-stone-800 rounded-full animate-ping" />
            <span className="w-1.5 h-1.5 bg-stone-800 rounded-full animate-ping delay-150" />
          </div>
        );
      case "idle":
      default:
        return (
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-3 bg-stone-800/80 rounded-full transition-transform duration-200" />
            <span className="w-1.5 h-3 bg-stone-800/80 rounded-full transition-transform duration-200" />
          </div>
        );
    }
  };

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex items-center justify-center cursor-pointer group ${
        connectionState === "error" ? "opacity-50" : ""
      }`}
    >
      <audio ref={audioRef} className="hidden" />

      {/* Outer Rotating Glowing Aura */}
      {connectionState === "connected" ? (
        <div className="absolute -inset-8 rounded-full bg-amber-400/20 blur-2xl animate-pulse" />
      ) : (
        <div className="aurora-orb-aura" />
      )}

      {/* Ripple Rings */}
      <div className={`absolute inset-0 rounded-full border ${connectionState === 'connected' ? 'border-amber-300/50' : 'border-pink-300/40'} animate-ping opacity-25`} />
      <div className={`absolute -inset-4 rounded-full border ${connectionState === 'connected' ? 'border-amber-400/40' : 'border-purple-300/30'} animate-pulse`} />

      {/* Core Glowing Orb */}
      <div
        className={`w-28 h-28 md:w-36 md:h-36 flex items-center justify-center z-10 transition-transform duration-300 ${
          isHovered || connectionState === 'connected' ? "scale-110" : "scale-100"
        } ${connectionState === 'connected' ? 'bg-gradient-to-tr from-amber-200 to-yellow-100 shadow-[0_0_40px_rgba(251,191,36,0.6)] rounded-full' : 'aurora-orb'}`}
      >
        {/* Soft highlight overlay */}
        <div className="absolute top-3 left-4 w-8 h-8 rounded-full bg-white/50 blur-sm pointer-events-none" />

        {/* Expressive Face Elements */}
        <div className="z-20 transition-all duration-300 transform group-hover:scale-110">
          {renderFace()}
        </div>
      </div>
    </div>
  );
};
