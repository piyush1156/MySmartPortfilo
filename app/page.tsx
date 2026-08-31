"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MacBookScene from "@/components/macbook/MacBookScene";
import BootSequence from "@/components/macbook/BootSequence";
import Desktop from "@/components/desktop/Desktop";
import { Command } from "@/lib/commands";
import { VisitorProfile } from "@/lib/visitor";

type ExperiencePhase =
  | "closed"
  | "opening"
  | "screen-on"
  | "booting"
  | "desktop";

export default function Home() {
  const [phase, setPhase] = useState<ExperiencePhase>("closed");
  const [visitor, setVisitor] = useState<VisitorProfile | null>(null);
  const [showSkipButton, setShowSkipButton] = useState(false);
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Cinematic phase sequence ──────────────────────────────────────────
  // closed → (1.2s pause) → opening → (lid opens ~2.5s) → screen-on →
  // (1s glow) → booting → (2.5s boot) → desktop
  useEffect(() => {
    // Phase 1: Show closed laptop briefly before opening
    const t1 = setTimeout(() => setPhase("opening"), 1200);
    return () => clearTimeout(t1);
  }, []);

  const handleLidOpenComplete = useCallback(() => {
    setPhase("screen-on");
    const t = setTimeout(() => setPhase("booting"), 800);
    phaseTimerRef.current = t;
  }, []);

  const handleBootComplete = useCallback(() => {
    setPhase("desktop");
  }, []);

  // Show skip button after a few seconds
  useEffect(() => {
    const t = setTimeout(() => setShowSkipButton(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Safety fallback: if 3D scene stalls (GPU issues), auto-skip to desktop
  useEffect(() => {
    if (phase === "desktop") return;
    const safety = setTimeout(() => {
      setPhase("desktop");
    }, 10000);
    return () => clearTimeout(safety);
  }, [phase]);

  const handleSkip = useCallback(() => {
    if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    setPhase("desktop");
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (phaseTimerRef.current) clearTimeout(phaseTimerRef.current);
    };
  }, []);

  const handleCommand = useCallback((_command: Command) => {
    // Commands are handled inside the Desktop component
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050508]">
      <AnimatePresence mode="wait">
        {/* ── 3D MacBook Scene ──────────────────────────────────────── */}
        {(phase === "closed" || phase === "opening" || phase === "screen-on") && (
          <motion.div
            key="macbook"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <MacBookScene
              phase={phase}
              onLidOpenComplete={handleLidOpenComplete}
            />
          </motion.div>
        )}

        {/* ── Boot Sequence ─────────────────────────────────────────── */}
        {phase === "booting" && (
          <motion.div
            key="boot"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0"
          >
            <BootSequence onComplete={handleBootComplete} />
          </motion.div>
        )}

        {/* ── Desktop ───────────────────────────────────────────────── */}
        {phase === "desktop" && (
          <motion.div
            key="desktop"
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Desktop visitor={visitor} onCommand={handleCommand} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skip Button ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSkipButton && phase !== "desktop" && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            onClick={handleSkip}
            className="absolute top-5 right-5 z-[100] px-4 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-[11px] text-white/30 hover:text-white/60 transition-all duration-300 backdrop-blur-sm font-mono tracking-wide"
          >
            Skip Intro →
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
