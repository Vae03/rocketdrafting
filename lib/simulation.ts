import type { DraftCard, DraftTeam, TournamentResult } from "@/lib/types";

export function teamPower(team: DraftTeam) {
  const roster = [...team.starters, team.substitute, team.coach].filter(
    (person): person is DraftCard => Boolean(person),
  );
  if (roster.length !== 5) return 0;
  const average = roster.reduce((total, person) => total + person.rating, 0) / roster.length;
  return Math.round((average + (team.organization?.bonus ?? 0)) * 10) / 10;
}

export function winProbability(ownPower: number, opponentPower: number) {
  return Math.round((ownPower / (ownPower + opponentPower)) * 100);
}

function bo7(chance: number) {
  let mine = 0; let theirs = 0;
  while (mine < 4 && theirs < 4) Math.random() * 100 < chance ? mine++ : theirs++;
  return { won: mine === 4, score: `${mine}–${theirs}` };
}

export function simulatePlayoffs(team: DraftTeam, opponents: Array<{ name: string; power: number }>): { results: TournamentResult[]; xp: number } {
  const power = teamPower(team);
  const rounds: TournamentResult["round"][] = ["Round of 16", "Quarterfinal", "Semifinal", "Grand Final"];
  const results: TournamentResult[] = [];
  for (let index = 0; index < rounds.length; index++) {
    const opponent = opponents[index];
    const match = bo7(winProbability(power, opponent.power));
    results.push({ round: rounds[index], opponent: opponent.name, opponentPower: opponent.power, ...match });
    if (!match.won) return { results, xp: index === 0 ? 75 : index === 1 ? 150 : index === 2 ? 350 : 650 };
  }
  return { results, xp: 1250 };
}

export function levelFromXp(xp: number) {
  // Level 1 at 0 XP; each later level costs slightly more than the previous one.
  let level = 1; let threshold = 1000; let remaining = xp;
  while (remaining >= threshold) { remaining -= threshold; level++; threshold += 500; }
  return { level, intoLevel: remaining, nextLevelXp: threshold };
}

export const defaultOpponents = [
  { name: "Regional Challenger", power: 91.2 },
  { name: "BDS Legacy", power: 94.5 },
  { name: "G2 Dynasty", power: 96.3 },
  { name: "Vitality Icons", power: 97.8 },
];
