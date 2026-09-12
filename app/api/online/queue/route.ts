import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rankForMmr, STARTING_MMR } from "@/lib/ranks";
import { BOT_ROSTER, botPower } from "@/lib/bots";
import { seedCards } from "@/lib/seed-data";
import { organizationPool } from "@/lib/organizations";

async function ensureBots() {
  await Promise.all(
    BOT_ROSTER.map(async (bot) => {
      const power = botPower(bot.mmr);
      // A plausible 5-card roster (3 starters, 1 sub, 1 coach) near the bot's intended power,
      // generated once so ranked opponents have something real to reveal during the draft.
      const starters = seedCards.filter((c) => c.role === "STARTER" && Math.abs(c.rating - power) < 6).slice(0, 3);
      const sub = seedCards.find((c) => c.role === "SUBSTITUTE" && Math.abs(c.rating - power) < 10);
      const coach = seedCards.find((c) => c.role === "COACH" && Math.abs(c.rating - power) < 10);
      const roster = [...starters, sub, coach].filter((c): c is NonNullable<typeof c> => Boolean(c));
      const org = organizationPool[bot.mmr % organizationPool.length];
      const summary = JSON.stringify({ roster: roster.map((c) => ({ handle: c.handle, rating: c.rating, role: c.role })), org });
      await prisma.playerIdentity.upsert({
        where: { playerKey: bot.key },
        // Refresh the roster/org snapshot every time (idempotent, cheap) so a bot row created
        // under an older schema shape (e.g. the pre-alternating-draft flat-array summary) or with
        // a stale roster self-heals on the next queue call; never touch mmr/wins/losses here, since
        // those progress through real match results in /api/online/match.
        update: { lastTeamPower: power, lastTeamSummary: summary },
        create: {
          playerKey: bot.key,
          displayName: bot.name,
          isBot: true,
          mmr: bot.mmr,
          lastTeamPower: power,
          lastTeamSummary: summary,
        },
      });
    }),
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const playerKey = typeof body?.playerKey === "string" ? body.playerKey : null;
  const displayName = typeof body?.displayName === "string" && body.displayName.trim() ? body.displayName.trim().slice(0, 24) : null;
  if (!playerKey) return NextResponse.json({ error: "playerKey is required" }, { status: 400 });

  await ensureBots();

  const self = await prisma.playerIdentity.upsert({
    where: { playerKey },
    update: displayName ? { displayName } : {},
    create: { playerKey, displayName: displayName ?? `Rookie-${playerKey.slice(0, 4).toUpperCase()}`, mmr: STARTING_MMR },
  });

  const candidates = await prisma.playerIdentity.findMany({
    where: { id: { not: self.id }, lastTeamSummary: { not: null } },
  });
  if (candidates.length === 0) return NextResponse.json({ error: "No opponents available yet — try again in a moment" }, { status: 503 });
  const opponent = candidates.reduce((closest, candidate) =>
    Math.abs(candidate.mmr - self.mmr) < Math.abs(closest.mmr - self.mmr) ? candidate : closest,
  );

  let parsed: { roster: { handle: string; rating: number; role: string }[]; org: { id: string; name: string; bonus: number; color: string } };
  try {
    parsed = JSON.parse(opponent.lastTeamSummary ?? "{}");
  } catch {
    parsed = { roster: [], org: organizationPool[0] };
  }

  return NextResponse.json({
    opponentId: opponent.id,
    displayName: opponent.displayName,
    isBot: opponent.isBot,
    mmr: opponent.mmr,
    rank: rankForMmr(opponent.mmr),
    power: opponent.lastTeamPower,
    roster: parsed.roster ?? [],
    org: parsed.org ?? organizationPool[0],
  });
}
