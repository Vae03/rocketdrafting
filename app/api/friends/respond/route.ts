import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const friendshipId = typeof body?.friendshipId === "string" ? body.friendshipId : null;
  const accept = Boolean(body?.accept);
  if (!friendshipId) return NextResponse.json({ error: "friendshipId is required" }, { status: 400 });

  const friendship = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!friendship || friendship.addresseeId !== me.id) return NextResponse.json({ error: "Request not found" }, { status: 404 });

  if (accept) {
    await prisma.friendship.update({ where: { id: friendshipId }, data: { status: "ACCEPTED" } });
  } else {
    await prisma.friendship.delete({ where: { id: friendshipId } });
  }
  return NextResponse.json({ ok: true });
}
