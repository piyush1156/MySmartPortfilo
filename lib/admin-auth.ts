import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const OTP_FILE = join(process.cwd(), "data", "otp-store.json");
const SESSION_FILE = join(process.cwd(), "data", "admin-session.json");

// Owner email — only this email can access admin
const OWNER_EMAIL = process.env.ADMIN_EMAIL || "hello@piyush.dev";

interface OTPStore {
  [email: string]: {
    code: string;
    expiresAt: number;
    attempts: number;
  };
}

interface SessionStore {
  [token: string]: {
    email: string;
    createdAt: number;
    expiresAt: number;
  };
}

function readOTPStore(): OTPStore {
  try {
    if (!existsSync(OTP_FILE)) {
      writeFileSync(OTP_FILE, "{}", "utf-8");
      return {};
    }
    return JSON.parse(readFileSync(OTP_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeOTPStore(store: OTPStore) {
  writeFileSync(OTP_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function readSessionStore(): SessionStore {
  try {
    if (!existsSync(SESSION_FILE)) {
      writeFileSync(SESSION_FILE, "{}", "utf-8");
      return {};
    }
    return JSON.parse(readFileSync(SESSION_FILE, "utf-8"));
  } catch {
    return {};
  }
}

function writeSessionStore(store: SessionStore) {
  writeFileSync(SESSION_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function storeOTP(email: string, code: string) {
  const store = readOTPStore();
  store[email.toLowerCase()] = {
    code,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    attempts: 0,
  };
  writeOTPStore(store);
}

export function verifyOTP(email: string, code: string): boolean {
  const store = readOTPStore();
  const entry = store[email.toLowerCase()];
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    delete store[email.toLowerCase()];
    writeOTPStore(store);
    return false;
  }
  entry.attempts++;
  if (entry.attempts > 5) {
    delete store[email.toLowerCase()];
    writeOTPStore(store);
    return false;
  }
  writeOTPStore(store);
  return entry.code === code;
}

export function createSession(email: string): string {
  const token = generateToken();
  const store = readSessionStore();

  // Clean old sessions
  const now = Date.now();
  for (const [key, session] of Object.entries(store)) {
    if (now > session.expiresAt) delete store[key];
  }

  store[token] = {
    email: email.toLowerCase(),
    createdAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
  };
  writeSessionStore(store);
  return token;
}

export function verifySession(token: string): boolean {
  const store = readSessionStore();
  const session = store[token];
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    delete store[token];
    writeSessionStore(store);
    return false;
  }
  return true;
}

export function isOwnerEmail(email: string): boolean {
  return email.toLowerCase() === OWNER_EMAIL.toLowerCase();
}

export function getOwnerEmail(): string {
  return OWNER_EMAIL;
}

function generateToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}
