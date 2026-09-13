// Career mode's ladder progress -- separate from the Shop/XP localStorage keys since it's a
// locked, one-directional progression (RLCS Season 1 -> the current season) rather than freely
// replayable state.
import { scopedKey } from "@/lib/profile-scope";

const CAREER_KEY = "rocketdraft.career";

export type CareerDifficulty = "normal" | "hardcore";

export type CareerState = {
  /** Index into the ascending `seasons` array of the highest season you're allowed to play. */
  unlockedIndex: number;
  /** Season slugs you've actually won the Grand Final of at least once. */
  clearedSlugs: string[];
};

const DEFAULT_CAREER: CareerState = { unlockedIndex: 0, clearedSlugs: [] };

// Normal and Hardcore are two entirely separate ladders -- clearing a season on one doesn't touch
// the other's progress, same as Freeplay's difficulty tiers not sharing state.
function storageKey(difficulty: CareerDifficulty) {
  return `${CAREER_KEY}.${difficulty}`;
}

export function readCareer(difficulty: CareerDifficulty): CareerState {
  if (typeof window === "undefined") return { ...DEFAULT_CAREER };
  try {
    const raw = window.localStorage.getItem(scopedKey(storageKey(difficulty)));
    return raw ? { ...DEFAULT_CAREER, ...JSON.parse(raw) } : { ...DEFAULT_CAREER };
  } catch {
    return { ...DEFAULT_CAREER };
  }
}

function writeCareer(difficulty: CareerDifficulty, state: CareerState) {
  try { window.localStorage.setItem(scopedKey(storageKey(difficulty)), JSON.stringify(state)); } catch { /* ignore */ }
}

/** Marks `seasonSlug` (at `seasonIndex` in the ascending seasons list) cleared on `difficulty`'s
 * ladder and, unless it was already the last season, unlocks the next one there. Idempotent --
 * clearing the same season again just keeps you at your current progress. */
export function advanceCareer(difficulty: CareerDifficulty, seasonSlug: string, seasonIndex: number, totalSeasons: number): CareerState {
  const current = readCareer(difficulty);
  const next: CareerState = {
    unlockedIndex: Math.min(totalSeasons - 1, Math.max(current.unlockedIndex, seasonIndex + 1)),
    clearedSlugs: current.clearedSlugs.includes(seasonSlug) ? current.clearedSlugs : [...current.clearedSlugs, seasonSlug],
  };
  writeCareer(difficulty, next);
  return next;
}
