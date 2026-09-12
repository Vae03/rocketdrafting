import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearFailedLogins, createSession, isLoginThrottled, recordFailedLogin, validateEmail, verifyPassword } from "@/lib/auth";

const GENERIC_ERROR = "Invalid email or password";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!validateEmail(email) || !password) return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });

  if (isLoginThrottled(email)) {
    return NextResponse.json({ error: "Too many failed attempts. Try again in a few minutes." }, { status: 429 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    recordFailedLogin(email);
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }
  clearFailedLogins(email);

  await createSession(user.id);
  return NextResponse.json({
    id: user.id, email: user.email, displayName: user.displayName,
    avatarEmoji: user.avatarEmoji, avatarColor: user.avatarColor, avatarImage: user.avatarImage,
  });
}
