"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface MacBookSceneProps {
  phase: "closed" | "opening" | "screen-on" | "booting" | "desktop";
  onLidOpenComplete: () => void;
}

export default function MacBookScene({ phase, onLidOpenComplete }: MacBookSceneProps) {
  const [lidAngle, setLidAngle] = useState(0); // 0 = closed, 110 = fully open
  const animFrame = useRef<number | null>(null);

  useEffect(() => {
    if (phase === "opening") {
      const start = performance.now();
      const duration = 2000; // 2s to open
      const animate = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        setLidAngle(eased * 110);
        if (progress < 1) {
          animFrame.current = requestAnimationFrame(animate);
        } else {
          onLidOpenComplete();
        }
      };
      animFrame.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
    };
  }, [phase, onLidOpenComplete]);

  const screenGlow =
    phase === "screen-on" || phase === "booting"
      ? 0.9
      : phase === "desktop"
      ? 0.6
      : 0;

  return (
    <div className="w-full h-full flex items-center justify-center perspective-[1200px]">
      <div className="relative w-[520px] h-[380px]">
        {/* ── Base (bottom half) ──────────────────────────── */}
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[460px] h-[12px] rounded-b-2xl"
          style={{
            background: "linear-gradient(180deg, #c0c0c4 0%, #a8a8ac 40%, #8e8e92 100%)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.25)",
          }}
        />
        {/* Keyboard surface */}
        <div
          className="absolute bottom-[12px] left-1/2 -translate-x-1/2 w-[440px] h-[260px] rounded-t-sm overflow-hidden"
          style={{
            background: "linear-gradient(180deg, #2a2a2e 0%, #1f1f22 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          {/* Keyboard grid */}
          <div className="p-3 pt-2 grid grid-cols-12 gap-[3px] opacity-40">
            {Array.from({ length: 48 }).map((_, i) => (
              <div
                key={i}
                className="h-[7px] rounded-[2px]"
                style={{
                  background:
                    i === 45
                      ? "linear-gradient(90deg, #3a3a3e, #2e2e32)"
                      : "linear-gradient(180deg, #35353a, #2a2a2e)",
                  gridColumn: i === 47 ? "span 3" : undefined,
                }}
              />
            ))}
          </div>
          {/* Trackpad */}
          <div className="mx-auto w-[140px] h-[80px] rounded-md border border-white/[0.04] bg-white/[0.02]" />
        </div>

        {/* ── Lid (top half, rotates from bottom edge) ────── */}
        <div
          className="absolute bottom-[272px] left-1/2 -translate-x-1/2"
          style={{
            transformOrigin: "center bottom",
            transform: `rotateX(${-lidAngle}deg)`,
            perspective: "1200px",
          }}
        >
          {/* Lid back */}
          <div
            className="absolute top-[-248px] left-1/2 -translate-x-1/2 w-[460px] h-[250px] rounded-t-2xl"
            style={{
              background: "linear-gradient(180deg, #d0d0d4 0%, #b8b8bc 50%, #a0a0a4 100%)",
              boxShadow:
                "0 -4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
            }}
          >
            {/* Apple logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/30 text-3xl">
             
            </div>
          </div>

          {/* Screen bezel */}
          <div
            className="absolute top-[-242px] left-1/2 -translate-x-1/2 w-[430px] h-[238px] rounded-t-xl overflow-hidden"
            style={{
              background: "#111",
              boxShadow: "inset 0 0 0 6px #1a1a1a",
            }}
          >
            {/* Screen content */}
            <div
              className="w-full h-full relative transition-opacity duration-700"
              style={{ opacity: screenGlow }}
            >
              {/* Screen glow */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    phase === "screen-on"
                      ? "radial-gradient(ellipse at center, #1a1a2e 0%, #0a0a14 70%)"
                      : phase === "booting"
                      ? "radial-gradient(ellipse at center, #0f172a 0%, #020617 70%)"
                      : "radial-gradient(ellipse at center, #1e293b 0%, #0f172a 100%)",
                }}
              />

              {/* Scanline effect */}
              {phase === "screen-on" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.15, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)",
                  }}
                />
              )}

              {/* Apple logo during screen-on */}
              {phase === "screen-on" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/80 text-5xl font-light"
                >
                  &#63743;
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* ── Surface reflection ──────────────────────────── */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-[500px] h-[30px] rounded-[50%]"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,255,255,0.06) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}
