/**
 * JWT cookie auth — replaces Supabase Auth.
 * Symmetric HS256 with a secret derived from a local file (auto-generated on first boot).
 */
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getDb, uuid } from "./db";

export const COOKIE_NAME = "dh_session";
const SECRET_FILE = path.join(process.cwd(), "data", ".jwt-secret");

function getSecret(): Uint8Array {
  // 1) Prefer env var (so middleware/edge runtime works too)
  if (process.env.JWT_SECRET) return new TextEncoder().encode(process.env.JWT_SECRET);
  // 2) Fall back to local file (server-only)
  if (fs.existsSync(SECRET_FILE)) return new TextEncoder().encode(fs.readFileSync(SECRET_FILE, "utf8"));
  const dir = path.dirname(SECRET_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const s = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
  return new TextEncoder().encode(s);
}

export interface SessionUser {
  id: string;
  email: string;
  role: "subscriber" | "admin";
}

export async function signSession(user: SessionUser): Promise<string> {
  return await new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return { id: payload.sub as string, email: payload.email as string, role: payload.role as "subscriber" | "admin" };
  } catch { return null; }
}

export async function getServerUser(): Promise<SessionUser | null> {
  const c = cookies().get(COOKIE_NAME)?.value;
  if (!c) return null;
  return await verifySession(c);
}

export async function setSessionCookie(user: SessionUser) {
  const token = await signSession(user);
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });
}

export function clearSessionCookie() {
  cookies().delete(COOKIE_NAME);
}

export interface AuthResult { user?: SessionUser; error?: string; }

export async function signupUser(email: string, password: string, fullName?: string): Promise<AuthResult> {
  const db = getDb();
  email = email.trim().toLowerCase();
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Invalid email" };
  if (!password || password.length < 8) return { error: "Password must be at least 8 characters" };
  const existing = db.prepare("SELECT id FROM profiles WHERE email = ?").get(email);
  if (existing) return { error: "An account with that email already exists" };
  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(`INSERT INTO profiles (id, email, password_hash, full_name, role) VALUES (?, ?, ?, ?, 'subscriber')`)
    .run(id, email, hash, fullName ?? "");
  const user: SessionUser = { id, email, role: "subscriber" };
  await setSessionCookie(user);
  return { user };
}

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  const db = getDb();
  email = email.trim().toLowerCase();
  const row = db.prepare("SELECT id, email, password_hash, role FROM profiles WHERE email = ?").get(email) as any;
  if (!row) return { error: "Invalid email or password" };
  if (!bcrypt.compareSync(password, row.password_hash)) return { error: "Invalid email or password" };
  const user: SessionUser = { id: row.id, email: row.email, role: row.role };
  await setSessionCookie(user);
  return { user };
}
