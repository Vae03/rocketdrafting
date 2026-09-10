// Central, localStorage-backed player stats. Every counter here exists because a badge
// challenge in lib/badges.ts reads it -- see that file for the 30 challenge definitions.
export type PlayerStats = {
  campaignWins: number;
  campaignLosses: number;
  campaignDrafts: number;
  campaignWinStreak: number;
  campaignBestWinStreak: number;
  hardcoreWins: number;
  legendsDrafts: number;
  noRerollChampionships: number;
  rankedWins: number;
  rankedLosses: number;
  rankedDrafts: number;
  rankedWinStreak: number;
  rankedBestWinStreak: number;
  underdogWins: number;
  rerollsUsed: number;
  coinsSpent: number;
  peakPower: number;
  peakMmr: number;
  peakCoins: number;
  top4Finishes: number;
  finalsReached: number;
  championshipSeasons: string[];
  seasonsDrafted: string[];
  coachesDrafted: string[];
  orgsDrafted: Record<string, number>;
  subPicksBelowSeventy: number;
  daysPlayed: string[];
};

export const DEFAULT_STATS: PlayerStats = {
  campaignWins: 0,
  campaignLosses: 0,
  campaignDrafts: 0,
  campaignWinStreak: 0,
  campaignBestWinStreak: 0,
  hardcoreWins: 0,
  legendsDrafts: 0,
  noRerollChampionships: 0,
  rankedWins: 0,
  rankedLosses: 0,
  rankedDrafts: 0,
  rankedWinStreak: 0,
  rankedBestWinStreak: 0,
  underdogWins: 0,
  rerollsUsed: 0,
  coinsSpent: 0,
  peakPower: 0,
  peakMmr: 0,
  peakCoins: 0,
  top4Finishes: 0,
  finalsReached: 0,
  championshipSeasons: [],
  seasonsDrafted: [],
  coachesDrafted: [],
  orgsDrafted: {},
  subPicksBelowSeventy: 0,
  daysPlayed: [],
};

const STATS_KEY = "rocketdraft.stats";

export function readStats(): PlayerStats {
  if (typeof window === "undefined") return { ...DEFAULT_STATS };
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    return raw ? { ...DEFAULT_STATS, ...JSON.parse(raw) } : { ...DEFAULT_STATS };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function writeStats(stats: PlayerStats) {
  try { window.localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
}

/** Applies a partial update (numbers add, arrays/records merge uniquely) and persists it. */
export function updateStats(patch: Partial<PlayerStats> & { addSeason?: string; addCoach?: string; addOrg?: string; addDay?: string }): PlayerStats {
  const current = readStats();
  const next: PlayerStats = { ...current };
  for (const key of Object.keys(patch) as (keyof PlayerStats)[]) {
    if (key === "championshipSeasons" || key === "seasonsDrafted" || key === "coachesDrafted" || key === "daysPlayed") continue;
    if (key === "orgsDrafted") continue;
    const value = patch[key];
    if (typeof value === "number") (next[key] as number) = value;
  }
  if (patch.addSeason && !next.seasonsDrafted.includes(patch.addSeason)) next.seasonsDrafted = [...next.seasonsDrafted, patch.addSeason];
  if (patch.addCoach && !next.coachesDrafted.includes(patch.addCoach)) next.coachesDrafted = [...next.coachesDrafted, patch.addCoach];
  if (patch.addDay && !next.daysPlayed.includes(patch.addDay)) next.daysPlayed = [...next.daysPlayed, patch.addDay];
  if (patch.addOrg) next.orgsDrafted = { ...next.orgsDrafted, [patch.addOrg]: (next.orgsDrafted[patch.addOrg] ?? 0) + 1 };
  if (Array.isArray(patch.championshipSeasons)) next.championshipSeasons = patch.championshipSeasons;
  writeStats(next);
  return next;
}

type NumericStatKey = { [K in keyof PlayerStats]: PlayerStats[K] extends number ? K : never }[keyof PlayerStats];

/** Reads current stats, adds `amount` to a numeric field, persists, returns the new stats. */
export function incrementStat(key: NumericStatKey, amount = 1): PlayerStats {
  const current = readStats();
  const next = { ...current, [key]: (current[key] as number) + amount };
  writeStats(next);
  return next;
}

/** Reads current stats, raises a numeric field to at least `value` (peak tracking), persists. */
export function raiseStatCeiling(key: NumericStatKey, value: number): PlayerStats {
  const current = readStats();
  if (value <= (current[key] as number)) return current;
  const next = { ...current, [key]: value };
  writeStats(next);
  return next;
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function maxOrgUses(stats: PlayerStats) {
  return Object.values(stats.orgsDrafted).reduce((max, n) => Math.max(max, n), 0);
}
