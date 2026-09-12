import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: user.id, email: user.email, displayName: user.displayName,
      avatarEmoji: user.avatarEmoji, avatarColor: user.avatarColor, avatarImage: user.avatarImage,
    },
  });
}
