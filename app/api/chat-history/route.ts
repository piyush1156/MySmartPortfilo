import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { verifySession } from "@/lib/admin-auth";

const DATA_FILE = join(process.cwd(), "data", "chat-history.json");

export interface ChatMessage {
  id: string;
  sessionId: string;
  visitorName: string;
  visitorRole: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

function readChatHistory(): ChatMessage[] {
  try {
    if (!existsSync(DATA_FILE)) {
      writeFileSync(DATA_FILE, "[]", "utf-8");
      return [];
    }
    const raw = readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeChatHistory(messages: ChatMessage[]) {
  writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), "utf-8");
}

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    || request.cookies.get("admin_token")?.value;
  return token ? verifySession(token) : false;
}

// GET /api/chat-history — Retrieve all chat history (requires auth)
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("sessionId");
  const visitorName = searchParams.get("visitor");
  const limit = parseInt(searchParams.get("limit") || "200");

  let messages = readChatHistory();

  if (sessionId) {
    messages = messages.filter((m) => m.sessionId === sessionId);
  }

  if (visitorName) {
    messages = messages.filter((m) =>
      m.visitorName.toLowerCase().includes(visitorName.toLowerCase())
    );
  }

  // Return most recent first, limited
  messages = messages.slice(-limit).reverse();

  // Group by session for easy viewing
  const sessions: Record<string, ChatMessage[]> = {};
  for (const msg of messages) {
    if (!sessions[msg.sessionId]) {
      sessions[msg.sessionId] = [];
    }
    sessions[msg.sessionId].push(msg);
  }

  return NextResponse.json({
    total: messages.length,
    sessions: Object.keys(sessions).length,
    messages,
    grouped: sessions,
  });
}

// POST /api/chat-history — Record a chat message (no auth needed for recording)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, visitorName, visitorRole, role, text } = body;

    if (!sessionId || !role || !text) {
      return NextResponse.json(
        { error: "sessionId, role, and text are required" },
        { status: 400 }
      );
    }

    const messages = readChatHistory();
    const newMessage: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sessionId,
      visitorName: visitorName || "Anonymous",
      visitorRole: visitorRole || "unknown",
      role,
      text,
      timestamp: new Date().toISOString(),
    };

    messages.push(newMessage);

    // Keep last 2000 messages max
    if (messages.length > 2000) {
      messages.splice(0, messages.length - 2000);
    }

    writeChatHistory(messages);

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Chat history error:", error);
    return NextResponse.json(
      { error: "Failed to record message" },
      { status: 500 }
    );
  }
}

// DELETE /api/chat-history — Clear chat history or delete a specific session (requires auth)
export async function DELETE(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");
    
    if (sessionId) {
      // Delete specific session
      const messages = readChatHistory();
      const filteredMessages = messages.filter(m => m.sessionId !== sessionId);
      writeChatHistory(filteredMessages);
      return NextResponse.json({ success: true, message: `Session ${sessionId} deleted` });
    } else {
      // Clear all chat history
      writeChatHistory([]);
      return NextResponse.json({ success: true, message: "Chat history cleared" });
    }
  } catch {
    return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
  }
}
