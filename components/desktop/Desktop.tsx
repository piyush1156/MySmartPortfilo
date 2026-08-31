"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Command, AppName } from "@/lib/commands";
import { VisitorProfile } from "@/lib/visitor";
import { profile } from "@/data/profile";
import { skillCategories, SkillCategory } from "@/data/skills";
import { projects } from "@/data/projects";
import { experience } from "@/data/experience";

interface DesktopProps {
  visitor: VisitorProfile | null;
  onCommand: (command: Command) => void;
}

type WindowState = {
  id: string;
  app: AppName;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  zIndex: number;
};

const DOCK_APPS: { name: AppName; icon: string; label: string; color: string }[] = [
  { name: "assistant", icon: "🤖", label: "ARIA", color: "from-blue-500 to-indigo-600" },
  { name: "about", icon: "👤", label: "About", color: "from-amber-500 to-orange-600" },
  { name: "projects", icon: "📁", label: "Projects", color: "from-emerald-500 to-teal-600" },
  { name: "skills", icon: "⚡", label: "Skills", color: "from-violet-500 to-purple-600" },
  { name: "experience", icon: "💼", label: "Experience", color: "from-cyan-500 to-blue-600" },
  { name: "resume", icon: "📄", label: "Resume", color: "from-rose-500 to-pink-600" },
  { name: "contact", icon: "✉️", label: "Contact", color: "from-yellow-500 to-amber-600" },
  { name: "services", icon: "🎯", label: "Services", color: "from-fuchsia-500 to-purple-600" },
  { name: "terminal", icon: "💻", label: "Terminal", color: "from-gray-500 to-slate-700" },
];

let globalZIndex = 20;

export default function Desktop({ visitor, onCommand }: DesktopProps) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ winId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const openApp = useCallback(
    (app: AppName) => {
      setWindows((prev) => {
        const existing = prev.find((w) => w.app === app && !w.minimized);
        if (existing) {
          globalZIndex++;
          return prev.map((w) =>
            w.app === app ? { ...w, minimized: false, zIndex: globalZIndex } : w
          );
        }
        // Check if minimized
        const minimized = prev.find((w) => w.app === app && w.minimized);
        if (minimized) {
          globalZIndex++;
          return prev.map((w) =>
            w.app === app ? { ...w, minimized: false, zIndex: globalZIndex } : w
          );
        }
        globalZIndex++;
        const offsetX = (prev.length % 5) * 30;
        const offsetY = (prev.length % 5) * 30;
        return [
          ...prev,
          {
            id: `${app}-${Date.now()}`,
            app,
            minimized: false,
            maximized: false,
            x: 15 + offsetX,
            y: 8 + offsetY,
            zIndex: globalZIndex,
          },
        ];
      });
      onCommand({ type: "OPEN_APP", app });
    },
    [onCommand]
  );

  const closeApp = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const focusWindow = useCallback((id: string) => {
    globalZIndex++;
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, zIndex: globalZIndex } : w))
    );
  }, []);

  const toggleMinimize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, minimized: !w.minimized } : w))
    );
  }, []);

  const toggleMaximize = useCallback((id: string) => {
    setWindows((prev) =>
      prev.map((w) => (w.id === id ? { ...w, maximized: !w.maximized } : w))
    );
  }, []);

  // ── Window dragging ──────────────────────────────────────────────────
  const handleDragStart = useCallback(
    (e: React.MouseEvent, winId: string) => {
      e.preventDefault();
      const win = windows.find((w) => w.id === winId);
      if (!win || win.maximized) return;
      focusWindow(winId);
      dragRef.current = {
        winId,
        startX: e.clientX,
        startY: e.clientY,
        origX: win.x,
        origY: win.y,
      };
    },
    [windows, focusWindow]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setWindows((prev) =>
        prev.map((w) =>
          w.id === dragRef.current!.winId
            ? {
                ...w,
                x: Math.max(0, Math.min(90, dragRef.current!.origX + (dx / window.innerWidth) * 100)),
                y: Math.max(0, Math.min(85, dragRef.current!.origY + (dy / window.innerHeight) * 100)),
              }
            : w
        )
      );
    };
    const handleMouseUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = (e.target as HTMLFormElement).querySelector("input") as HTMLInputElement;
    if (!input || !input.value.trim() || chatLoading) return;
    const userMsg = input.value.trim();
    input.value = "";
    setChatMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsg,
          visitor: visitor || { name: "Guest", role: "explorer", interests: [] },
          history: chatMessages.slice(-10),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setChatMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: "Sorry, I'm having trouble connecting. Try again!" },
      ]);
    }
    setChatLoading(false);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const activeWindows = windows.filter((w) => !w.minimized);

  return (
    <div className="w-full h-full bg-[#0a0a14] overflow-hidden relative select-none">
      {/* ── Desktop background ────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 30% 40%, rgba(88,28,135,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 60%, rgba(30,64,175,0.1) 0%, transparent 60%), radial-gradient(ellipse at 50% 50%, #0a0a14 0%, #050508 100%)",
        }}
      />

      {/* ── Floating particles ────────────────────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {useMemo(
          () =>
            Array.from({ length: 12 }).map((_, i) => ({
              id: i,
              x: Math.random() * 100,
              y: Math.random() * 100,
              size: 1 + Math.random() * 2,
              duration: 15 + Math.random() * 20,
              delay: Math.random() * 10,
            })),
          []
        ).map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full bg-white/[0.06]"
            style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.03, 0.08, 0.03],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* ── Desktop stats widget ──────────────────────────── */}
      <div className="absolute top-5 right-5 z-[5]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 w-48"
        >
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Quick Stats</p>
          <div className="space-y-2">
            {[
              { label: "Experience", value: `${experience.stats.yearsExperience}+ yrs` },
              { label: "Projects", value: `${experience.stats.projectsCompleted}` },
              { label: "Tech Stack", value: `${experience.stats.technologiesUsed}+` },
              { label: "Problems Solved", value: `${experience.stats.problemsSolved}+` },
            ].map((s) => (
              <div key={s.label} className="flex justify-between items-center">
                <span className="text-[10px] text-white/30">{s.label}</span>
                <span className="text-[11px] font-medium text-white/60">{s.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ── Menu bar ──────────────────────────────────────── */}
      <MenuBar
        activeApp={activeWindows.length > 0 ? activeWindows[activeWindows.length - 1]?.app : null}
      />

      {/* ── Windows ───────────────────────────────────────── */}
      <div className="relative z-10 w-full h-[calc(100%-5.5rem)]">
        <AnimatePresence>
          {activeWindows.map((win) => (
            <motion.div
              key={win.id}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ duration: 0.2 }}
              className={`absolute ${
                win.maximized ? "inset-0" : ""
              }`}
              style={
                win.maximized
                  ? { zIndex: win.zIndex }
                  : {
                      left: `${win.x}%`,
                      top: `${win.y}%`,
                      width: "55%",
                      height: "72%",
                      zIndex: win.zIndex,
                    }
              }
              onMouseDown={() => focusWindow(win.id)}
            >
              <div className="w-full h-full bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/40 flex flex-col">
                {/* Title bar */}
                <div
                  className="h-9 bg-white/[0.04] border-b border-white/[0.06] flex items-center px-3 shrink-0 cursor-default"
                  onMouseDown={(e) => handleDragStart(e, win.id)}
                >
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => closeApp(win.id)}
                      className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-500 transition-colors"
                    />
                    <button
                      onClick={() => toggleMinimize(win.id)}
                      className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-500 transition-colors"
                    />
                    <button
                      onClick={() => toggleMaximize(win.id)}
                      className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-500 transition-colors"
                    />
                  </div>
                  <span className="flex-1 text-center text-[11px] text-white/40 font-medium">
                    {DOCK_APPS.find((a) => a.name === win.app)?.label || win.app}
                  </span>
                </div>
                {/* Content */}
                <div className="flex-1 overflow-auto">
                  <WindowContent app={win.app} onOpenApp={openApp} />
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Dock ──────────────────────────────────────────── */}
      <Dock
        apps={DOCK_APPS}
        openApps={windows.map((w) => w.app)}
        onOpenApp={openApp}
      />

      {/* ── Floating ARIA prompt ──────────────────────────── */}
      {!windows.some((w) => w.app === "assistant") && chatMessages.length === 0 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          onClick={() => openApp("assistant")}
          className="absolute bottom-24 right-6 z-40 flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] rounded-full backdrop-blur-xl transition-all duration-300 group"
        >
          <span className="text-lg">🤖</span>
          <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
            Chat with ARIA
          </span>
        </motion.button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Menu Bar
   ═══════════════════════════════════════════════════════════════════════════ */
function MenuBar({ activeApp }: { activeApp: AppName | null }) {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative z-50 h-8 bg-black/60 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 text-[11px] text-white/70">
      <span className="font-semibold text-white/90 mr-5 text-[13px]">&#63743;</span>
      {activeApp && (
        <span className="font-medium text-white/80 mr-5">
          {DOCK_APPS.find((a) => a.name === activeApp)?.label || activeApp}
        </span>
      )}
      <span className="text-white/35 hover:text-white/50 cursor-default transition-colors">File</span>
      <span className="ml-4 text-white/35 hover:text-white/50 cursor-default transition-colors">Edit</span>
      <span className="ml-4 text-white/35 hover:text-white/50 cursor-default transition-colors">View</span>
      <span className="ml-4 text-white/35 hover:text-white/50 cursor-default transition-colors">Help</span>
      <div className="flex-1" />
      <div className="flex items-center gap-3 text-white/40">
        <span className="flex items-center gap-1">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/></svg>
        </span>
        <span className="font-mono text-[10px]">{time}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Dock with macOS-style magnification
   ═══════════════════════════════════════════════════════════════════════════ */
function Dock({
  apps,
  openApps,
  onOpenApp,
}: {
  apps: typeof DOCK_APPS;
  openApps: AppName[];
  onOpenApp: (app: AppName) => void;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  const getScale = (idx: number) => {
    if (hoveredIdx === null) return 1;
    const dist = Math.abs(idx - hoveredIdx);
    if (dist === 0) return 1.4;
    if (dist === 1) return 1.2;
    if (dist === 2) return 1.08;
    return 1;
  };

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50">
      <div
        ref={dockRef}
        className="flex items-end gap-0.5 bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-2xl px-2 py-1.5"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {apps.map((app, idx) => {
          const isOpen = openApps.includes(app.name);
          const scale = getScale(idx);
          return (
            <button
              key={app.name}
              onClick={() => onOpenApp(app.name)}
              onMouseEnter={() => setHoveredIdx(idx)}
              className="group relative flex flex-col items-center"
              style={{
                transform: `scale(${scale}) translateY(${-(scale - 1) * 8}px)`,
                transition: "transform 0.15s ease-out",
                margin: "0 1px",
              }}
            >
              <div
                className={`w-11 h-11 rounded-[10px] flex items-center justify-center text-xl transition-shadow duration-200 ${
                  isOpen
                    ? "shadow-lg shadow-white/[0.05]"
                    : "group-hover:shadow-lg group-hover:shadow-white/[0.05]"
                }`}
                style={{
                  background: `linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))`,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {app.icon}
              </div>
              {isOpen && (
                <div className="w-1 h-1 rounded-full bg-white/50 mt-1" />
              )}
              <span className="absolute -top-8 px-2 py-0.5 bg-black/90 border border-white/[0.1] rounded-md text-[10px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {app.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Window Content Renderer
   ═══════════════════════════════════════════════════════════════════════════ */
function WindowContent({
  app,
  onOpenApp,
}: {
  app: AppName;
  onOpenApp: (app: AppName) => void;
}) {
  switch (app) {
    case "about":
      return <AboutPanel />;
    case "projects":
      return <ProjectsPanel />;
    case "skills":
      return <SkillsPanel />;
    case "experience":
      return <ExperiencePanel />;
    case "resume":
      return <ResumePanel />;
    case "contact":
      return <ContactPanel />;
    case "services":
      return <ServicesPanel />;
    case "terminal":
      return <TerminalPanel onOpenApp={onOpenApp} />;
    case "assistant":
      return null;
    default:
      return <div className="p-6 text-white/30 text-sm">Coming soon…</div>;
  }
}

/* ── About ──────────────────────────────────────────────────────────── */
function AboutPanel() {
  const [activeTab, setActiveTab] = useState<"bio" | "education" | "awards">("bio");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-5 pb-0">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-amber-500/20">
              P
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-[#12121a] flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-white/90">{profile.fullName}</h2>
            <p className="text-sm text-white/50">{profile.role}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-emerald-400/70">Available for hire</span>
            </div>
          </div>
        </div>
        <p className="text-xs text-white/40 leading-relaxed mb-4">{profile.bio}</p>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.03] p-0.5 rounded-lg">
          {(["bio", "education", "awards"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-3 py-1.5 rounded-md text-[10px] font-medium capitalize transition-all ${
                activeTab === tab
                  ? "bg-white/[0.08] text-white/80"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto p-5 pt-3">
        {activeTab === "bio" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <InfoCard label="GitHub" value={profile.github} href={profile.github} icon="🐙" />
              <InfoCard label="LinkedIn" value={profile.linkedin} href={profile.linkedin} icon="💼" />
              <InfoCard label="Email" value={profile.email} href={`mailto:${profile.email}`} icon="✉️" />
              <InfoCard label="Phone" value={profile.phone} href={`tel:${profile.phone}`} icon="📱" />
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
              <p className="text-[10px] text-white/30 mb-1">Strengths</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.strengths.map((s) => (
                  <span key={s} className="px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-md text-[10px] text-amber-400/70">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "education" && (
          <div className="space-y-3">
            {profile.education.map((edu, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
              >
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-xs font-semibold text-white/80">{edu.degree}</h3>
                  <span className="text-[9px] text-white/25 shrink-0">{edu.year}</span>
                </div>
                <p className="text-[10px] text-white/40 mb-2">{edu.institution}</p>
                <div className="flex flex-wrap gap-1">
                  {edu.highlights.map((h) => (
                    <span key={h} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/30">
                      {h}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === "awards" && (
          <div className="space-y-3">
            {profile.honours.map((h, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5">🏆</span>
                  <div>
                    <h3 className="text-xs font-semibold text-white/80">{h.title}</h3>
                    <p className="text-[10px] text-white/40 mt-0.5">{h.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <h3 className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Certifications</h3>
              <div className="space-y-1.5">
                {profile.certifications.map((c, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-white/40">
                    <span className="text-emerald-400/50 mt-0.5">✓</span>
                    {c}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Projects ───────────────────────────────────────────────────────── */
function ProjectsPanel() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set(projects.map((p) => p.category));
    return ["all", ...Array.from(cats)];
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => p.category === filter)),
    [filter]
  );

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-2">
        {/* Category filter */}
        <div className="flex gap-1 bg-white/[0.03] p-0.5 rounded-lg">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-medium capitalize transition-all ${
                filter === cat
                  ? "bg-white/[0.08] text-white/80"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 pt-2 space-y-2">
        {filtered.map((p) => {
          const isExpanded = expandedId === p.id;
          return (
            <motion.div
              key={p.id}
              layout
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : p.id)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-white/[0.06] to-white/[0.02] border border-white/[0.06] flex items-center justify-center text-lg shrink-0">
                    {p.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-white/90">{p.name}</h3>
                      <span className="px-1.5 py-0.5 bg-white/[0.05] rounded text-[9px] text-white/30 capitalize">
                        {p.category}
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mt-0.5">{p.shortDescription}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.technologies.slice(0, 4).map((t) => (
                        <span key={t} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/30">
                          {t}
                        </span>
                      ))}
                      {p.technologies.length > 4 && (
                        <span className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/20">
                          +{p.technologies.length - 4}
                        </span>
                      )}
                    </div>
                  </div>
                  <motion.svg
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    className="w-4 h-4 text-white/20 shrink-0 mt-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </motion.svg>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
                      <Section title="Description" content={p.description} />
                      <Section title="Problem" content={p.problem} />
                      <Section title="Solution" content={p.solution} />
                      <Section title="Architecture" content={p.architecture} />
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Features</p>
                        <div className="space-y-1">
                          {p.features.map((f, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-[10px] text-white/40">
                              <span className="text-blue-400/40 mt-0.5">•</span>
                              {f}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-1">
                        {p.liveDemo && (
                          <a
                            href={p.liveDemo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-[10px] text-blue-400/70 hover:text-blue-400 transition-all"
                          >
                            Live Demo →
                          </a>
                        )}
                        {p.github && (
                          <a
                            href={p.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-[10px] text-white/40 hover:text-white/60 transition-all"
                          >
                            GitHub →
                          </a>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Skills ─────────────────────────────────────────────────────────── */
function SkillsPanel() {
  const [activeCategory, setActiveCategory] = useState<string>(skillCategories[0]?.name || "");

  const currentCat = useMemo(
    () => skillCategories.find((c) => c.name === activeCategory),
    [activeCategory]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Category tabs */}
      <div className="p-4 pb-2">
        <div className="flex gap-1 bg-white/[0.03] p-0.5 rounded-lg overflow-x-auto">
          {skillCategories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(cat.name)}
              className={`px-3 py-1.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.name
                  ? "bg-white/[0.08] text-white/80"
                  : "text-white/30 hover:text-white/50"
              }`}
            >
              {cat.icon} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Skills list */}
      <div className="flex-1 overflow-auto p-4 pt-2 space-y-3">
        {currentCat?.skills.map((s, i) => (
          <motion.div
            key={s.name}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3"
          >
            <div className="flex justify-between items-start mb-1.5">
              <div>
                <h4 className="text-xs font-medium text-white/70">{s.name}</h4>
                {s.yearsOfExperience && (
                  <p className="text-[9px] text-white/25">{s.yearsOfExperience}yr exp</p>
                )}
              </div>
              <span className="text-[11px] font-mono text-amber-400/60">{s.level}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden mb-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${s.level}%` }}
                transition={{ duration: 0.8, delay: i * 0.05 + 0.2 }}
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, rgba(245,158,11,0.5) 0%, rgba(249,115,22,0.7) ${s.level}%)`,
                }}
              />
            </div>
            <p className="text-[10px] text-white/30">{s.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Experience ─────────────────────────────────────────────────────── */
function ExperiencePanel() {
  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        {[
          { label: "Years", value: `${experience.stats.yearsExperience}+`, color: "text-blue-400" },
          { label: "Projects", value: `${experience.stats.projectsCompleted}`, color: "text-emerald-400" },
          { label: "Technologies", value: `${experience.stats.technologiesUsed}+`, color: "text-violet-400" },
          { label: "Problems", value: `${experience.stats.problemsSolved}+`, color: "text-amber-400" },
        ].map((s) => (
          <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 text-center">
            <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-white/30">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-white/[0.06]" />
        {experience.timeline.map((exp, i) => (
          <motion.div
            key={exp.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.15 }}
            className="relative pl-10 pb-4"
          >
            {/* Timeline dot */}
            <div className="absolute left-3 top-3 w-3 h-3 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 border-2 border-[#12121a]" />
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-semibold text-white/90">{exp.title}</h3>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] ${
                    exp.type === "project"
                      ? "bg-blue-500/10 text-blue-400/70 border border-blue-500/20"
                      : "bg-purple-500/10 text-purple-400/70 border border-purple-500/20"
                  }`}
                >
                  {exp.type}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-white/40">{exp.company}</span>
                <span className="text-[10px] text-white/25">·</span>
                <span className="text-[10px] text-white/25">{exp.period}</span>
              </div>
              <p className="text-xs text-white/40 mb-2">{exp.description}</p>
              <ul className="space-y-1 mb-2">
                {exp.achievements.map((a, j) => (
                  <li key={j} className="flex items-start gap-1.5 text-[11px] text-white/40">
                    <span className="text-amber-400/40 mt-0.5">▸</span>
                    {a}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-1">
                {exp.technologies.map((t) => (
                  <span key={t} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/25">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* ── Resume ─────────────────────────────────────────────────────────── */
function ResumePanel() {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-5">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 border border-rose-500/20 flex items-center justify-center"
      >
        <svg className="w-10 h-10 text-rose-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </motion.div>
      <div className="text-center">
        <h3 className="text-sm font-semibold text-white/80">Piyush Singh</h3>
        <p className="text-xs text-white/40 mt-0.5">Frontend Developer</p>
      </div>
      <div className="w-full max-w-xs space-y-2">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <p className="text-[10px] text-white/30 mb-1">Summary</p>
          <p className="text-[11px] text-white/50 leading-relaxed">
            Frontend-focused developer with {experience.stats.yearsExperience}+ years building React.js applications. Solved {experience.stats.problemsSolved}+ DSA problems.
          </p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <p className="text-[10px] text-white/30 mb-1">Education</p>
          <p className="text-[11px] text-white/50">{profile.education[0]?.degree}</p>
          <p className="text-[9px] text-white/25">{profile.education[0]?.institution}</p>
        </div>
      </div>
      <a
        href="/resume/Piyush.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/30 rounded-xl text-xs text-amber-400 transition-all"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download PDF
      </a>
    </div>
  );
}

/* ── Contact ────────────────────────────────────────────────────────── */
function ContactPanel() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <div className="h-full overflow-auto p-4 space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "Email", value: profile.email, href: `mailto:${profile.email}`, icon: "✉️" },
          { label: "Phone", value: profile.phone, href: `tel:${profile.phone}`, icon: "📱" },
          { label: "GitHub", value: "piyush1156", href: profile.github, icon: "🐙" },
          { label: "LinkedIn", value: "piyushsingh", href: profile.linkedin, icon: "💼" },
        ].map((c) => (
          <a
            key={c.label}
            href={c.href}
            target={c.label !== "Email" && c.label !== "Phone" ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:border-white/[0.12] transition-all group"
          >
            <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-sm">
              {c.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[9px] text-white/30">{c.label}</p>
              <p className="text-[10px] text-white/60 group-hover:text-white/80 truncate transition-colors">
                {c.value}
              </p>
            </div>
          </a>
        ))}
      </div>

      {/* Quick message form */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <h3 className="text-xs font-semibold text-white/60 mb-3">Send a Message</h3>
        {submitted ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-4 text-center"
          >
            <span className="text-2xl">✓</span>
            <p className="text-xs text-emerald-400/70 mt-1">Message sent!</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 outline-none focus:border-amber-500/30 placeholder:text-white/20"
              />
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 outline-none focus:border-amber-500/30 placeholder:text-white/20"
              />
            </div>
            <textarea
              placeholder="Your message..."
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-[11px] text-white/70 outline-none focus:border-amber-500/30 placeholder:text-white/20 resize-none"
            />
            <button
              type="submit"
              className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-[11px] text-amber-400 transition-all"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Services ───────────────────────────────────────────────────────── */
function ServicesPanel() {
  return (
    <div className="h-full overflow-auto p-4 space-y-3">
      {profile.services.map((s, i) => (
        <motion.div
          key={s.title}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all group"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/[0.06] flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
              {s.icon}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white/90">{s.title}</h3>
              <p className="text-xs text-white/40 mt-0.5">{s.description}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/* ── Terminal ───────────────────────────────────────────────────────── */
function TerminalPanel({ onOpenApp }: { onOpenApp: (app: AppName) => void }) {
  const [history, setHistory] = useState<string[]>([
    "\x1b[1;32mPiyushOS Terminal v1.0.0\x1b[0m",
    'Type \x1b[1;33m"help"\x1b[0m for available commands.',
    "",
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    const newLines: string[] = [`$ ${cmd}`];

    if (trimmed === "help") {
      newLines.push(
        "Available commands:",
        "  \x1b[1;33mabout\x1b[0m       — Open About panel",
        "  \x1b[1;33mprojects\x1b[0m    — Open Projects panel",
        "  \x1b[1;33mskills\x1b[0m      — Open Skills panel",
        "  \x1b[1;33mexperience\x1b[0m  — Open Experience panel",
        "  \x1b[1;33mresume\x1b[0m      — Open Resume panel",
        "  \x1b[1;33mcontact\x1b[0m     — Open Contact panel",
        "  \x1b[1;33mservices\x1b[0m    — Open Services panel",
        "  \x1b[1;33mwhoami\x1b[0m      — Who are you?",
        "  \x1b[1;33mdate\x1b[0m        — Current date & time",
        "  \x1b[1;33mclear\x1b[0m       — Clear terminal"
      );
    } else if (trimmed === "clear") {
      setHistory([]);
      setInput("");
      setCmdHistory((prev) => [...prev, cmd]);
      return;
    } else if (trimmed === "whoami") {
      newLines.push("A visitor to Piyush's digital workspace 🌐");
    } else if (trimmed === "date") {
      newLines.push(new Date().toLocaleString());
    } else if (trimmed === "about") {
      onOpenApp("about");
      newLines.push("Opening About panel...");
    } else if (trimmed === "projects") {
      onOpenApp("projects");
      newLines.push("Opening Projects panel...");
    } else if (trimmed === "skills") {
      onOpenApp("skills");
      newLines.push("Opening Skills panel...");
    } else if (trimmed === "experience") {
      onOpenApp("experience");
      newLines.push("Opening Experience panel...");
    } else if (trimmed === "contact") {
      onOpenApp("contact");
      newLines.push("Opening Contact panel...");
    } else if (trimmed === "resume") {
      onOpenApp("resume");
      newLines.push("Opening Resume panel...");
    } else if (trimmed === "services") {
      onOpenApp("services");
      newLines.push("Opening Services panel...");
    } else if (trimmed) {
      newLines.push(`\x1b[1;31mcommand not found:\x1b[0m ${trimmed}`);
    }

    newLines.push("");
    setHistory((prev) => [...prev, ...newLines]);
    setCmdHistory((prev) => [...prev, cmd]);
    setHistoryIdx(-1);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(newIdx);
      if (newIdx >= 0) setInput(cmdHistory[cmdHistory.length - 1 - newIdx] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIdx = historyIdx - 1;
      setHistoryIdx(newIdx);
      if (newIdx < 0) {
        setInput("");
      } else {
        setInput(cmdHistory[cmdHistory.length - 1 - newIdx] || "");
      }
    }
  };

  return (
    <div className="h-full bg-[#0c0c14] p-4 font-mono text-[11px] text-white/60 overflow-auto">
      {history.map((line, i) => (
        <div
          key={i}
          className={line.startsWith("$ ") ? "text-emerald-400/60" : ""}
          dangerouslySetInnerHTML={{ __html: renderAnsi(line) }}
        />
      ))}
      <div className="flex items-center mt-1">
        <span className="text-emerald-400/60 mr-1.5">$</span>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-white/60"
          placeholder="type a command..."
        />
      </div>
      <div ref={endRef} />
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */
function InfoCard({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href: string;
  icon?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:border-white/[0.12] transition-all group"
    >
      {icon && <span className="text-sm">{icon}</span>}
      <div className="min-w-0">
        <p className="text-[9px] text-white/30">{label}</p>
        <p className="text-[10px] text-white/60 truncate group-hover:text-white/80 transition-colors">
          {value.replace(/^https?:\/\//, "")}
        </p>
      </div>
    </a>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div>
      <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-[11px] text-white/50 leading-relaxed">{content}</p>
    </div>
  );
}

/** Minimal ANSI escape renderer — handles \x1b[1;3Xm bold color codes */
function renderAnsi(text: string): string {
  return text
    .replace(/\x1b\[1;31m/g, '<span style="color:rgba(248,113,113,0.8)">')
    .replace(/\x1b\[1;32m/g, '<span style="color:rgba(74,222,128,0.8)">')
    .replace(/\x1b\[1;33m/g, '<span style="color:rgba(250,204,21,0.8)">')
    .replace(/\x1b\[0m/g, "</span>");
}
