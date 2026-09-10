// Rank tiers modeled after Rocket League's current competitive ladder (Bronze -> Supersonic
// Legend, three divisions per tier except the single-division top rank). Division widths are
// deliberately widest in the Gold-through-Champion range and narrowest at the Bronze and Grand
// Champion tails -- an editorial approximation of RL's real population bulge (most players sit
// in the middle of the ladder), and wide enough that one match's MMR swing essentially never
// skips a whole tier. This is a game-balance heuristic, not Psyonix's real MMR curve.
const TIER_DEFS = [
  { tier: "Bronze", divisionWidth: 60 },
  { tier: "Silver", divisionWidth: 70 },
  { tier: "Gold", divisionWidth: 90 },
  { tier: "Platinum", divisionWidth: 110 },
  { tier: "Diamond", divisionWidth: 110 },
  { tier: "Champion", divisionWidth: 90 },
  { tier: "Grand Champion", divisionWidth: 70 },
] as const;
const DIVISIONS_PER_TIER = 3;

const TIER_STARTS = (() => {
  let mmr = 0;
  return TIER_DEFS.map((def) => {
    const start = mmr;
    mmr += def.divisionWidth * DIVISIONS_PER_TIER;
    return start;
  });
})();
export const SSL_THRESHOLD = TIER_STARTS[TIER_STARTS.length - 1] + TIER_DEFS[TIER_DEFS.length - 1].divisionWidth * DIVISIONS_PER_TIER; // 1800

// Gold II -- a modest "decent but unproven" starting point with room to climb or fall either way.
export const STARTING_MMR = TIER_STARTS[2] + TIER_DEFS[2].divisionWidth;

export type RankInfo = { name: string; tier: string; division: number | null; mmr: number; intoDivision: number; divisionSpan: number; orderIndex: number };

export function rankForMmr(mmr: number): RankInfo {
  const clamped = Math.max(0, mmr);
  if (clamped >= SSL_THRESHOLD) {
    return { name: "Supersonic Legend", tier: "Supersonic Legend", division: null, mmr, intoDivision: clamped - SSL_THRESHOLD, divisionSpan: 0, orderIndex: TIER_DEFS.length * DIVISIONS_PER_TIER };
  }
  let tierIndex = TIER_DEFS.length - 1;
  for (let i = 0; i < TIER_DEFS.length; i++) {
    if (clamped < TIER_STARTS[i] + TIER_DEFS[i].divisionWidth * DIVISIONS_PER_TIER) { tierIndex = i; break; }
  }
  const def = TIER_DEFS[tierIndex];
  const intoTier = clamped - TIER_STARTS[tierIndex];
  const division = Math.min(DIVISIONS_PER_TIER, Math.floor(intoTier / def.divisionWidth) + 1);
  return {
    name: `${def.tier} ${toRoman(division)}`,
    tier: def.tier,
    division,
    mmr,
    intoDivision: intoTier % def.divisionWidth,
    divisionSpan: def.divisionWidth,
    orderIndex: tierIndex * DIVISIONS_PER_TIER + (division - 1),
  };
}

function toRoman(n: number) {
  return ["", "I", "II", "III"][n] ?? String(n);
}

/** Elo-style MMR delta: bigger gain for beating a higher-rated opponent, symmetric loss. */
export function mmrDelta(selfMmr: number, opponentMmr: number, won: boolean, kFactor = 24) {
  const expected = 1 / (1 + Math.pow(10, (opponentMmr - selfMmr) / 400));
  const score = won ? 1 : 0;
  return Math.round(kFactor * (score - expected));
}
