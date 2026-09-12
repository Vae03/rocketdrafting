"use client";

import { useState } from "react";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot -- stays empty for real users
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    setStatus("sending"); setError(null);
    try {
      const res = await fetch("/api/contact", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, website }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Etwas ist schiefgelaufen.");
      setStatus("sent");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Etwas ist schiefgelaufen.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return <div className="contact-sent">
      <p>✓ Danke, deine Nachricht ist angekommen. Wir melden uns, sobald wir können.</p>
    </div>;
  }

  return <form onSubmit={submit} className="auth-form contact-form">
    <label>NAME (OPTIONAL)<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label>
    <label>DEINE E-MAIL-ADRESSE<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
    <label>NACHRICHT<textarea value={message} onChange={(e) => setMessage(e.target.value)} required minLength={10} maxLength={4000} rows={6} /></label>
    <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} className="contact-honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    {error && <p className="match-error">{error}</p>}
    <button type="submit" disabled={status === "sending"} className="playoff-button auth-submit">{status === "sending" ? "SENDEN…" : "NACHRICHT SENDEN"} <span>→</span></button>
  </form>;
}
