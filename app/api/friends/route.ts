import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

function publicUser(u: { id: string; displayName: string; avatarEmoji: string; avatarColor: string; avatarImage: string | null }) {
  return { id: u.id, displayName: u.displayName, avatarEmoji: u.avatarEmoji, avatarColor: u.avatarColor, avatarImage: u.avatarImage };
}

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const rows = await prisma.friendship.findMany({
    where: { OR: [{ requesterId: me.id }, { addresseeId: me.id }] },
    include: { requester: true, addressee: true },
    orderBy: { createdAt: "desc" },
  });

  const friends = rows
    .filter((r) => r.status === "ACCEPTED")
    .map((r) => ({ friendshipId: r.id, user: publicUser(r.requesterId === me.id ? r.addressee : r.requester) }));
  const incoming = rows
    .filter((r) => r.status === "PENDING" && r.addresseeId === me.id)
    .map((r) => ({ friendshipId: r.id, user: publicUser(r.requester) }));
  const outgoing = rows
    .filter((r) => r.status === "PENDING" && r.requesterId === me.id)
    .map((r) => ({ friendshipId: r.id, user: publicUser(r.addressee) }));

  return NextResponse.json({ friends, incoming, outgoing });
}
