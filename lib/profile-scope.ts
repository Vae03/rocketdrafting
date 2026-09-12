// Every piece of local game progress (coins, XP, shop, stats, career, the anonymous ranked
// identity) used to live under one fixed localStorage key, shared by the whole browser regardless
// of which account was signed in -- so creating a second account just kept seeing the first
// account's coins/level/shop items instead of starting fresh. This namespaces every such key by
// whichever profile is currently "active" on this device, so each account gets its own bucket.
const ACTIVE_PROFILE_KEY = "rocketdraft.activeProfile";
export const GUEST_PROFILE = "guest";

export function getActiveProfileId(): string {
  if (typeof window === "undefined") return GUEST_PROFILE;
  try {
    return window.localStorage.getItem(ACTIVE_PROFILE_KEY) || GUEST_PROFILE;
  } catch {
    return GUEST_PROFILE;
  }
}

/** Switches which profile's data bucket subsequent reads/writes land in. Callers should reload
 * the page right after (see profile.tsx) so every already-mounted component re-reads its state
 * from the new bucket instead of continuing to show the previous profile's cached values. */
export function setActiveProfileId(id: string) {
  try { window.localStorage.setItem(ACTIVE_PROFILE_KEY, id); } catch { /* ignore */ }
}

export function resetToGuestProfile() {
  setActiveProfileId(GUEST_PROFILE);
}

export function scopedKey(baseKey: string): string {
  return `${baseKey}::${getActiveProfileId()}`;
}
