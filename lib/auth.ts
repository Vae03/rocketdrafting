import { randomBytes, scryptSync, timingSafeEqual, createHash } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "rocketdraft_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const SCRYPT_KEYLEN = 64;

// --- Password hashing -------------------------------------------------------------------------
// Node's built-in scrypt (memory-hard, no extra dependency) with a random per-user salt. Never
// compare hashes with `===` -- timingSafeEqual avoids leaking the match length/position via timing.

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password: string, salt: string, expectedHash: string) {
  const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(expectedHash, "hex");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/** Mirrors the client-side rule stated in the product spec: 8+ characters, at least 1 special
 * (non-alphanumeric) character. Enforced again here since client-side validation is never trusted. */
export function validatePassword(password: string) {
  if (password.length < 8) return "Password must be at least 8 characters long";
  if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least 1 special character";
  if (password.length > 200) return "Password is too long";
  return null;
}

export function validateDisplayName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2 || trimmed.length > 24) return "Display name must be 2-24 characters";
  return null;
}

// --- Sessions ----------------------------------------------------------------------------------
// The cookie carries a random opaque token; only its SHA-256 digest is persisted, so a database
// leak alone can't be replayed as a live session (the same principle as hashing API keys).

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await prisma.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

/** Reads the session cookie, validates it against the DB (dropping it if missing/expired), and
 * returns the signed-in user, or null if there isn't one. Safe to call from any Route Handler. */
export async function getSessionUser() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } });
    return null;
  }
  return session.user;
}

// --- Naive in-memory login throttle -----------------------------------------------------------
// Good enough for a single-instance hobby deployment; a multi-instance deployment would need a
// shared store (Redis, etc.) instead of this process-local map.
const failedAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 8;
const WINDOW_MS = 10 * 60 * 1000;

export function isLoginThrottled(key: string) {
  const entry = failedAttempts.get(key);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) { failedAttempts.delete(key); return false; }
  return entry.count >= MAX_ATTEMPTS;
}

export function recordFailedLogin(key: string) {
  const entry = failedAttempts.get(key);
  if (!entry || Date.now() > entry.resetAt) {
    failedAttempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count++;
  }
}

export function clearFailedLogins(key: string) {
  failedAttempts.delete(key);
}
