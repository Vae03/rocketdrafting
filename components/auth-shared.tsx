"use client";

import { useState } from "react";

export type AuthUser = { id: string; email: string; displayName: string; avatarEmoji: string; avatarColor: string; avatarImage: string | null };
export type PublicUser = { id: string; displayName: string; avatarEmoji: string; avatarColor: string; avatarImage?: string | null };

export function passwordIssue(password: string) {
  if (password.length < 8) return "At least 8 characters";
  if (!/[^A-Za-z0-9]/.test(password)) return "At least 1 special character";
  return null;
}

export function Avatar({ user, className }: { user: { avatarEmoji: string; avatarColor: string; avatarImage?: string | null }; className: string }) {
  if (user.avatarImage) return <img src={user.avatarImage} alt="" className={`${className} avatar-photo`} />;
  return <span className={className} style={{ "--avatar-color": user.avatarColor } as React.CSSProperties}>{user.avatarEmoji}</span>;
}

export function AuthGate({ onAuthed, compact }: { onAuthed: (user: AuthUser) => void; compact?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pwIssue = mode === "signup" ? passwordIssue(password) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (mode === "signup" && pwIssue) { setError(pwIssue); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "signup" ? { email, password, displayName } : { email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      onAuthed(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return <section className={compact ? "auth-card auth-card-compact" : "auth-card"}>
    <div className="auth-tabs">
      <button type="button" className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("login"); setError(null); }}>SIGN IN</button>
      <button type="button" className={mode === "signup" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("signup"); setError(null); }}>CREATE ACCOUNT</button>
    </div>
    <form onSubmit={submit} className="auth-form">
      {mode === "signup" && <label>DISPLAY NAME<input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={24} required /></label>}
      <label>EMAIL<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
      <label>PASSWORD<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>
      {mode === "signup" && <small className="auth-hint">{pwIssue ? `⚠ ${pwIssue}` : "✓ password meets requirements"}</small>}
      {error && <p className="match-error">{error}</p>}
      <button type="submit" disabled={busy} className="playoff-button auth-submit">{busy ? "…" : mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"} <span>→</span></button>
    </form>
  </section>;
}
