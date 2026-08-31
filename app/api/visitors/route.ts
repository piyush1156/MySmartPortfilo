import { NextRequest, NextResponse } from "next/server";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { verifySession } from "@/lib/admin-auth";

function checkAuth(request: NextRequest): boolean {
  const token = request.headers.get("Authorization")?.replace("Bearer ", "")
    || request.cookies.get("admin_token")?.value;
  return token ? verifySession(token) : false;
}

const DATA_FILE = join(process.cwd(), "data", "visitors.json");

interface VisitorLog {
  id: string;
  name: string;
  role: string;
  company?: string;
  interests?: string[];
  visitedAt: string;
  sessionId: string;
  pages: string[];
}

function readVisitors(): VisitorLog[] {
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

function writeVisitors(visitors: VisitorLog[]) {
  writeFileSync(DATA_FILE, JSON.stringify(visitors, null, 2), "utf-8");
}

// GET /api/visitors — Retrieve all visitor logs
export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const visitors = readVisitors();
  return NextResponse.json({
    total: visitors.length,
    visitors: visitors.sort(
      (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
    ),
  });
}

// POST /api/visitors — Log a new visitor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, company, interests, sessionId } = body;

    if (!name || !sessionId) {
      return NextResponse.json(
        { error: "Name and sessionId are required" },
        { status: 400 }
      );
    }

    const visitors = readVisitors();

    // Check if this session already has a log
    const existing = visitors.find((v) => v.sessionId === sessionId);
    if (existing) {
      // Update existing visitor
      existing.name = name || existing.name;
      existing.role = role || existing.role;
      existing.company = company || existing.company;
      existing.interests = interests || existing.interests;
      existing.visitedAt = new Date().toISOString();
      writeVisitors(visitors);
      return NextResponse.json({ success: true, visitor: existing });
    }

    // Create new visitor log
    const newVisitor: VisitorLog = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      role: role || "unknown",
      company,
      interests,
      visitedAt: new Date().toISOString(),
      sessionId,
      pages: [],
    };

    visitors.push(newVisitor);
    writeVisitors(visitors);

    return NextResponse.json({ success: true, visitor: newVisitor });
  } catch (error) {
    console.error("Visitor log error:", error);
    return NextResponse.json(
      { error: "Failed to log visitor" },
      { status: 500 }
    );
  }
}
