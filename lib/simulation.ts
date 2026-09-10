import type { DraftCard, DraftTeam, PlayoffStage, TournamentResult } from "@/lib/types";

export function teamPower(team: DraftTeam) {
  const roster = [...team.starters, team.substitute, team.coach].filter(
    (person): person is DraftCard => Boolean(person),
  );
  if (roster.length !== 5) return 0;
  const average = roster.reduce((total, person) => total + person.rating, 0) / roster.length;
  return Math.round((average + (team.organization?.bonus ?? 0)) * 10) / 10;
}

export const UPSET_CHANCE = 30;

/** The higher-power side wins 100-UPSET_CHANCE% of the time -- a flat favorite/underdog split
 * rather than a continuous ratio, so a real power advantage reliably matters instead of washing
 * out into a near-50/50 curve when two ratings are close. Equal power is a true coin flip. */
export function winProbability(ownPower: number, opponentPower: number) {
  if (ownPower === opponentPower) return 50;
  return ownPower > opponentPower ? 100 - UPSET_CHANCE : UPSET_CHANCE;
}

export function bo7(chance: number) {
  let mine = 0; let theirs = 0;
  while (mine < 4 && theirs < 4) Math.random() * 100 < chance ? mine++ : theirs++;
  return { won: mine === 4, score: `${mine}–${theirs}` };
}

/** One Bo7 between two raw power numbers (no DraftTeam needed) -- used by the online duel API. */
export function simulateDuel(ownPower: number, opponentPower: number) {
  return bo7(winProbability(ownPower, opponentPower));
}

export const playoffStages: PlayoffStage[] = ["Top 16", "Top 8", "Top 4", "Final"];

/** Simulates one stage at a time so the caller can reveal + animate each result before advancing. */
export function simulateStage(team: DraftTeam, stage: PlayoffStage, opponent: { name: string; power: number }): TournamentResult {
  const power = teamPower(team);
  const match = bo7(winProbability(power, opponent.power));
  return { round: stage, opponent: opponent.name, opponentPower: opponent.power, ...match };
}

export function xpForElimination(stageIndex: number) {
  return stageIndex === 0 ? 75 : stageIndex === 1 ? 150 : stageIndex === 2 ? 350 : 650;
}

export const championXp = 1250;

export function simulatePlayoffs(team: DraftTeam, opponents: Array<{ name: string; power: number }>): { results: TournamentResult[]; xp: number } {
  const results: TournamentResult[] = [];
  for (let index = 0; index < playoffStages.length; index++) {
    const match = simulateStage(team, playoffStages[index], opponents[index]);
    results.push(match);
    if (!match.won) return { results, xp: xpForElimination(index) };
  }
  return { results, xp: championXp };
}

export function levelFromXp(xp: number) {
  // Level 1 at 0 XP; each later level costs slightly more than the previous one.
  let level = 1; let threshold = 1000; let remaining = xp;
  while (remaining >= threshold) { remaining -= threshold; level++; threshold += 500; }
  return { level, intoLevel: remaining, nextLevelXp: threshold };
}

export const COINS_PER_LEVEL = 10;

/** Coins earned going from oldXp to newXp, based on how many levels were actually crossed. */
export function coinsEarned(oldXp: number, newXp: number) {
  return Math.max(0, levelFromXp(newXp).level - levelFromXp(oldXp).level) * COINS_PER_LEVEL;
}

export const defaultOpponents = [
  { name: "Regional Challenger", power: 91.2 },
  { name: "BDS Legacy", power: 94.5 },
  { name: "G2 Dynasty", power: 96.3 },
  { name: "Vitality Icons", power: 97.8 },
];

/** Builds the 4 bracket opponents from the real teams of a season, weakest to strongest. */
export function seasonOpponents(seasonCards: DraftCard[]) {
  const byTeam = new Map<string, number[]>();
  for (const card of seasonCards) {
    if (!byTeam.has(card.team)) byTeam.set(card.team, []);
    byTeam.get(card.team)!.push(card.rating);
  }
  const teams = [...byTeam.entries()]
    .map(([name, ratings]) => ({ name, power: Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 }))
    .sort((a, b) => a.power - b.power);
  if (teams.length < playoffStages.length) return defaultOpponents;
  const pickAt = (fraction: number) => teams[Math.min(teams.length - 1, Math.floor(fraction * (teams.length - 1)))];
  return [pickAt(0.35), pickAt(0.6), pickAt(0.85), pickAt(1)];
}
