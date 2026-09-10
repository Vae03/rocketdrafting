"use client";

import { useEffect, useMemo, useState } from "react";
import type { DraftCard, DraftOrganization } from "@/lib/types";

export const COIN_STORAGE_KEY = "rocketdraft.coins";
export const XP_STORAGE_KEY = "rocketdraft.xp";
export const PLAYER_KEY_STORAGE_KEY = "rocketdraft.playerKey";

export const organizationPool: DraftOrganization[] = [
  { id: "free-agent", name: "Free Agent", bonus: 0, color: "#687083" },
  { id: "nrg", name: "NRG", bonus: 1, color: "#f25555" },
  { id: "spacestation", name: "Spacestation Gaming", bonus: 1, color: "#3ec9e0" },
  { id: "gen-g", name: "Gen.G", bonus: 1, color: "#aa8fff" },
  { id: "furia", name: "FURIA", bonus: 1, color: "#3a3a44" },
  { id: "falcons", name: "Team Falcons", bonus: 2, color: "#8fd13f" },
  { id: "g2", name: "G2 Esports", bonus: 2, color: "#e5e5e5" },
  { id: "bds", name: "Team BDS", bonus: 2, color: "#5fb4ff" },
  { id: "vitality", name: "Team Vitality", bonus: 2, color: "#ffd146" },
  { id: "karmine", name: "Karmine Corp", bonus: 3, color: "#4f79ff" },
  { id: "moist", name: "Moist Esports", bonus: 3, color: "#7ee0ff" },
  { id: "gentle-mates", name: "Gentle Mates", bonus: 3, color: "#ff8fd6" },
] as const;

export function drawOrgOffer() {
  return [...organizationPool].sort(() => Math.random() - 0.5).slice(0, 3);
}

export function drawOffer(pool: DraftCard[], role: DraftCard["role"], excluded: string[]) {
  return pool.filter((card) => card.role === role && !excluded.includes(card.id)).sort(() => Math.random() - 0.5).slice(0, 3);
}

export function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function readStoredNumber(key: string) {
  if (typeof window === "undefined") return 0;
  try {
    const stored = Number(window.localStorage.getItem(key));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch {
    return 0; // localStorage unavailable (private mode, etc.) - fall back to in-memory only
  }
}

export function readStoredString(key: string) {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
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

export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3c4" />
          <stop offset="45%" stopColor="#ffcf49" />
          <stop offset="100%" stopColor="#c98a1f" />
        </linearGradient>
      </defs>
      <polygon points="20,2 35,11 35,29 20,38 5,29 5,11" fill="url(#coinGrad)" stroke="#7a4e0f" strokeWidth="1.5" />
      <polygon points="20,8 30,14 30,26 20,32 10,26 10,14" fill="none" stroke="#7a4e0f" strokeOpacity=".5" strokeWidth="1" />
      <circle cx="20" cy="20" r="6" fill="#7a4e0f" fillOpacity=".25" />
    </svg>
  );
}

export function PlayerCard({ card, onPick, index, hideRating }: { card: DraftCard; onPick: () => void; index: number; hideRating?: boolean }) {
  return <button onClick={onPick} className="draft-card" style={{ animationDelay: `${index * 75}ms` }}>
    <div className="card-grid" /><div className="card-shine" />
    <div className="card-top"><span>{card.region}</span><b>{hideRating ? "??" : card.rating}</b></div>
    <div className="card-orb">{card.imageUrl ? <img src={card.imageUrl} alt={card.handle} /> : <span>{card.handle.slice(0, 2).toUpperCase()}</span>}</div>
    <div className="card-bottom"><p>{card.team}</p><h3>{card.handle}</h3><div><span>{card.role === "STARTER" ? "PLAYER" : card.role}</span><strong>SELECT →</strong></div></div>
  </button>;
}

export const orgStepInfo = { title: "Sign an organization", detail: "Pick 1 of 3 sponsor offers — its bonus is added after the roster average", accent: "00" };

export function OrgCard({ org, onPick, index }: { org: DraftOrganization; onPick: () => void; index: number }) {
  return <button onClick={onPick} className="draft-card org-card" style={{ animationDelay: `${index * 75}ms`, "--org-color": org.color } as React.CSSProperties}>
    <div className="card-grid" /><div className="card-shine" />
    <div className="card-top"><span>ORGANIZATION</span><b>+{org.bonus}</b></div>
    <div className="card-orb org-orb"><span>{org.name.slice(0, 2).toUpperCase()}</span></div>
    <div className="card-bottom"><p>SPONSOR OFFER</p><h3>{org.name}</h3><div><span>BONUS</span><strong>SELECT →</strong></div></div>
  </button>;
}

export const PARTICLE_COLORS = ["#ffcf49", "#fff3c4", "#ffe28a", "#ffffff", "#ffb700"];

export function levelUpParticles() {
  return Array.from({ length: 32 }, (_, i) => ({
    angle: (360 / 32) * i + (Math.random() * 10 - 5),
    dist: 110 + Math.round(Math.random() * 140),
    size: 4 + Math.round(Math.random() * 7),
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
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
  const particles = useMemo(() => levelUpParticles(), []);
  return <div className="levelup-overlay champion-overlay" onClick={onClose}>
    <div className="levelup-card champion-card" onClick={(e) => e.stopPropagation()}>
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
export type Equipped = { theme: string; title: string; coinSkin: string };
export const DEFAULT_EQUIPPED: Equipped = { theme: "theme-default", title: "title-rookie", coinSkin: "coin-classic" };

export function readOwned(): Set<string> {
  const defaults = ["theme-default", "title-rookie", "coin-classic"];
  if (typeof window === "undefined") return new Set(defaults);
  try {
    const raw = window.localStorage.getItem(OWNED_KEY);
    const owned = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set([...owned, ...defaults]);
  } catch {
    return new Set(defaults);
  }
}

export function readEquipped(): Equipped {
  if (typeof window === "undefined") return DEFAULT_EQUIPPED;
  try {
    const raw = window.localStorage.getItem(EQUIPPED_KEY);
    return raw ? { ...DEFAULT_EQUIPPED, ...JSON.parse(raw) } : DEFAULT_EQUIPPED;
  } catch {
    return DEFAULT_EQUIPPED;
  }
}

export function ArenaBackdrop() {
  return <>
    <div className="arena-noise" /><div className="arena-lights" /><div className="arena-stars" />
    <div className="arena-streaks">{[0, 1, 2, 3, 4].map((i) => <span key={i} className="arena-streak" />)}</div>
  </>;
}
