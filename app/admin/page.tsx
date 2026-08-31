"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AdminLogin from "@/components/admin/AdminLogin";

interface ProjectEntry {
  id: string;
  name: string;
  shortDescription: string;
  description: string;
  problem: string;
  solution: string;
  technologies: string[];
  features: string[];
  architecture: string;
  liveDemo?: string;
  github?: string;
  image?: string;
  category: string;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

interface VisitorLog {
  id: string;
  name: string;
  role: string;
  company?: string;
  interests?: string[];
  visitedAt: string;
  sessionId: string;
}

interface ChatMsg {
  id: string;
  sessionId: string;
  visitorName: string;
  visitorRole: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

type Tab = "overview" | "projects" | "visitors" | "chats" | "add-project";

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("overview");
  const [projects, setProjects] = useState<ProjectEntry[]>([]);
  const [visitors, setVisitors] = useState<VisitorLog[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<ProjectEntry | null>(null);
  const [viewingProject, setViewingProject] = useState<ProjectEntry | null>(null);

  // Check existing session — ONLY via httpOnly cookie, never localStorage
  useEffect(() => {
    fetch("/api/auth/verify", { credentials: "include" })
      .then((r) => {
        if (r.ok) {
          setAuthenticated(true);
        } else {
          // Cookie invalid/expired — force clean logout
          fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
        }
      })
      .catch(() => {}) // no network = stay unauthenticated
      .finally(() => setChecking(false));
  }, []);

  const handleLogin = (token: string) => {
    // Token is set as httpOnly cookie by /api/auth/verify POST response
    // Also store in localStorage as fallback for Authorization header
    localStorage.setItem("admin_token", token);
    setAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    document.cookie = "admin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    setAuthenticated(false);
  };

  const fetchData = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    const token = localStorage.getItem("admin_token");
    try {
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const [projRes, visRes, chatRes] = await Promise.all([
        fetch("/api/projects-db", { headers: authHeaders, credentials: "include" }),
        fetch("/api/visitors", { headers: authHeaders, credentials: "include" }),
        fetch("/api/chat-history", { headers: authHeaders, credentials: "include" }),
      ]);
      const projData = await projRes.json();
      const visData = await visRes.json();
      const chatData = await chatRes.json();
      setProjects(projData.projects || []);
      setVisitors(visData.visitors || []);
      setChatMessages(chatData.messages || []);
    } catch {}
    setLoading(false);
  }, [authenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Delete this project permanently?")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/projects-db?id=${id}`, {
        method: "DELETE",
        headers: authHeaders,
        credentials: "include",
      });
      if (res.ok) fetchData();
    } catch {}
  };

  const handleDeleteChatSession = async (sessionId: string) => {
    if (!confirm("Delete this chat session permanently?")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/chat-history?sessionId=${sessionId}`, {
        method: "DELETE",
        headers: authHeaders,
        credentials: "include",
      });
      if (res.ok) {
        setChatMessages(prev => prev.filter(m => m.sessionId !== sessionId));
      }
    } catch {}
  };

  // Export a single chat session as a downloadable file
  const handleExportChatSession = (sessionId: string, format: "txt" | "json") => {
    const sessionMsgs = chatMessages.filter(m => m.sessionId === sessionId);
    if (sessionMsgs.length === 0) return;

    const visitorName = sessionMsgs[0]?.visitorName || "Anonymous";
    const visitorRole = sessionMsgs[0]?.visitorRole || "unknown";
    const fileName = `chat-${visitorName.replace(/\s+/g, "-").toLowerCase()}-${sessionId.slice(0, 8)}`;

    let content: string;
    let mimeType: string;
    let extension: string;

    if (format === "json") {
      const exportData = {
        sessionId,
        visitorName,
        visitorRole,
        exportedAt: new Date().toISOString(),
        messageCount: sessionMsgs.length,
        messages: sessionMsgs.map(m => ({
          role: m.role,
          text: m.text,
          timestamp: m.timestamp,
        })),
      };
      content = JSON.stringify(exportData, null, 2);
      mimeType = "application/json";
      extension = "json";
    } else {
      const lines: string[] = [
        `Chat Transcript`,
        `${"=".repeat(50)}`,
        `Visitor: ${visitorName}`,
        `Role: ${visitorRole}`,
        `Session: ${sessionId}`,
        `Date: ${new Date(sessionMsgs[0].timestamp).toLocaleDateString()}`,
        `Messages: ${sessionMsgs.length}`,
        `${"=".repeat(50)}`,
        ``,
      ];
      for (const msg of sessionMsgs) {
        const time = new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
        const sender = msg.role === "user" ? visitorName : "ARIA";
        lines.push(`[${time}] ${sender}: ${msg.text}`);
        lines.push("");
      }
      content = lines.join("\n");
      mimeType = "text/plain";
      extension = "txt";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Export all chats as a single JSON file
  const handleExportAllChats = () => {
    if (chatMessages.length === 0) return;

    const sessions: Record<string, ChatMsg[]> = {};
    for (const msg of chatMessages) {
      if (!sessions[msg.sessionId]) sessions[msg.sessionId] = [];
      sessions[msg.sessionId].push(msg);
    }

    const exportData = {
      exportedAt: new Date().toISOString(),
      totalSessions: Object.keys(sessions).length,
      totalMessages: chatMessages.length,
      sessions: Object.entries(sessions).map(([sid, msgs]) => ({
        sessionId: sid,
        visitorName: msgs[0]?.visitorName || "Anonymous",
        visitorRole: msgs[0]?.visitorRole || "unknown",
        messageCount: msgs.length,
        startTime: msgs[0]?.timestamp,
        endTime: msgs[msgs.length - 1]?.timestamp,
        messages: msgs.map(m => ({
          role: m.role,
          text: m.text,
          timestamp: m.timestamp,
        })),
      })),
    };

    const content = JSON.stringify(exportData, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `all-chats-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Clear all chats
  const handleClearAllChats = async () => {
    if (!confirm("Are you sure you want to delete ALL chat history? This cannot be undone.")) return;
    const token = localStorage.getItem("admin_token");
    try {
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch("/api/chat-history", {
        method: "DELETE",
        headers: authHeaders,
        credentials: "include",
      });
      if (res.ok) {
        setChatMessages([]);
      }
    } catch {}
  };

  const handleUpdateProject = async (updated: ProjectEntry) => {
    const token = localStorage.getItem("admin_token");
    try {
      const res = await fetch("/api/projects-db", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), },
        credentials: "include",
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setEditingProject(null);
        fetchData();
      }
    } catch {}
  };

  // Loading
  if (checking) {
    return (
      <div className="min-h-screen bg-[#07080e] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500/60 rounded-full animate-spin" />
      </div>
    );
  }

  // Login required
  if (!authenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const roleStats = {
    recruiter: visitors.filter((v) => v.role === "recruiter").length,
    client: visitors.filter((v) => v.role === "client").length,
    developer: visitors.filter((v) => v.role === "developer").length,
    student: visitors.filter((v) => v.role === "student").length,
    explorer: visitors.filter((v) => v.role === "explorer").length,
  };

  return (
    <div className="min-h-screen bg-[#07080e] text-white">
      {/* Header */}
      <header className="border-b border-white/[0.06] bg-[#0a0b12]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-sm font-bold">
              ◆
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white/90">Admin Dashboard</h1>
              <p className="text-[10px] text-white/35">Manage projects & view analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-white/40 hover:text-white/60 transition-colors">
              ← Portfolio
            </a>
            <button onClick={handleLogout} className="text-xs text-red-400/60 hover:text-red-400 transition-colors">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-6 pt-6">
        <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl w-fit border border-white/[0.05]">
          {([
            { id: "overview" as Tab, label: "Overview", count: undefined },
            { id: "projects" as Tab, label: "Projects", count: projects.length },
            { id: "visitors" as Tab, label: "Visitors", count: visitors.length },
            { id: "chats" as Tab, label: "💬 Chats", count: chatMessages.length },
            { id: "add-project" as Tab, label: "+ Add Project" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setEditingProject(null); setViewingProject(null); }}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-white/[0.08] text-white border border-white/[0.08]"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {t.label}
              {t.count !== undefined && (
                <span className="ml-1.5 text-[10px] text-white/25">({t.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-amber-500/20 border-t-amber-500/60 rounded-full animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {/* ── Overview Tab ────────────────────────── */}
            {tab === "overview" && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Projects", value: projects.length, color: "blue" },
                    { label: "Visitors", value: visitors.length, color: "purple" },
                    { label: "Featured", value: projects.filter((p) => p.featured).length, color: "amber" },
                    { label: "Roles", value: Object.values(roleStats).filter((v) => v > 0).length, color: "emerald" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 text-center">
                      <div className="text-2xl font-bold text-white/80">{s.value}</div>
                      <div className="text-[10px] text-white/35 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white/70 mb-4">Visitor Roles</h3>
                  <div className="space-y-3">
                    {Object.entries(roleStats).map(([role, count]) => (
                      <div key={role} className="flex items-center gap-3">
                        <span className="text-xs text-white/40 capitalize w-20">{role}s</span>
                        <div className="flex-1 h-2 bg-white/[0.04] rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${visitors.length > 0 ? (count / visitors.length) * 100 : 0}%` }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="h-full bg-gradient-to-r from-blue-500/60 to-purple-500/60 rounded-full"
                          />
                        </div>
                        <span className="text-xs text-white/30 w-8 text-right">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Projects Tab ────────────────────────── */}
            {tab === "projects" && (
              <motion.div key="projects" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {editingProject ? (
                  <EditProjectForm
                    project={editingProject}
                    onSave={handleUpdateProject}
                    onCancel={() => setEditingProject(null)}
                  />
                ) : viewingProject ? (
                  <ProjectDetailView
                    project={viewingProject}
                    onBack={() => setViewingProject(null)}
                    onEdit={() => { setEditingProject(viewingProject); setViewingProject(null); }}
                    onDelete={() => { handleDeleteProject(viewingProject.id); setViewingProject(null); }}
                  />
                ) : (
                  <div className="space-y-3">
                    {projects.length === 0 ? (
                      <p className="text-white/30 text-sm py-10 text-center">No projects yet</p>
                    ) : (
                      projects.map((p) => (
                        <div key={p.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all group">
                          <div className="flex items-start gap-4">
                            {p.image ? (
                              <img src={p.image} alt={p.name} className="w-20 h-20 rounded-xl object-cover bg-white/[0.04] shrink-0" />
                            ) : (
                              <div className="w-20 h-20 rounded-xl bg-white/[0.04] flex items-center justify-center text-2xl shrink-0">
                                {p.name[0]}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="text-sm font-semibold text-white/90">{p.name}</h3>
                                <span className="px-1.5 py-0.5 bg-white/[0.05] rounded text-[9px] text-white/30">{p.category}</span>
                                {p.featured && <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[9px] text-amber-400">★ Featured</span>}
                              </div>
                              <p className="text-xs text-white/40 mt-0.5">{p.shortDescription}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {p.technologies.slice(0, 5).map((t) => (
                                  <span key={t} className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/30">{t}</span>
                                ))}
                                {p.technologies.length > 5 && (
                                  <span className="px-1.5 py-0.5 bg-white/[0.04] rounded text-[9px] text-white/30">+{p.technologies.length - 5}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0 items-end">
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => setViewingProject(p)}
                                  className="px-2.5 py-1 bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] rounded-lg text-[10px] text-white/50 hover:text-white/80 transition-all"
                                >
                                  View
                                </button>
                                <button
                                  onClick={() => setEditingProject(p)}
                                  className="px-2.5 py-1 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-[10px] text-blue-400/70 hover:text-blue-400 transition-all"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(p.id)}
                                  className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-[10px] text-red-400/60 hover:text-red-400 transition-all"
                                >
                                  Delete
                                </button>
                              </div>
                              <div className="flex gap-2 mt-1">
                                {p.liveDemo && <a href={p.liveDemo} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400/60 hover:text-blue-400">Demo →</a>}
                                {p.github && <a href={p.github} target="_blank" rel="noopener noreferrer" className="text-[10px] text-white/25 hover:text-white/50">GitHub →</a>}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Visitors Tab ────────────────────────── */}
            {tab === "visitors" && (
              <motion.div key="visitors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
                {visitors.length === 0 ? (
                  <p className="text-white/30 text-sm py-10 text-center">No visitors yet</p>
                ) : (
                  visitors.map((v) => (
                    <div key={v.id} className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-sm font-semibold text-white/60">
                        {v.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white/80">{v.name}</span>
                          <span className={`px-2 py-0.5 border rounded text-[10px] capitalize ${getRoleColor(v.role)}`}>{v.role}</span>
                          {v.company && <span className="text-xs text-white/30">{v.company}</span>}
                        </div>
                        {v.interests && v.interests.length > 0 && (
                          <p className="text-[10px] text-white/25 mt-0.5">Interests: {v.interests.join(", ")}</p>
                        )}
                      </div>
                      <div className="text-[10px] text-white/25 shrink-0">
                        {new Date(v.visitedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}

            {/* ── Chats Tab ──────────────────────────── */}
            {tab === "chats" && (
              <ChatsTab chatMessages={chatMessages} onDeleteSession={handleDeleteChatSession} onExportSession={handleExportChatSession} onExportAll={handleExportAllChats} onClearAll={handleClearAllChats} />
            )}

            {/* ── Add Project Tab ─────────────────────── */}
            {tab === "add-project" && (
              <motion.div key="add" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AddProjectForm onSuccess={() => { fetchData(); setTab("projects"); }} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </main>
    </div>
  );
}

// ── Chats Tab Component ──────────────────────────────────────────
function ChatsTab({
  chatMessages,
  onDeleteSession,
  onExportSession,
  onExportAll,
  onClearAll,
}: {
  chatMessages: ChatMsg[];
  onDeleteSession: (sessionId: string) => void;
  onExportSession: (sessionId: string, format: "txt" | "json") => void;
  onExportAll: () => void;
  onClearAll: () => void;
}) {
  if (chatMessages.length === 0) {
    return <p className="text-white/30 text-sm py-10 text-center">No conversations yet</p>;
  }

  const sessions: Record<string, ChatMsg[]> = {};
  for (const msg of chatMessages) {
    if (!sessions[msg.sessionId]) sessions[msg.sessionId] = [];
    sessions[msg.sessionId].push(msg);
  }
  const sessionCount = Object.keys(sessions).length;

  return (
    <>
      {/* Actions bar */}
      <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-3">
        <div className="text-xs text-white/40">
          <span>{sessionCount} session{sessionCount !== 1 ? "s" : ""} · {chatMessages.length} messages</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onExportAll}
            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-400/70 hover:text-emerald-400 transition-all flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export All (JSON)
          </button>
          <button
            onClick={() => { if (confirm("Clear ALL chat history? This cannot be undone.")) onClearAll(); }}
            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-[10px] text-red-400/60 hover:text-red-400 transition-all flex items-center gap-1.5"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All
          </button>
        </div>
      </div>

      {/* Session chat boxes */}
      {Object.entries(sessions).map(([sid, msgs]) => (
        <div key={sid} className="bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Session header */}
          <div className="px-4 py-3 border-b border-white/[0.04] flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              {msgs[0]?.visitorName?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-white/80">{msgs[0]?.visitorName || "Anonymous"}</p>
              <p className="text-[10px] text-white/30 capitalize">{msgs[0]?.visitorRole} · {msgs.length} messages</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-white/20 mr-1">
                {new Date(msgs[0]?.timestamp || "").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
              <button
                onClick={() => onExportSession(sid, "txt")}
                className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-blue-400/60 hover:text-blue-400 transition-all"
                title="Export as Text"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button
                onClick={() => onExportSession(sid, "json")}
                className="p-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg text-purple-400/60 hover:text-purple-400 transition-all"
                title="Export as JSON"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
              <button
                onClick={() => onDeleteSession(sid)}
                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-red-400/60 hover:text-red-400 transition-all"
                title="Delete chat session"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          {/* Messages */}
          <div className="px-4 py-3 space-y-2 max-h-80 overflow-y-auto">
            {msgs.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-500/20 text-blue-200 rounded-br-md"
                    : "bg-white/[0.04] text-white/60 rounded-bl-md border border-white/[0.04]"
                }`}>
                  <p>{msg.text}</p>
                  <p className="text-[9px] text-white/20 mt-1">
                    {new Date(msg.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function getRoleColor(role: string): string {
  const colors: Record<string, string> = {
    recruiter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    client: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    developer: "bg-green-500/10 text-green-400 border-green-500/20",
    student: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    explorer: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };
  return colors[role] || "bg-white/[0.05] text-white/40 border-white/[0.08]";
}

// ── Project Detail View ──────────────────────────────────────────────
function ProjectDetailView({
  project,
  onBack,
  onEdit,
  onDelete,
}: {
  project: ProjectEntry;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-xs text-white/40 hover:text-white/60 transition-colors">← Back</button>
        <div className="flex-1" />
        <button onClick={onEdit} className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-xs text-blue-400 transition-all">
          Edit Project
        </button>
        <button onClick={onDelete} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg text-xs text-red-400/70 hover:text-red-400 transition-all">
          Delete
        </button>
      </div>

      {/* Project Header */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-start gap-4">
          {project.image ? (
            <img src={project.image} alt={project.name} className="w-24 h-24 rounded-xl object-cover bg-white/[0.04] shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-xl bg-white/[0.04] flex items-center justify-center text-3xl shrink-0">{project.name[0]}</div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-bold text-white/90">{project.name}</h2>
              <span className="px-2 py-0.5 bg-white/[0.05] rounded text-[10px] text-white/30 capitalize">{project.category}</span>
              {project.featured && <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[10px] text-amber-400">★ Featured</span>}
            </div>
            <p className="text-sm text-white/50 mb-3">{project.shortDescription}</p>
            <div className="flex gap-2">
              {project.liveDemo && (
                <a href={project.liveDemo} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg text-xs text-blue-400 transition-all">
                  Live Demo →
                </a>
              )}
              {project.github && (
                <a href={project.github} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-lg text-xs text-white/50 hover:text-white/70 transition-all">
                  GitHub →
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-4">
        <Section title="Description" content={project.description} />
        <Section title="Problem" content={project.problem} />
        <Section title="Solution" content={project.solution} />
        <Section title="Architecture" content={project.architecture} />
      </div>

      {/* Technologies & Features */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Technologies</h3>
          <div className="flex flex-wrap gap-1.5">
            {project.technologies.map((t) => (
              <span key={t} className="px-2 py-1 bg-white/[0.05] border border-white/[0.06] rounded-lg text-[11px] text-white/50">{t}</span>
            ))}
          </div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
          <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Features</h3>
          <ul className="space-y-1.5">
            {project.features.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-white/45">
                <span className="text-blue-400/50 mt-0.5">•</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Metadata */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex gap-6 text-[10px] text-white/25">
        <span>Created: {new Date(project.createdAt).toLocaleDateString()}</span>
        <span>Updated: {new Date(project.updatedAt).toLocaleDateString()}</span>
        <span>ID: {project.id}</span>
      </div>
    </motion.div>
  );
}

function Section({ title, content }: { title: string; content: string }) {
  if (!content) return null;
  return (
    <div>
      <h3 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1.5">{title}</h3>
      <p className="text-sm text-white/50 leading-relaxed">{content}</p>
    </div>
  );
}

// ── Edit Project Form ───────────────────────────────────────────────
function EditProjectForm({
  project,
  onSave,
  onCancel,
}: {
  project: ProjectEntry;
  onSave: (updated: ProjectEntry) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    name: project.name,
    shortDescription: project.shortDescription,
    description: project.description,
    problem: project.problem,
    solution: project.solution,
    technologies: project.technologies.join(", "),
    features: project.features.join("\n"),
    architecture: project.architecture,
    liveDemo: project.liveDemo || "",
    github: project.github || "",
    category: project.category,
    featured: project.featured,
  });
  const [imagePreview, setImagePreview] = useState(project.image || "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMsg("Image must be under 2MB");
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setMsg("Name is required"); return; }
    setSaving(true);
    setMsg("");

    try {
      let imageUrl = imagePreview || undefined;
      if (imageFile) {
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
      }

      onSave({
        ...project,
        name: form.name,
        shortDescription: form.shortDescription,
        description: form.description,
        problem: form.problem,
        solution: form.solution,
        technologies: form.technologies.split(",").map((s) => s.trim()).filter(Boolean),
        features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
        architecture: form.architecture,
        liveDemo: form.liveDemo || undefined,
        github: form.github || undefined,
        image: imageUrl,
        category: form.category as ProjectEntry["category"],
        featured: form.featured,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      setMsg("Error processing image");
    }
    setSaving(false);
  };

  return (
    <motion.form initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white/90">Edit Project</h2>
        <button type="button" onClick={onCancel} className="text-xs text-white/40 hover:text-white/60 transition-colors">← Cancel</button>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-xs ${msg.startsWith("✓") || !msg.startsWith("Image") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {msg}
        </div>
      )}

      {/* Image Upload */}
      <div>
        <label className="text-[10px] text-white/40 mb-1.5 block">Project Image</label>
        <div className="flex items-center gap-4">
          <label className="w-28 h-28 rounded-xl bg-white/[0.04] border-2 border-dashed border-white/[0.08] hover:border-white/[0.15] flex items-center justify-center cursor-pointer transition-all overflow-hidden">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <span className="text-[10px] text-white/20 mt-1 block">Upload Image</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
          <div className="space-y-2">
            <p className="text-[10px] text-white/30">Max 2MB • JPG, PNG, GIF</p>
            {imagePreview && (
              <button type="button" onClick={() => { setImagePreview(""); setImageFile(null); }} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">
                Remove image
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Project Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Project name" />
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">Category *</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-white/80 outline-none focus:border-amber-500/30">
            <option value="ai">AI</option>
            <option value="web">Web</option>
            <option value="automation">Automation</option>
            <option value="fullstack">Full-Stack</option>
          </select>
        </div>
      </div>

      <Field label="Short Description" value={form.shortDescription} onChange={(v) => setForm({ ...form, shortDescription: v })} placeholder="One-line summary" />
      <Field label="Full Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Detailed description" multiline />
      <Field label="Problem" value={form.problem} onChange={(v) => setForm({ ...form, problem: v })} placeholder="What problem does it solve?" multiline />
      <Field label="Solution" value={form.solution} onChange={(v) => setForm({ ...form, solution: v })} placeholder="How was it solved?" multiline />
      <Field label="Technologies (comma-separated)" value={form.technologies} onChange={(v) => setForm({ ...form, technologies: v })} placeholder="React, TypeScript, Python" />
      <Field label="Features (one per line)" value={form.features} onChange={(v) => setForm({ ...form, features: v })} placeholder={"Feature 1\nFeature 2"} multiline />
      <Field label="Architecture" value={form.architecture} onChange={(v) => setForm({ ...form, architecture: v })} placeholder="System architecture" multiline />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Live Demo URL" value={form.liveDemo} onChange={(v) => setForm({ ...form, liveDemo: v })} placeholder="https://..." />
        <Field label="GitHub URL" value={form.github} onChange={(v) => setForm({ ...form, github: v })} placeholder="https://github.com/..." />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded border-white/20 bg-white/[0.04]" />
        <span className="text-xs text-white/50">Featured project</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white/50 text-xs font-medium rounded-xl transition-colors">
          Cancel
        </button>
        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </motion.form>
  );
}

// ── Add Project Form ────────────────────────────────────────────────
function AddProjectForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "",
    shortDescription: "",
    description: "",
    problem: "",
    solution: "",
    technologies: "",
    features: "",
    architecture: "",
    liveDemo: "",
    github: "",
    category: "ai",
    featured: false,
  });
  const [imagePreview, setImagePreview] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setMsg("Image must be under 2MB"); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setMsg("Name is required"); return; }
    setSubmitting(true);
    setMsg("");

    try {
      let imageUrl = imagePreview || undefined;
      if (imageFile) {
        const reader = new FileReader();
        imageUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(imageFile);
        });
      }

      const token = localStorage.getItem("admin_token");
      const res = await fetch("/api/projects-db", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          technologies: form.technologies.split(",").map((s) => s.trim()).filter(Boolean),
          features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
          liveDemo: form.liveDemo || undefined,
          github: form.github || undefined,
          image: imageUrl,
        }),
      });

      if (res.ok) {
        setMsg("✓ Project created!");
        setForm({ name: "", shortDescription: "", description: "", problem: "", solution: "", technologies: "", features: "", architecture: "", liveDemo: "", github: "", category: "ai", featured: false });
        setImagePreview("");
        setImageFile(null);
        onSuccess();
      } else {
        const d = await res.json();
        setMsg(d.error || "Failed");
      }
    } catch {
      setMsg("Network error");
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-4">
      <h2 className="text-lg font-semibold text-white/90">Add New Project</h2>

      {msg && (
        <div className={`p-3 rounded-lg text-xs ${msg.startsWith("✓") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {msg}
        </div>
      )}

      {/* Image Upload */}
      <div>
        <label className="text-[10px] text-white/40 mb-1.5 block">Project Image</label>
        <div className="flex items-center gap-4">
          <label className="w-24 h-24 rounded-xl bg-white/[0.04] border-2 border-dashed border-white/[0.08] hover:border-white/[0.15] flex items-center justify-center cursor-pointer transition-all overflow-hidden">
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <svg className="w-6 h-6 mx-auto text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
                <span className="text-[9px] text-white/20 mt-1 block">Upload</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
          {imagePreview && (
            <button type="button" onClick={() => { setImagePreview(""); setImageFile(null); }} className="text-[10px] text-red-400/60 hover:text-red-400">
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Project Name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="e.g. MyProject" />
        <div>
          <label className="text-[10px] text-white/40 mb-1 block">Category *</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-white/80 outline-none focus:border-amber-500/30">
            <option value="ai">AI</option>
            <option value="web">Web</option>
            <option value="automation">Automation</option>
            <option value="fullstack">Full-Stack</option>
          </select>
        </div>
      </div>

      <Field label="Short Description" value={form.shortDescription} onChange={(v) => setForm({ ...form, shortDescription: v })} placeholder="One-line summary" />
      <Field label="Full Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Detailed description" multiline />
      <Field label="Problem" value={form.problem} onChange={(v) => setForm({ ...form, problem: v })} placeholder="What problem does it solve?" multiline />
      <Field label="Solution" value={form.solution} onChange={(v) => setForm({ ...form, solution: v })} placeholder="How was it solved?" multiline />
      <Field label="Technologies (comma-separated)" value={form.technologies} onChange={(v) => setForm({ ...form, technologies: v })} placeholder="React, TypeScript, Python" />
      <Field label="Features (one per line)" value={form.features} onChange={(v) => setForm({ ...form, features: v })} placeholder={"Feature 1\nFeature 2"} multiline />
      <Field label="Architecture" value={form.architecture} onChange={(v) => setForm({ ...form, architecture: v })} placeholder="System architecture" multiline />

      <div className="grid grid-cols-2 gap-4">
        <Field label="Live Demo URL" value={form.liveDemo} onChange={(v) => setForm({ ...form, liveDemo: v })} placeholder="https://..." />
        <Field label="GitHub URL" value={form.github} onChange={(v) => setForm({ ...form, github: v })} placeholder="https://github.com/..." />
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="rounded border-white/20 bg-white/[0.04]" />
        <span className="text-xs text-white/50">Featured project</span>
      </label>

      <button type="submit" disabled={submitting} className="w-full py-2.5 bg-amber-500/80 hover:bg-amber-500 text-white text-xs font-medium rounded-xl transition-colors disabled:opacity-50">
        {submitting ? "Creating..." : "Add Project"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; multiline?: boolean }) {
  return (
    <div>
      <label className="text-[10px] text-white/40 mb-1 block">{label}</label>
      {multiline ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={3} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-amber-500/30 resize-none transition-colors" />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2.5 text-xs text-white/80 placeholder:text-white/20 outline-none focus:border-amber-500/30 transition-colors" />
      )}
    </div>
  );
}
