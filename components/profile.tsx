"use client";

import { useState } from "react";
import {
  ArenaBackdrop,
  CoinIcon,
  readStoredNumber,
  readOwned,
  readEquipped,
  COIN_STORAGE_KEY,
  XP_STORAGE_KEY,
} from "@/components/draft-shared";
import { levelFromXp } from "@/lib/simulation";
import { readStats } from "@/lib/stats";
import { computeBadgeProgress } from "@/lib/badges";
import { SHOP_ITEMS } from "@/components/shop";

export function Profile() {
  const [coins] = useState(() => readStoredNumber(COIN_STORAGE_KEY));
  const [xp] = useState(() => readStoredNumber(XP_STORAGE_KEY));
  const [equipped] = useState(() => readEquipped());
  const [owned] = useState(() => readOwned());
  const [stats] = useState(() => readStats());

  const progress = levelFromXp(xp);
  const equippedTitle = SHOP_ITEMS.find((i) => i.id === equipped.title);
  const badgeProgress = computeBadgeProgress(stats, { xp, shopOwned: owned.size });
  const unlockedCount = badgeProgress.filter((b) => b.tier > 0).length;
  const goldCount = badgeProgress.filter((b) => b.tier === 3).length;

  return <main className="arena">
    <ArenaBackdrop />
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>PROFILE</b></span></div>
      <div className="top-actions"><div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div></div>
    </header>
    <section className="stage">
      <div className="hero-copy"><p className="kicker">YOUR CARD</p><h1>PLAYER<br /><span>PROFILE.</span></h1></div>

      <section className="profile-card">
        <div className="profile-avatar">RL</div>
        <div className="profile-meta">
          {equippedTitle && <span className="profile-title">&quot;{equippedTitle.preview}&quot;</span>}
          <div className="profile-level"><b>LEVEL {progress.level}</b><small>{xp} total XP</small></div>
        </div>
        <div className="profile-stat-grid">
          <div><b>{stats.campaignWins}</b><small>CAMPAIGN WINS</small></div>
          <div><b>{stats.rankedWins}</b><small>RANKED WINS</small></div>
          <div><b>{stats.peakPower || "—"}</b><small>PEAK POWER</small></div>
          <div><b>{stats.peakMmr || "—"}</b><small>PEAK MMR</small></div>
          <div><b>{unlockedCount}/{badgeProgress.length}</b><small>BADGES</small></div>
          <div><b>{goldCount}</b><small>GOLD BADGES</small></div>
        </div>
      </section>

      <section className="badges-section">
        <div className="panel-title"><span>CHALLENGES</span><b>BADGES — {unlockedCount} / {badgeProgress.length} UNLOCKED</b></div>
        <div className="badges-grid">
          {badgeProgress.map((b) => <div key={b.def.id} className={`badge-card tier-${b.tier}`}>
            <span className="badge-icon">{b.def.icon}</span>
            <b>{b.def.name}</b>
            <p>{b.def.description}</p>
            <div className="badge-pips">{[1, 2, 3].map((t) => <span key={t} className={t <= b.tier ? `pip pip-${t} filled` : "pip"} />)}</div>
            <small className="badge-progress-text">{b.tier === 3 ? "MAX TIER" : `${b.value} / ${b.nextThreshold}${b.tierName ? ` · ${b.tierName}` : ""}`}</small>
          </div>)}
        </div>
      </section>
    </section>
  </main>;
}
