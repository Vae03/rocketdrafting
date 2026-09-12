import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateEmail } from "@/lib/auth";

// Naive in-memory per-IP throttle, same reasoning as lib/auth.ts's login throttle: fine for a
// single-instance hobby deployment, would need a shared store behind a load balancer.
const recentSubmissions = new Map<string, number>();
const THROTTLE_MS = 60_000;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  // Honeypot: a hidden field real users never fill in. Bots that blindly fill every input do --
  // silently pretend success instead of telling them what tripped it.
  if (typeof body?.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const lastSubmit = recentSubmissions.get(ip);
  if (lastSubmit && Date.now() - lastSubmit < THROTTLE_MS) {
    return NextResponse.json({ error: "Bitte warte kurz, bevor du erneut sendest." }, { status: 429 });
  }

  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 60) : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (!validateEmail(email)) return NextResponse.json({ error: "Bitte gib eine gültige E-Mail-Adresse ein." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ error: "Deine Nachricht ist zu kurz." }, { status: 400 });
  if (message.length > 4000) return NextResponse.json({ error: "Deine Nachricht ist zu lang (max. 4000 Zeichen)." }, { status: 400 });

  await prisma.contactMessage.create({ data: { name: name || null, email, message } });
  recentSubmissions.set(ip, Date.now());

  return NextResponse.json({ ok: true });
}
