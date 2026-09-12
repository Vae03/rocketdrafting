import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { simulateDuel } from "@/lib/simulation";
import { mmrDelta, rankForMmr, STARTING_MMR } from "@/lib/ranks";
import { BOT_ROSTER, botPower } from "@/lib/bots";

type RosterSlot = { handle: string; rating: number; role: string };

// A minimal fallback so a bot row always has *some* valid lastTeamPower if this route is ever hit
// before /api/online/queue has run for that bot (queue's own ensureBots builds the real roster+org
// and overwrites this on the next queue call — kept here only so match simulation never sees null).
async function ensureBots() {
  await Promise.all(
    BOT_ROSTER.map((bot) =>
      prisma.playerIdentity.upsert({
        where: { playerKey: bot.key },
        update: {},
        create: {
          playerKey: bot.key,
          displayName: bot.name,
          isBot: true,
          mmr: bot.mmr,
          lastTeamPower: botPower(bot.mmr),
          lastTeamSummary: JSON.stringify({ roster: [], org: null }),
        },
      }),
    ),
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const playerKey = typeof body?.playerKey === "string" ? body.playerKey : null;
  const teamPower = typeof body?.teamPower === "number" && Number.isFinite(body.teamPower) ? body.teamPower : null;
  const displayName = typeof body?.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 24) : null;
  const teamSummary: RosterSlot[] = Array.isArray(body?.teamSummary) ? body.teamSummary.slice(0, 5) : [];
  const org = body?.org && typeof body.org === "object" ? body.org : null;
  const opponentId = typeof body?.opponentId === "string" ? body.opponentId : null;

  if (!playerKey || teamPower === null || teamPower <= 0) {
    return NextResponse.json({ error: "playerKey and a positive teamPower are required" }, { status: 400 });
  }

  await ensureBots();

  const storedSummary = JSON.stringify({ roster: teamSummary, org });
  const self = await prisma.playerIdentity.upsert({
    where: { playerKey },
    update: { lastTeamPower: teamPower, lastTeamSummary: storedSummary, ...(displayName ? { displayName } : {}) },
    create: {
      playerKey,
      displayName: displayName ?? `Rookie-${playerKey.slice(0, 4).toUpperCase()}`,
      mmr: STARTING_MMR,
      lastTeamPower: teamPower,
      lastTeamSummary: storedSummary,
    },
  });

  // Prefer the specific opponent identified during /api/online/queue (so the alternating draft
  // you just watched is the same opponent you're actually being scored against); fall back to a
  // fresh closest-MMR search for resilience (e.g. direct API use, or the queued opponent vanished).
  const opponent = opponentId
    ? await prisma.playerIdentity.findUnique({ where: { id: opponentId } })
    : await (async () => {
      const candidates = await prisma.playerIdentity.findMany({ where: { id: { not: self.id }, lastTeamPower: { not: null } } });
      if (candidates.length === 0) return null;
      return candidates.reduce((closest, candidate) => Math.abs(candidate.mmr - self.mmr) < Math.abs(closest.mmr - self.mmr) ? candidate : closest);
    })();
  if (!opponent) {
    return NextResponse.json({ error: "No opponents available yet — try again in a moment" }, { status: 503 });
  }

  const match = simulateDuel(teamPower, opponent.lastTeamPower!);
  const delta = mmrDelta(self.mmr, opponent.mmr, match.won);
  const newSelfMmr = Math.max(0, self.mmr + delta);
  const newOpponentMmr = Math.max(0, opponent.mmr - delta);

  await prisma.$transaction([
    prisma.playerIdentity.update({
      where: { id: self.id },
      data: { mmr: newSelfMmr, wins: { increment: match.won ? 1 : 0 }, losses: { increment: match.won ? 0 : 1 } },
    }),
    prisma.playerIdentity.update({
      where: { id: opponent.id },
      data: { mmr: newOpponentMmr, wins: { increment: match.won ? 0 : 1 }, losses: { increment: match.won ? 1 : 0 } },
    }),
    prisma.match.create({
      data: {
        challengerId: self.id,
        opponentId: opponent.id,
        challengerPower: teamPower,
        opponentPower: opponent.lastTeamPower!,
        challengerWon: match.won,
        score: match.score,
        mmrDelta: delta,
      },
    }),
  ]);

  return NextResponse.json({
    won: match.won,
    score: match.score,
    delta,
    mmr: newSelfMmr,
    rank: rankForMmr(newSelfMmr),
    opponent: {
      displayName: opponent.displayName,
      isBot: opponent.isBot,
      mmr: opponent.mmr,
      power: opponent.lastTeamPower,
      rank: rankForMmr(opponent.mmr),
    },
  });
}

export async function GET(req: NextRequest) {
  const playerKey = req.nextUrl.searchParams.get("playerKey");
  if (!playerKey) return NextResponse.json({ error: "playerKey is required" }, { status: 400 });
  const self = await prisma.playerIdentity.findUnique({ where: { playerKey } });
  if (!self) return NextResponse.json({ mmr: STARTING_MMR, rank: rankForMmr(STARTING_MMR), wins: 0, losses: 0, isNew: true });
  return NextResponse.json({ mmr: self.mmr, rank: rankForMmr(self.mmr), wins: self.wins, losses: self.losses, isNew: false });
}
