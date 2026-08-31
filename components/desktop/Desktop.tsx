"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Command, AppName } from "@/lib/commands";
import { VisitorProfile } from "@/lib/visitor";
import { profile } from "@/data/profile";
import { skillCategories } from "@/data/skills";
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
};

const DOCK_APPS: { name: AppName; icon: string; label: string }[] = [
  { name: "assistant", icon: "🤖", label: "ARIA" },
  { name: "about", icon: "👤", label: "About" },
  { name: "projects", icon: "📁", label: "Projects" },
  { name: "skills", icon: "⚡", label: "Skills" },
  { name: "resume", icon: "📄", label: "Resume" },
  { name: "contact", icon: "✉️", label: "Contact" },
  { name: "services", icon: "🎯", label: "Services" },
  { name: "terminal", icon: "💻", label: "Terminal" },
];

export default function Desktop({ visitor, onCommand }: DesktopProps) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<
    { role: "user" | "assistant"; text: string }[]
  >([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const openApp = useCallback(
    (app: AppName) => {
      setWindows((prev) => {
        const existing = prev.find((w) => w.app === app);
        if (existing) {
          return prev.map((w) =>
            w.app === app ? { ...w, minimized: false } : w
          );
        }
        return [
          ...prev,
          { id: `${app}-${Date.now()}`, app, minimized: false, maximized: false },
        ];
      });
      onCommand({ type: "OPEN_APP", app });
    },
    [onCommand]
  );

  const closeApp = useCallback((id: string) => {
    setWindows((prev) => prev.filter((w) => w.id !== id));
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

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMsg = chatInput.trim();
    setChatInput("");
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
    <div className="w-full h-full bg-[#0a0a14] overflow-hidden relative">
      {/* ── Desktop background (dual video wallpapers) ── */}
      <div className="absolute inset-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-60"
          src="/bg1.mp4"
        />
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-screen"
          src="/bg2.mp4"
        />
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* ── Menu bar ──────────────────────────────────────── */}
      <div className="relative z-50 h-8 bg-black/60 backdrop-blur-xl border-b border-white/[0.06] flex items-center px-4 text-[11px] text-white/70">
        <span className="font-semibold text-white/90 mr-6">&#63743; PiyushOS</span>
        <span className="text-white/40">File</span>
        <span className="ml-4 text-white/40">Edit</span>
        <span className="ml-4 text-white/40">View</span>
        <span className="ml-4 text-white/40">Help</span>
        <div className="flex-1" />
        <span className="text-white/40 font-mono">
          {new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      {/* ── Windows ───────────────────────────────────────── */}
      <div className="relative z-10 w-full h-[calc(100%-5.5rem)]">
        <AnimatePresence>
          {activeWindows.map((win, idx) => (
            <motion.div
              key={win.id}
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.25 }}
              className={`absolute ${
                win.maximized
                  ? "inset-0"
                  : "top-[10%] left-[15%] w-[70%] h-[75%]"
              }`}
              style={{ zIndex: 20 + idx }}
            >
              <div className="w-full h-full bg-[#12121a]/95 backdrop-blur-xl border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl shadow-black/40 flex flex-col">
                {/* Title bar */}
                <div className="h-9 bg-white/[0.04] border-b border-white/[0.06] flex items-center px-3 shrink-0">
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
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-50">
        <div className="flex items-end gap-1 bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-2xl px-3 py-2">
          {DOCK_APPS.map((app) => {
            const isOpen = windows.some((w) => w.app === app.name && !w.minimized);
            return (
              <button
                key={app.name}
                onClick={() => openApp(app.name)}
                className="group relative flex flex-col items-center"
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-200 group-hover:scale-110 group-hover:-translate-y-1 ${
                    isOpen
                      ? "bg-white/[0.12] border border-white/[0.1]"
                      : "bg-white/[0.05] border border-white/[0.06] group-hover:bg-white/[0.1]"
                  }`}
                >
                  {app.icon}
                </div>
                {isOpen && (
                  <div className="w-1 h-1 rounded-full bg-white/40 mt-1" />
                )}
                <span className="absolute -top-7 px-2 py-0.5 bg-black/80 rounded text-[10px] text-white/70 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {app.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Floating ARIA prompt ──────────────────────────── */}
      {!windows.some((w) => w.app === "assistant") && chatMessages.length === 0 && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.6 }}
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
    case "experience":
      return <ExperiencePanel />;
    case "terminal":
      return <TerminalPanel onOpenApp={onOpenApp} />;
    case "assistant":
      return null; // handled externally
    default:
      return (
        <div className="p-6 text-white/30 text-sm">Coming soon…</div>
      );
  }
}

/* ── About ──────────────────────────────────────────────────────────── */
function AboutPanel() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-2xl font-bold text-white">
          P
        </div>
        <div>
          <h2 className="text-lg font-bold text-white/90">{profile.fullName}</h2>
          <p className="text-sm text-white/50">{profile.role}</p>
          <p className="text-xs text-white/30 mt-0.5">{profile.location}</p>
        </div>
      </div>
      <p className="text-sm text-white/50 leading-relaxed">{profile.bio}</p>
      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="GitHub" value={profile.github} href={profile.github} />
        <InfoCard label="LinkedIn" value={profile.linkedin} href={profile.linkedin} />
      </div>
    </div>
  );
}

/* ── Projects ───────────────────────────────────────────────────────── */
function ProjectsPanel() {
  return (
    <div className="p-4 space-y-3">
      {projects.map((p) => (
        <div
          key={p.id}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all"
        >
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white/90">{p.name}</h3>
            <span className="px-1.5 py-0.5 bg-white/[0.05] rounded text-[9px] text-white/30 capitalize">
              {p.category}
            </span>
          </div>
          <p className="text-xs text-white/40">{p.shortDescription}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {p.technologies.map((t) => (
              <span key={t} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/30">
                {t}
              </span>
            ))}
          </div>
          <div className="flex gap-3 mt-3">
            {p.liveDemo && (
              <a
                href={p.liveDemo}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-blue-400/70 hover:text-blue-400"
              >
                Live Demo →
              </a>
            )}
            {p.github && (
              <a
                href={p.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-white/25 hover:text-white/50"
              >
                GitHub →
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Skills ─────────────────────────────────────────────────────────── */
function SkillsPanel() {
  return (
    <div className="p-4 space-y-4">
      {skillCategories.map((cat) => (
        <div key={cat.name}>
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">
            {cat.icon} {cat.name}
          </h3>
          <div className="space-y-2">
            {cat.skills.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-[11px] mb-0.5">
                  <span className="text-white/50">{s.name}</span>
                  <span className="text-white/25">{s.level}%</span>
                </div>
                <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.level}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                    className="h-full bg-gradient-to-r from-amber-500/60 to-orange-500/60 rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Experience ─────────────────────────────────────────────────────── */
function ExperiencePanel() {
  return (
    <div className="p-4 space-y-3">
      {experience.timeline.map((exp) => (
        <div
          key={exp.id}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-white/90">{exp.title}</h3>
            <span className="text-[10px] text-white/25">{exp.period}</span>
          </div>
          <p className="text-xs text-white/40 mb-2">{exp.company}</p>
          <ul className="space-y-1">
            {exp.achievements.map((a, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[11px] text-white/40">
                <span className="text-amber-400/50 mt-0.5">•</span>
                {a}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-1 mt-2">
            {exp.technologies.map((t) => (
              <span key={t} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/25">
                {t}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Resume ─────────────────────────────────────────────────────────── */
function ResumePanel() {
  return (
    <div className="p-6 flex flex-col items-center justify-center h-full gap-4">
      <div className="text-4xl">📄</div>
      <h3 className="text-sm font-semibold text-white/80">Piyush Singh — Resume</h3>
      <p className="text-xs text-white/40 text-center max-w-xs">
        Frontend Developer with experience in React.js, JavaScript, and REST APIs.
      </p>
      <a
        href="/resume/Piyush.pdf"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 rounded-lg text-xs text-amber-400 transition-all"
      >
        Download PDF →
      </a>
    </div>
  );
}

/* ── Contact ────────────────────────────────────────────────────────── */
function ContactPanel() {
  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-semibold text-white/80 mb-2">Get in Touch</h3>
      {[
        { label: "Email", value: profile.email, href: `mailto:${profile.email}` },
        { label: "Phone", value: profile.phone, href: `tel:${profile.phone}` },
        { label: "GitHub", value: profile.github, href: profile.github },
        { label: "LinkedIn", value: profile.linkedin, href: profile.linkedin },
      ].map((c) => (
        <a
          key={c.label}
          href={c.href}
          target={c.label !== "Email" && c.label !== "Phone" ? "_blank" : undefined}
          rel="noopener noreferrer"
          className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:border-white/[0.12] transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center text-sm">
            {c.label === "Email" ? "✉️" : c.label === "Phone" ? "📱" : c.label === "GitHub" ? "🐙" : "💼"}
          </div>
          <div>
            <p className="text-[10px] text-white/30">{c.label}</p>
            <p className="text-xs text-white/60 group-hover:text-white/80 transition-colors">{c.value}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

/* ── Services ───────────────────────────────────────────────────────── */
function ServicesPanel() {
  return (
    <div className="p-4 space-y-3">
      {profile.services.map((s) => (
        <div
          key={s.title}
          className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{s.icon}</span>
            <h3 className="text-sm font-semibold text-white/90">{s.title}</h3>
          </div>
          <p className="text-xs text-white/40">{s.description}</p>
        </div>
      ))}
    </div>
  );
}

/* ── Terminal ───────────────────────────────────────────────────────── */
function TerminalPanel({ onOpenApp }: { onOpenApp: (app: AppName) => void }) {
  const [history, setHistory] = useState<string[]>([
    "PiyushOS Terminal v1.0.0",
    'Type "help" for available commands.',
    "",
  ]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommand = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    const newLines = [`$ ${cmd}`];

    if (trimmed === "help") {
      newLines.push("Commands: help, about, projects, skills, contact, clear, whoami");
    } else if (trimmed === "clear") {
      setHistory([]);
      setInput("");
      return;
    } else if (trimmed === "whoami") {
      newLines.push("A visitor to Piyush's digital workspace");
    } else if (trimmed === "about") {
      onOpenApp("about");
      newLines.push("Opening About panel...");
    } else if (trimmed === "projects") {
      onOpenApp("projects");
      newLines.push("Opening Projects panel...");
    } else if (trimmed === "skills") {
      onOpenApp("skills");
      newLines.push("Opening Skills panel...");
    } else if (trimmed === "contact") {
      onOpenApp("contact");
      newLines.push("Opening Contact panel...");
    } else if (trimmed === "resume") {
      onOpenApp("resume");
      newLines.push("Opening Resume panel...");
    } else if (trimmed === "services") {
      onOpenApp("services");
      newLines.push("Opening Services panel...");
    } else if (trimmed === "experience") {
      onOpenApp("experience");
      newLines.push("Opening Experience panel...");
    } else if (trimmed) {
      newLines.push(`command not found: ${trimmed}`);
    }

    newLines.push("");
    setHistory((prev) => [...prev, ...newLines]);
    setInput("");
  };

  return (
    <div className="h-full bg-[#0c0c14] p-4 font-mono text-[11px] text-white/60 overflow-auto">
      {history.map((line, i) => (
        <div key={i} className={line.startsWith("$ ") ? "text-emerald-400/60" : ""}>
          {line}
        </div>
      ))}
      <div className="flex items-center mt-1">
        <span className="text-emerald-400/60 mr-1">$</span>
        <input
          autoFocus
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCommand(input);
          }}
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
}: {
  label: string;
  value: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 hover:border-white/[0.12] transition-all"
    >
      <p className="text-[10px] text-white/30">{label}</p>
      <p className="text-xs text-white/60 truncate">{value}</p>
    </a>
  );
}
