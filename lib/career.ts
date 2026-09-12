// Career mode's ladder progress -- separate from the Shop/XP localStorage keys since it's a
// locked, one-directional progression (RLCS Season 1 -> the current season) rather than freely
// replayable state.
import { scopedKey } from "@/lib/profile-scope";

const CAREER_KEY = "rocketdraft.career";

export type CareerState = {
  /** Index into the ascending `seasons` array of the highest season you're allowed to play. */
  unlockedIndex: number;
  /** Season slugs you've actually won the Grand Final of at least once. */
  clearedSlugs: string[];
};

const DEFAULT_CAREER: CareerState = { unlockedIndex: 0, clearedSlugs: [] };

export function readCareer(): CareerState {
  if (typeof window === "undefined") return { ...DEFAULT_CAREER };
  try {
    const raw = window.localStorage.getItem(scopedKey(CAREER_KEY));
    return raw ? { ...DEFAULT_CAREER, ...JSON.parse(raw) } : { ...DEFAULT_CAREER };
  } catch {
    return { ...DEFAULT_CAREER };
  }
}

function writeCareer(state: CareerState) {
  try { window.localStorage.setItem(scopedKey(CAREER_KEY), JSON.stringify(state)); } catch { /* ignore */ }
}

/** Marks `seasonSlug` (at `seasonIndex` in the ascending seasons list) cleared and, unless it was
 * already the last season, unlocks the next one. Idempotent -- clearing the same season again just
 * keeps you at your current progress. */
export function advanceCareer(seasonSlug: string, seasonIndex: number, totalSeasons: number): CareerState {
  const current = readCareer();
  const next: CareerState = {
    unlockedIndex: Math.min(totalSeasons - 1, Math.max(current.unlockedIndex, seasonIndex + 1)),
    clearedSlugs: current.clearedSlugs.includes(seasonSlug) ? current.clearedSlugs : [...current.clearedSlugs, seasonSlug],
  };
  writeCareer(next);
  return next;
}
