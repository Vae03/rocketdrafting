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

export type GameResult = { won: boolean; myGoals: number; theirGoals: number };

/** One RL game's goal line -- the winner scores 2-7, the loser trails by a random margin
 * (closer games are more common than blowouts). Used for the match-by-match simulation view. */
function simulateGame(won: boolean): GameResult {
  const winnerGoals = 2 + Math.floor(Math.random() * 6);
  const margin = 1 + Math.floor(Math.random() * Math.min(winnerGoals, 4));
  const loserGoals = Math.max(0, winnerGoals - margin);
  return won ? { won, myGoals: winnerGoals, theirGoals: loserGoals } : { won, myGoals: loserGoals, theirGoals: winnerGoals };
}

export function bo7(chance: number) {
  let mine = 0; let theirs = 0;
  const games: GameResult[] = [];
  while (mine < 4 && theirs < 4) {
    const won = Math.random() * 100 < chance;
    games.push(simulateGame(won));
    won ? mine++ : theirs++;
  }
  return { won: mine === 4, score: `${mine}–${theirs}`, games };
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

/** Career mode's per-game win chance: starts identical to a normal Freeplay matchup (careerIndex 0,
 * i.e. RLCS Season 1) and compounds harder every step up the ladder, shaving points off whichever
 * side you'd normally be favored/underdog at -- so even a genuinely stronger-rated late-career
 * roster can't just coast, matching "fight your way up, exponentially harder" from the design brief.
 * Floored at 15% so the very top of the ladder stays theoretically winnable, never a guaranteed loss. */
export function careerWinChance(ownPower: number, opponentPower: number, careerIndex: number) {
  const base = winProbability(ownPower, opponentPower);
  const drag = Math.min(35, Math.round((Math.pow(1.22, careerIndex) - 1) * 4));
  return Math.max(15, base - drag);
}

export function simulateCareerStage(team: DraftTeam, stage: PlayoffStage, opponent: { name: string; power: number }, careerIndex: number): TournamentResult {
  const power = teamPower(team);
  const match = bo7(careerWinChance(power, opponent.power, careerIndex));
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

/** Builds 4 bracket opponents from the real teams of a season, escalating in difficulty but
 * randomized within each band so replaying the same season doesn't always face the same 4 teams. */
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
  // Each stage draws from a widening slice of the strength-sorted field so Top 16 is never the
  // very weakest team and the Final is never anyone but a genuine top team, but which team within
  // that band is random.
  const bands: [number, number][] = [[0.2, 0.55], [0.4, 0.75], [0.65, 0.92], [0.85, 1]];
  const used = new Set<string>();
  return bands.map(([lo, hi]) => {
    const loIdx = Math.floor(lo * (teams.length - 1));
    const hiIdx = Math.max(loIdx, Math.floor(hi * (teams.length - 1)));
    const candidates = teams.slice(loIdx, hiIdx + 1).filter((t) => !used.has(t.name));
    const options = candidates.length > 0 ? candidates : teams.filter((t) => !used.has(t.name));
    const pick = options[Math.floor(Math.random() * options.length)] ?? teams[teams.length - 1];
    used.add(pick.name);
    return pick;
  });
}

/** Coins awarded for reaching (not necessarily winning) a stage, scaled by how strong that
 * stage's opponent was -- beating a tougher team is worth more. */
export function coinsForStage(stageIndex: number, opponentPower: number) {
  const base = [4, 8, 16, 30][stageIndex] ?? 4;
  const strengthBonus = Math.max(0, Math.round((opponentPower - 70) / 3));
  return base + strengthBonus;
}
