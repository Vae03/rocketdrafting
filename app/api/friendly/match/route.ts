import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { simulateDuel } from "@/lib/simulation";

type RosterSlot = { handle: string; rating: number; role: string };

async function areFriends(aId: string, bId: string) {
  const friendship = await prisma.friendship.findFirst({
    where: { status: "ACCEPTED", OR: [{ requesterId: aId, addresseeId: bId }, { requesterId: bId, addresseeId: aId }] },
  });
  return Boolean(friendship);
}

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const friendUserId = typeof body?.friendUserId === "string" ? body.friendUserId : null;
  const teamPower = typeof body?.teamPower === "number" && Number.isFinite(body.teamPower) ? body.teamPower : null;
  const teamSummary: RosterSlot[] = Array.isArray(body?.teamSummary) ? body.teamSummary.slice(0, 5) : [];
  const org = body?.org && typeof body.org === "object" ? body.org : null;

  if (!friendUserId || teamPower === null || teamPower <= 0) {
    return NextResponse.json({ error: "friendUserId and a positive teamPower are required" }, { status: 400 });
  }
  if (!(await areFriends(me.id, friendUserId))) return NextResponse.json({ error: "You're not friends with this player" }, { status: 403 });

  const friend = await prisma.user.findUnique({ where: { id: friendUserId } });
  if (!friend || friend.lastTeamPower === null) return NextResponse.json({ error: "Opponent has no drafted team" }, { status: 409 });

  await prisma.user.update({
    where: { id: me.id },
    data: { lastTeamPower: teamPower, lastTeamSummary: JSON.stringify({ roster: teamSummary, org }) },
  });

  const match = simulateDuel(teamPower, friend.lastTeamPower);
  await prisma.friendlyMatch.create({
    data: {
      hostId: me.id, opponentId: friendUserId,
      hostPower: teamPower, opponentPower: friend.lastTeamPower,
      hostWon: match.won, score: match.score,
    },
  });

  const [myWinsAsHost, myWinsAsOpponent, theirWinsAsHost, theirWinsAsOpponent] = await Promise.all([
    prisma.friendlyMatch.count({ where: { hostId: me.id, opponentId: friendUserId, hostWon: true } }),
    prisma.friendlyMatch.count({ where: { hostId: friendUserId, opponentId: me.id, hostWon: false } }),
    prisma.friendlyMatch.count({ where: { hostId: friendUserId, opponentId: me.id, hostWon: true } }),
    prisma.friendlyMatch.count({ where: { hostId: me.id, opponentId: friendUserId, hostWon: false } }),
  ]);

  return NextResponse.json({
    won: match.won,
    score: match.score,
    opponent: { displayName: friend.displayName, power: friend.lastTeamPower },
    headToHead: { wins: myWinsAsHost + myWinsAsOpponent, losses: theirWinsAsHost + theirWinsAsOpponent },
  });
}
