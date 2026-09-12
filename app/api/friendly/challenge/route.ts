import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { organizationPool } from "@/lib/organizations";

async function areFriends(aId: string, bId: string) {
  const friendship = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: aId, addresseeId: bId },
        { requesterId: bId, addresseeId: aId },
      ],
    },
  });
  return Boolean(friendship);
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const friendUserId = typeof body?.friendUserId === "string" ? body.friendUserId : null;
  if (!friendUserId) return NextResponse.json({ error: "friendUserId is required" }, { status: 400 });

  if (!(await areFriends(me.id, friendUserId))) return NextResponse.json({ error: "You're not friends with this player" }, { status: 403 });

  const friend = await prisma.user.findUnique({ where: { id: friendUserId } });
  if (!friend) return NextResponse.json({ error: "Player not found" }, { status: 404 });
  if (!friend.lastTeamSummary || friend.lastTeamPower === null) {
    return NextResponse.json({ error: `${friend.displayName} hasn't drafted a team yet` }, { status: 409 });
  }

  let parsed: { roster: { handle: string; rating: number; role: string }[]; org: { id: string; name: string; bonus: number; color: string } | null };
  try {
    parsed = JSON.parse(friend.lastTeamSummary);
  } catch {
    parsed = { roster: [], org: null };
  }

  const [myWinsAsHost, myWinsAsOpponent, theirWinsAsHost, theirWinsAsOpponent] = await Promise.all([
    prisma.friendlyMatch.count({ where: { hostId: me.id, opponentId: friendUserId, hostWon: true } }),
    prisma.friendlyMatch.count({ where: { hostId: friendUserId, opponentId: me.id, hostWon: false } }),
    prisma.friendlyMatch.count({ where: { hostId: friendUserId, opponentId: me.id, hostWon: true } }),
    prisma.friendlyMatch.count({ where: { hostId: me.id, opponentId: friendUserId, hostWon: false } }),
  ]);
  const hostWins = myWinsAsHost + myWinsAsOpponent;
  const opponentWins = theirWinsAsHost + theirWinsAsOpponent;

  return NextResponse.json({
    friendUserId: friend.id,
    displayName: friend.displayName,
    avatarEmoji: friend.avatarEmoji,
    avatarColor: friend.avatarColor,
    avatarImage: friend.avatarImage,
    power: friend.lastTeamPower,
    roster: parsed.roster ?? [],
    org: parsed.org ?? organizationPool[0],
    headToHead: { wins: hostWins, losses: opponentWins },
  });
}
