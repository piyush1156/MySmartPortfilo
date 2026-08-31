"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface BootSequenceProps {
  onComplete: () => void;
}

const BOOT_LINES = [
  "Loading kernel...",
  "Initializing display driver...",
  "Mounting filesystems...",
  "Starting network services...",
  "Loading workspace...",
  "Welcome to PiyushOS",
];

export default function BootSequence({ onComplete }: BootSequenceProps) {
  const [visibleLines, setVisibleLines] = useState<number>(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Show lines sequentially
    const lineInterval = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev >= BOOT_LINES.length) {
          clearInterval(lineInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 350);

    // Animate progress bar
    const start = performance.now();
    const duration = 2500;
    const animate = (now: number) => {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      setProgress(p);
      if (p < 1) {
        requestAnimationFrame(animate);
      } else {
        setTimeout(onComplete, 400);
      }
    };
    const raf = requestAnimationFrame(animate);

    return () => {
      clearInterval(lineInterval);
      cancelAnimationFrame(raf);
    };
  }, [onComplete]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-[#020617]">
      <div className="w-[480px] space-y-8">
        {/* Apple logo */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-white/70 text-5xl"
        >
          &#63743;
        </motion.div>

        {/* Progress bar */}
        <div className="w-full h-[3px] bg-white/[0.08] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-white/60 rounded-full"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Boot text */}
        <div className="font-mono text-[11px] text-white/25 space-y-1 min-h-[100px]">
          {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: i === visibleLines - 1 ? 0.6 : 0.2, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <span className="text-emerald-500/40 mr-2">&gt;</span>
              {line}
              {i === visibleLines - 1 && i < BOOT_LINES.length - 1 && (
                <span className="inline-block w-1.5 h-3 bg-white/40 ml-0.5 animate-pulse" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
