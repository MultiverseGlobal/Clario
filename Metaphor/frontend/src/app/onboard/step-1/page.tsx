"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { MetaphorLogo } from "@/components/ui/MetaphorLogo";

export default function OnboardStep1() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("metaphor_onboard_step1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.name) setProjectName(parsed.name);
      }
    } catch {}
  }, []);

  const handleContinue = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = projectName.trim() || "Global Context";

    try {
      sessionStorage.setItem(
        "metaphor_onboard_step1",
        JSON.stringify({ name: finalName })
      );
    } catch {}

    setIsSubmitting(true);
    router.push("/onboard/step-2");
  };

  return (
    <div className="w-full min-h-screen flex flex-col justify-between p-6 md:p-12 max-w-3xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[rgba(10,10,10,0.06)]">
        <div className="flex items-center gap-2.5">
          <MetaphorLogo size={20} />
          <span className="font-display text-[17px] font-medium text-[var(--color-ink)]">
            Metaphor
          </span>
        </div>
        <div className="text-[11px] font-mono tracking-widest uppercase text-[#AEB7BC]">
          Step 1 of 3 &middot; Identity
        </div>
      </div>

      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="my-auto py-12 flex flex-col items-center text-center"
      >
        <span className="text-[11px] font-mono tracking-widest uppercase text-[#AEB7BC] mb-4">
          Project Anchor
        </span>

        <h1
          className="font-display text-[clamp(44px,6vw,68px)] leading-[1.04] tracking-[-0.015em] text-[var(--color-ink)] mb-4"
          style={{ fontWeight: 400 }}
        >
          What are you building?
        </h1>

        <p className="text-[17px] text-[#555E64] max-w-md mb-12 leading-relaxed">
          Name your project or primary workspace to anchor the shared context graph across your tools.
        </p>

        <form onSubmit={handleContinue} className="w-full max-w-md">
          <div className="relative mb-10">
            <input
              type="text"
              autoFocus
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g. Orion, Atlas, Context Engine"
              className="w-full px-0 py-3 bg-transparent border-b text-[24px] text-center text-[var(--color-ink)] placeholder:text-[rgba(10,10,10,0.2)] outline-none transition-colors"
              style={{
                fontFamily: "'Cormorant Garamond', var(--next-font-display), serif",
                fontStyle: "italic",
                borderBottomColor: projectName ? "var(--color-ink)" : "rgba(10,10,10,0.18)",
              }}
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-[var(--color-ink)] text-white hover:bg-black transition-all text-[14px] font-medium shadow-sm hover:translate-y-[-1px] cursor-pointer disabled:opacity-50"
            >
              <span>Continue to Tool Mesh</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </form>
      </motion.div>

      {/* Footer hint */}
      <div className="pt-6 border-t border-[rgba(10,10,10,0.06)] flex items-center justify-between text-[11px] font-mono text-[#AEB7BC]">
        <span>You can rename or partition workspaces later</span>
        <span>Press Enter &rarr;</span>
      </div>
    </div>
  );
}
