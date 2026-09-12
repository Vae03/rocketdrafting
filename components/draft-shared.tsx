"use client";

import { useEffect, useMemo, useState } from "react";
import type { DraftCard, DraftOrganization } from "@/lib/types";
import { countryToIso } from "@/lib/flags";
import { FlagIcon } from "@/components/flag-icon";
import { organizationPool } from "@/lib/organizations";
import { scopedKey } from "@/lib/profile-scope";

export const COIN_STORAGE_KEY = "rocketdraft.coins";
export const XP_STORAGE_KEY = "rocketdraft.xp";
export const PLAYER_KEY_STORAGE_KEY = "rocketdraft.playerKey";

export { organizationPool };

export function drawOrgOffer() {
  return [...organizationPool].sort(() => Math.random() - 0.5).slice(0, 3);
}

const HOLO_BENCH_RATING = 87; // any STARTER card rated below this is also sub-eligible (real bench players skew lower-rated)
const HOLO_DRAW_WEIGHT = 1;
const NORMAL_DRAW_WEIGHT = 24; // holo cards are ~24x rarer to pull than a normal card

function weightedSample<T extends { isHolo?: boolean }>(items: T[], count: number): T[] {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const weights = pool.map((item) => (item.isHolo ? HOLO_DRAW_WEIGHT : NORMAL_DRAW_WEIGHT));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let index = weights.length - 1;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) { index = i; break; }
    }
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

/** `fallbackPool` (pass the full all-seasons card list) covers a season-scoped `pool` that has zero
 * eligible cards for a role -- e.g. RLCS Season 1 (2016) has no cards tagged COACH at all, since
 * Liquipedia doesn't credit coaches that early. Without a fallback, a season-locked draft (Freeplay
 * or Career) would offer 0 cards and get stuck forever on that pick. */
export function drawOffer(pool: DraftCard[], role: DraftCard["role"], excluded: string[], fallbackPool?: DraftCard[]) {
  const matches = (card: DraftCard) => {
    if (excluded.includes(card.id)) return false;
    if (role === "SUBSTITUTE") return card.role === "SUBSTITUTE" || (card.role === "STARTER" && card.rating < HOLO_BENCH_RATING);
    return card.role === role;
  };
  let eligible = pool.filter(matches);
  if (eligible.length === 0 && fallbackPool) eligible = fallbackPool.filter(matches);
  return weightedSample(eligible, 3);
}

export function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function readStoredNumber(key: string) {
  if (typeof window === "undefined") return 0;
  try {
    const stored = Number(window.localStorage.getItem(scopedKey(key)));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0; // localStorage unavailable (private mode, etc.) - fall back to in-memory only
  }
}

export function readStoredString(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(scopedKey(key));
  } catch {
    return null;
  }
}

export function writeStoredValue(key: string, value: string) {
  try { window.localStorage.setItem(scopedKey(key), value); } catch { /* ignore */ }
}

const BADGE_PALETTE = ["#ff5f6d", "#ffc371", "#4facfe", "#43e97b", "#fa709a", "#a18cd1", "#f6d365", "#30cfd0", "#ff9a9e", "#84fab0"];

export function teamBadgeColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return BADGE_PALETTE[hash % BADGE_PALETTE.length];
}

export function TeamBadge({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  return <span className={`team-badge team-badge-${size}`} style={{ "--badge-color": teamBadgeColor(name) } as React.CSSProperties}>{initials}</span>;
}

// Kept in sync with components/shop.tsx's coin-skin SHOP_ITEMS previews.
export const COIN_SKIN_COLORS: Record<string, { light: string; mid: string; dark: string }> = {
  "coin-classic": { light: "#fff3c4", mid: "#ffcf49", dark: "#c98a1f" },
  "coin-frost": { light: "#e8fbff", mid: "#8fe3ff", dark: "#2a7fa3" },
  "coin-toxic": { light: "#f2ffd9", mid: "#b6ff4d", dark: "#5c9418" },
  "coin-magma": { light: "#ffe3d9", mid: "#ff5a3d", dark: "#921f0f" },
  "coin-royal": { light: "#f1e8ff", mid: "#c79bff", dark: "#5a3d8a" },
};

export function CoinIcon({ className }: { className?: string }) {
  const [skinId] = useState(() => readEquipped().coinSkin);
  const colors = COIN_SKIN_COLORS[skinId] ?? COIN_SKIN_COLORS["coin-classic"];
  const gradId = `coinGrad-${skinId}`;
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="45%" stopColor={colors.mid} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>
      </defs>
      <polygon points="20,2 35,11 35,29 20,38 5,29 5,11" fill={`url(#${gradId})`} stroke={colors.dark} strokeWidth="1.5" />
      <polygon points="20,8 30,14 30,26 20,32 10,26 10,14" fill="none" stroke={colors.dark} strokeOpacity=".5" strokeWidth="1" />
      <circle cx="20" cy="20" r="6" fill={colors.dark} fillOpacity=".25" />
    </svg>
  );
}

export function PlayerCard({ card, onPick, index, hideRating, showSeason }: { card: DraftCard; onPick: () => void; index: number; hideRating?: boolean; showSeason?: boolean }) {
  const iso = countryToIso(card.country);
  return <button onClick={onPick} className={card.isHolo ? "draft-card holo-card" : "draft-card"} style={{ animationDelay: `${index * 75}ms` }}>
    <div className="card-grid" /><div className="card-shine" />
    {card.isHolo && <div className="holo-shimmer" />}
    {card.isHolo && <span className="holo-tag">★ HOLO</span>}
    <div className="card-top"><span className="card-region-badge">{iso && <FlagIcon iso={iso} className="card-flag" />}{card.region}</span><b>{hideRating ? "??" : card.rating}</b></div>
    <div className="card-orb"><span>{card.handle.slice(0, 2).toUpperCase()}</span></div>
    <div className="card-bottom">
      <p>{card.team}{showSeason && <span className="card-season-tag">{card.seasonName}</span>}</p>
      <h3>{card.handle}</h3>
      <div><span>{card.role === "STARTER" ? "PLAYER" : card.role}</span><strong>SELECT →</strong></div>
    </div>
  </button>;
}

export const orgStepInfo = { title: "Sign an organization", accent: "00" };

export function OrgCard({ org, onPick, index }: { org: DraftOrganization; onPick: () => void; index: number }) {
  return <button onClick={onPick} className="draft-card org-card" style={{ animationDelay: `${index * 75}ms`, "--org-color": org.color } as React.CSSProperties}>
    <div className="card-grid" /><div className="card-shine" />
    <div className="card-top"><span>ORGANIZATION</span><b>?</b></div>
    <div className="card-orb org-orb"><span>{org.name.slice(0, 2).toUpperCase()}</span></div>
    <div className="card-bottom"><p>SEALED SPONSOR OFFER</p><h3>{org.name}</h3><div><span>BONUS HIDDEN</span><strong>SELECT →</strong></div></div>
  </button>;
}

export const FX_PALETTES: Record<string, string[]> = {
  "fx-default": ["#ffcf49", "#fff3c4", "#ffe28a", "#ffffff", "#ffb700"],
  "fx-inferno": ["#ff5a3d", "#ffb700", "#ff9a4d", "#ffffff", "#ff3d3d"],
  "fx-aurora": ["#3dffb0", "#4dffe0", "#ffffff", "#a8ff4d", "#8fe3ff"],
};

export function levelUpParticles(fxId?: string) {
  const palette = FX_PALETTES[fxId ?? "fx-default"] ?? FX_PALETTES["fx-default"];
  return Array.from({ length: 32 }, (_, i) => ({
    angle: (360 / 32) * i + (Math.random() * 10 - 5),
    dist: 110 + Math.round(Math.random() * 140),
    size: 4 + Math.round(Math.random() * 7),
    color: palette[i % palette.length],
    delay: Math.round(Math.random() * 180),
  }));
}

function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

export function LevelUpOverlay({ level, coins, particles, onClose }: { level: number; coins: number; particles: { angle: number; dist: number; size: number; color: string; delay: number }[]; onClose: () => void }) {
  const coinCount = useCountUp(coins);
  return <div className="levelup-overlay mega" onClick={onClose}>
    <div className="levelup-flash" />
    <div className="levelup-rays" />
    <div className="levelup-shockwave" /><div className="levelup-shockwave ring2" /><div className="levelup-shockwave ring3" />
    <div className="levelup-card mega-card" onClick={(e) => e.stopPropagation()}>
      <div className="levelup-burst" />
      <div className="levelup-particles">
        {particles.map((p, i) => <span key={i} className="levelup-particle" style={{ "--angle": `${p.angle}deg`, "--dist": `${p.dist}px`, "--size": `${p.size}px`, "--pcolor": p.color, "--pdelay": `${p.delay}ms` } as React.CSSProperties} />)}
      </div>
      <div className="levelup-coin-wrap"><div className="coin-glow-ring" /><CoinIcon className="levelup-coin mega-coin" /></div>
      <p className="kicker levelup-kicker-text">LEVEL UP</p>
      <h2 className="levelup-level-text"><span>LEVEL {level}</span></h2>
      <p className="coin-gain">+{coinCount} COINS EARNED</p>
      <p className="levelup-hint">TAP TO CONTINUE</p>
    </div>
  </div>;
}

export function ChampionOverlay({ onClose, title, subtitle }: { onClose: () => void; title: string; subtitle: string }) {
  const [equipped] = useState<Equipped>(() => readEquipped());
  const particles = useMemo(() => levelUpParticles(equipped.fx), [equipped.fx]);
  return <div className="levelup-overlay champion-overlay" onClick={onClose}>
    <div className={`levelup-card champion-card banner-${equipped.banner}`} onClick={(e) => e.stopPropagation()}>
      <div className="levelup-burst champion-burst" />
      <div className="levelup-particles">
        {particles.map((p, i) => <span key={i} className="levelup-particle champion-particle" style={{ "--angle": `${p.angle}deg`, "--dist": `${p.dist + 40}px` } as React.CSSProperties} />)}
      </div>
      <span className="champion-trophy">🏆</span>
      <p className="kicker">{title}</p>
      <h2>{subtitle}</h2>
      <p className="levelup-hint">TAP TO CONTINUE</p>
    </div>
  </div>;
}

export const OWNED_KEY = "rocketdraft.shop.owned";
export const EQUIPPED_KEY = "rocketdraft.shop.equipped";
export type Equipped = { theme: string; title: string; coinSkin: string; frame: string; banner: string; fx: string; profileBanner: string; badgeShape: string };
export const DEFAULT_EQUIPPED: Equipped = {
  theme: "theme-default", title: "title-rookie", coinSkin: "coin-classic",
  frame: "frame-default", banner: "banner-default", fx: "fx-default",
  profileBanner: "pbanner-default", badgeShape: "shape-hex",
};

export function readOwned(): Set<string> {
  const defaults = ["theme-default", "title-rookie", "coin-classic", "frame-default", "banner-default", "fx-default", "pbanner-default", "shape-hex"];
  if (typeof window === "undefined") return new Set(defaults);
  try {
    const raw = window.localStorage.getItem(scopedKey(OWNED_KEY));
    const owned = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set([...owned, ...defaults]);
  } catch {
    return new Set(defaults);
  }
}

export function readEquipped(): Equipped {
  if (typeof window === "undefined") return DEFAULT_EQUIPPED;
  try {
    const raw = window.localStorage.getItem(scopedKey(EQUIPPED_KEY));
    return raw ? { ...DEFAULT_EQUIPPED, ...JSON.parse(raw) } : DEFAULT_EQUIPPED;
  } catch {
    return DEFAULT_EQUIPPED;
  }
}

export function applyEquippedTheme(equipped: Equipped) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", equipped.theme);
  root.setAttribute("data-frame", equipped.frame);
  root.setAttribute("data-fx", equipped.fx);
  root.setAttribute("data-badge-shape", equipped.badgeShape);
}

export function ArenaBackdrop() {
  useEffect(() => { applyEquippedTheme(readEquipped()); }, []);
  return <>
    <div className="arena-lights" /><div className="arena-noise" />
    <div className="arena-vignette" />
  </>;
}
