import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId : null;
  if (!targetUserId) return NextResponse.json({ error: "targetUserId is required" }, { status: 400 });
  if (targetUserId === me.id) return NextResponse.json({ error: "You can't friend yourself" }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: me.id, addresseeId: targetUserId },
        { requesterId: targetUserId, addresseeId: me.id },
      ],
    },
  });

  if (existing?.status === "ACCEPTED") return NextResponse.json({ error: "You're already friends" }, { status: 409 });
  if (existing && existing.requesterId === me.id) return NextResponse.json({ error: "Request already sent" }, { status: 409 });
  // They'd already sent us a request -- accept it instead of creating a mirrored duplicate row.
  if (existing && existing.requesterId === targetUserId) {
    const accepted = await prisma.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
    return NextResponse.json({ friendshipId: accepted.id, status: "ACCEPTED" });
  }

  const created = await prisma.friendship.create({ data: { requesterId: me.id, addresseeId: targetUserId } });
  return NextResponse.json({ friendshipId: created.id, status: "PENDING" });
}
