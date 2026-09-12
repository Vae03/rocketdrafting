import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, validateDisplayName, validateEmail, validatePassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const displayName = typeof body?.displayName === "string" ? body.displayName.trim() : "";

  if (!validateEmail(email)) return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 });
  const passwordError = validatePassword(password);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
  const nameError = validateDisplayName(displayName);
  if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

  const { salt, hash } = hashPassword(password);
  const user = await prisma.user.create({
    data: { email, passwordHash: hash, passwordSalt: salt, displayName },
  });
  await createSession(user.id);

  return NextResponse.json({
    id: user.id, email: user.email, displayName: user.displayName,
    avatarEmoji: user.avatarEmoji, avatarColor: user.avatarColor, avatarImage: user.avatarImage,
  });
}
