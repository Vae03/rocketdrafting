// Cold-start matchmaking backfill: a fixed pool of practice opponents so ranked play always has
// someone to match against, even before other real players have queued. Real humans are always
// preferred once they exist (see app/api/online/match/route.ts) -- these just keep the ladder
// alive in the meantime, the same way most matchmaking systems backfill thin queues with bots.
// MMR values are spread across the full 0-1800 ladder (see lib/ranks.ts) so the leaderboard and
// matchmaking pool cover every tier from Bronze to Grand Champion.
export const BOT_ROSTER = [
  { key: "bot-rookie-1", name: "ChallengerBot Ana", mmr: 90 },
  { key: "bot-rookie-2", name: "ChallengerBot Milo", mmr: 250 },
  { key: "bot-climber-1", name: "LadderBot Priya", mmr: 430 },
  { key: "bot-climber-2", name: "LadderBot Kian", mmr: 700 },
  { key: "bot-climber-3", name: "LadderBot Jonas", mmr: 800 },
  { key: "bot-veteran-1", name: "SwissStageBot Mira", mmr: 1000 },
  { key: "bot-veteran-2", name: "SwissStageBot Talia", mmr: 1150 },
  { key: "bot-veteran-3", name: "SwissStageBot Deniz", mmr: 1280 },
  { key: "bot-pro-1", name: "MajorBot Rowan", mmr: 1350 },
  { key: "bot-pro-2", name: "MajorBot Suvi", mmr: 1480 },
  { key: "bot-legend-1", name: "WorldsBot Ezra", mmr: 1620 },
  { key: "bot-legend-2", name: "WorldsBot Noor", mmr: 1750 },
];

const SSL_MMR_REFERENCE = 1800;

export function botPower(mmr: number) {
  return Math.round((70 + (mmr / SSL_MMR_REFERENCE) * 29) * 10) / 10;
}
