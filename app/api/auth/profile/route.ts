import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, validateDisplayName } from "@/lib/auth";
import { AVATAR_COLORS, AVATAR_EMOJI, isValidAvatarImageDataUri } from "@/lib/avatar-options";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const data: { displayName?: string; avatarEmoji?: string; avatarColor?: string; avatarImage?: string | null } = {};

  if (typeof body?.displayName === "string") {
    const trimmed = body.displayName.trim();
    const nameError = validateDisplayName(trimmed);
    if (nameError) return NextResponse.json({ error: nameError }, { status: 400 });
    data.displayName = trimmed;
  }
  if (typeof body?.avatarEmoji === "string") {
    if (!AVATAR_EMOJI.includes(body.avatarEmoji)) return NextResponse.json({ error: "Invalid avatar" }, { status: 400 });
    data.avatarEmoji = body.avatarEmoji;
  }
  if (typeof body?.avatarColor === "string") {
    if (!AVATAR_COLORS.includes(body.avatarColor)) return NextResponse.json({ error: "Invalid avatar color" }, { status: 400 });
    data.avatarColor = body.avatarColor;
  }
  if (body?.avatarImage === null) {
    data.avatarImage = null; // explicit removal -> fall back to emoji+color
  } else if (typeof body?.avatarImage === "string") {
    if (!isValidAvatarImageDataUri(body.avatarImage)) return NextResponse.json({ error: "Invalid image (PNG/JPEG/WEBP only, resize and try again)" }, { status: 400 });
    data.avatarImage = body.avatarImage;
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({
    id: updated.id, email: updated.email, displayName: updated.displayName,
    avatarEmoji: updated.avatarEmoji, avatarColor: updated.avatarColor, avatarImage: updated.avatarImage,
  });
}
