"use client";

import { useEffect, useMemo, useState } from "react";
import { seedCards } from "@/lib/seed-data";
import { teamPower } from "@/lib/simulation";
import { rankForMmr, STARTING_MMR, type RankInfo } from "@/lib/ranks";
import { incrementStat, raiseStatCeiling, updateStats } from "@/lib/stats";
import type { DraftCard, DraftOrganization, DraftTeam } from "@/lib/types";
import {
  ArenaBackdrop,
  ChampionOverlay,
  CoinIcon,
  OrgCard,
  PlayerCard,
  TeamBadge,
  PLAYER_KEY_STORAGE_KEY,
  drawOffer,
  drawOrgOffer,
  orgStepInfo,
  readStoredNumber,
  readStoredString,
  COIN_STORAGE_KEY,
  XP_STORAGE_KEY,
} from "@/components/draft-shared";

const roleInfo = {
  STARTER: { title: "Choose your starter", detail: "Pick 1 of 3 elite players — any era", accent: "01" },
  SUBSTITUTE: { title: "Choose your substitute", detail: "Only ever fielded as a real sub", accent: "04" },
  COACH: { title: "Choose your coach", detail: "The mastermind behind the roster", accent: "05" },
} as const;

function getOrCreatePlayerKey() {
  const existing = readStoredString(PLAYER_KEY_STORAGE_KEY);
  if (existing) return existing;
  const fresh = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try { window.localStorage.setItem(PLAYER_KEY_STORAGE_KEY, fresh); } catch { /* ignore */ }
  return fresh;
}

type MatchResult = {
  won: boolean; score: string; delta: number; mmr: number; rank: RankInfo;
  opponent: { displayName: string; isBot: boolean; mmr: number; power: number; rank: RankInfo };
};
type LeaderboardRow = { position: number; displayName: string; mmr: number; wins: number; losses: number; isBot: boolean; rank: RankInfo };

export function OnlineDuel() {
  const [playerKey] = useState<string | null>(() => (typeof window === "undefined" ? null : getOrCreatePlayerKey()));
  const [mmr, setMmr] = useState(STARTING_MMR);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [team, setTeam] = useState<DraftTeam>({ starters: [] });
  const [orgOffer, setOrgOffer] = useState<DraftOrganization[]>(() => drawOrgOffer());
  const [offer, setOffer] = useState<DraftCard[]>(() => drawOffer(seedCards, "STARTER", []));
  const [lastPick, setLastPick] = useState<DraftCard | null>(null);
  const [queuing, setQueuing] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [rankUp, setRankUp] = useState<RankInfo | null>(null);
  const [rankDown, setRankDown] = useState<RankInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [coins] = useState(() => readStoredNumber(COIN_STORAGE_KEY));
  const [xp] = useState(() => readStoredNumber(XP_STORAGE_KEY));

  useEffect(() => {
    if (!playerKey) return;
    fetch(`/api/online/match?playerKey=${encodeURIComponent(playerKey)}`)
      .then((r) => r.json())
      .then((data) => { if (typeof data.mmr === "number") { setMmr(data.mmr); setWins(data.wins ?? 0); setLosses(data.losses ?? 0); } })
      .catch(() => { /* offline / no DB reachable -- ranked stats just stay at defaults */ });
  }, [playerKey]);

  const picked = useMemo(() => [...team.starters, team.substitute, team.coach].filter(Boolean) as DraftCard[], [team]);
  const requiredRole: DraftCard["role"] | null = team.starters.length < 3 ? "STARTER" : !team.substitute ? "SUBSTITUTE" : !team.coach ? "COACH" : null;
  const currentStep: "ORG" | DraftCard["role"] | null = !team.organization ? "ORG" : requiredRole;
  const power = teamPower(team);
  const rank = rankForMmr(mmr);

  function pickOrg(org: DraftOrganization) {
    setTeam((t) => ({ ...t, organization: org }));
    setOffer(drawOffer(seedCards, "STARTER", []));
  }

  function pick(card: DraftCard) {
    if (!requiredRole) return;
    setLastPick(card);
    const updated = requiredRole === "STARTER" ? { ...team, starters: [...team.starters, card] } : requiredRole === "SUBSTITUTE" ? { ...team, substitute: card } : { ...team, coach: card };
    setTeam(updated);
    const nextRole = updated.starters.length < 3 ? "STARTER" : !updated.substitute ? "SUBSTITUTE" : !updated.coach ? "COACH" : null;
    if (nextRole) setOffer(drawOffer(seedCards, nextRole, [...picked.map((p) => p.id), card.id]));
    else {
      incrementStat("rankedDrafts", 1);
      updateStats({ addCoach: updated.coach?.handle, addOrg: updated.organization?.name });
      if (updated.substitute && updated.substitute.rating < 70) incrementStat("subPicksBelowSeventy", 1);
    }
  }

  function redraft() {
    setTeam({ starters: [] });
    setOrgOffer(drawOrgOffer());
    setOffer(drawOffer(seedCards, "STARTER", []));
    setLastPick(null);
    setMatchResult(null);
    setRankDown(null);
  }

  async function findMatch() {
    if (requiredRole || queuing || !playerKey) return;
    setQueuing(true); setError(null); setMatchResult(null);
    try {
      const res = await fetch("/api/online/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerKey, teamPower: power,
          teamSummary: picked.map((c) => ({ handle: c.handle, rating: c.rating, role: c.role })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Matchmaking failed");
      setMatchResult(data);
      const previousRank = rankForMmr(mmr);
      setMmr(data.mmr);
      setWins((w) => w + (data.won ? 1 : 0));
      setLosses((l) => l + (data.won ? 0 : 1));
      if (data.rank.orderIndex > previousRank.orderIndex) { setRankUp(data.rank); setRankDown(null); }
      else if (data.rank.orderIndex < previousRank.orderIndex) { setRankDown(data.rank); setRankUp(null); }

      raiseStatCeiling("peakMmr", data.mmr);
      if (data.won && power < data.opponent.power) incrementStat("underdogWins", 1);
      if (data.won) {
        const stats = incrementStat("rankedWins", 1);
        const newStreak = stats.rankedWinStreak + 1;
        updateStats({ rankedWinStreak: newStreak, rankedBestWinStreak: Math.max(stats.rankedBestWinStreak, newStreak) });
      } else {
        incrementStat("rankedLosses", 1);
        updateStats({ rankedWinStreak: 0 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matchmaking failed");
    } finally {
      setQueuing(false);
    }
  }

  function loadLeaderboard() {
    setShowLeaderboard(true);
    if (leaderboard) return;
    fetch("/api/online/leaderboard").then((r) => r.json()).then(setLeaderboard).catch(() => setLeaderboard([]));
  }

  const current = requiredRole ? roleInfo[requiredRole] : null;

  return <main className="arena">
    <ArenaBackdrop />
    {rankUp && <ChampionOverlay title="RANK UP" subtitle={rankUp.name.toUpperCase()} onClose={() => setRankUp(null)} />}
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>RANKED DUEL</b></span></div>
      <div className="top-actions">
        <div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div>
        <div className="rank-badge"><small>{rank.name.toUpperCase()}</small><b>{mmr} MMR</b></div>
        <button className="restart" onClick={loadLeaderboard}>🏆 TOP 100</button>
      </div>
    </header>
    <section className="stage">
      <div className="hero-copy"><p className="kicker">ALL-SEASONS PLAYER POOL • RANKED 1v1</p><h1>BEAT THE<br /><span>LADDER.</span></h1><p className="intro">Draft a five-card legends roster, queue up, and take your MMR on the line against another online squad.</p></div>

      {showLeaderboard ? <section className="leaderboard-panel">
        <div className="panel-title"><span>TOP 100</span><b>GLOBAL LEADERBOARD</b><button className="link-button" onClick={() => setShowLeaderboard(false)}>close</button></div>
        {!leaderboard ? <p className="power-rule">Loading…</p> : <div className="leaderboard-list">
          {leaderboard.map((row) => <div className="leaderboard-row" key={row.position}>
            <span className="lb-pos">{row.position}</span>
            <TeamBadge name={row.displayName} size="sm" />
            <div className="lb-name"><b>{row.displayName}</b><small>{row.rank.name}{row.isBot ? " · practice bot" : ""}</small></div>
            <span className="lb-record">{row.wins}W–{row.losses}L</span>
            <strong>{row.mmr}</strong>
          </div>)}
        </div>}
      </section> : <>
        <div className="draft-progress">{["ORG", "S1", "S2", "S3", "SUB", "COACH"].map((slot, index) => { const done = index === 0 ? Boolean(team.organization) : Boolean(picked[index - 1]); const isActive = index === 0 ? !team.organization : index - 1 === picked.length && Boolean(team.organization); return <div key={slot} className={done ? "progress-node complete" : isActive ? "progress-node active" : "progress-node"}><span>{done ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{slot}</small></div>; })}</div>

        {matchResult ? <section className="match-result-panel">
          <div className={`match-outcome ${matchResult.won ? "won" : "lost"}`}>{matchResult.won ? "VICTORY" : "DEFEAT"}</div>
          <div className="match-versus">
            <div className="match-side"><TeamBadge name="YOU" /><b>YOU</b><small>{power} POWER</small></div>
            <div className="match-score">{matchResult.score}</div>
            <div className="match-side"><TeamBadge name={matchResult.opponent.displayName} /><b>{matchResult.opponent.displayName}</b><small>{matchResult.opponent.power} POWER{matchResult.opponent.isBot ? " · BOT" : ""}</small></div>
          </div>
          <p className="mmr-delta">{matchResult.delta >= 0 ? "+" : ""}{matchResult.delta} MMR → <b>{matchResult.mmr}</b> ({matchResult.rank.name})</p>
          {rankDown && <p className="rank-down-banner">⬇ RANK DOWN — {rankDown.name}</p>}
          <button className="playoff-button" onClick={redraft}>DRAFT NEW ROSTER <span>→</span></button>
        </section> : currentStep === "ORG" ? <section className="pick-zone"><div className="pick-heading"><span>{orgStepInfo.accent}</span><div><p className="kicker">RANKED DRAFT</p><h2>{orgStepInfo.title}</h2><p>{orgStepInfo.detail}</p></div><div className="pick-count">PICK <b>1</b> / 6</div></div><div className="cards">{orgOffer.map((org, index) => <OrgCard key={org.id} org={org} index={index} onPick={() => pickOrg(org)} />)}</div></section>
          : current ? <section className="pick-zone"><div className="pick-heading"><span>{current.accent}</span><div><p className="kicker">RANKED DRAFT</p><h2>{current.title}</h2><p>{current.detail}</p></div><div className="pick-count">PICK <b>{picked.length + 2}</b> / 6</div></div><div className="cards">{offer.map((card, index) => <PlayerCard key={card.id} card={card} index={index} onPick={() => pick(card)} />)}</div>{lastPick && <p className="picked-flash">✓ <b>{lastPick.handle}</b> joins your roster</p>}</section>
            : <section className="roster-ready"><div className="trophy">⚔</div><div><p className="kicker">ROSTER LOCKED</p><h2>READY TO QUEUE</h2><p>Team power: <b>{power}</b> · Current rank: <b>{rank.name}</b> ({mmr} MMR)</p></div><button onClick={findMatch} disabled={queuing} className="playoff-button">{queuing ? "FINDING MATCH…" : "FIND MATCH"} <span>→</span></button></section>}
        {error && <p className="match-error">{error}</p>}

        <section className="bottom-grid single"><div className="squad-panel"><div className="panel-title"><span>YOUR LINEUP</span><b>{power ? `${power} POWER` : "BUILDING"}</b></div><div className="lineup">{[...Array(5)].map((_, index) => { const player = picked[index]; const position = index < 3 ? `STARTER ${index + 1}` : index === 3 ? "SUBSTITUTE" : "COACH"; return <div className={player ? "lineup-item filled" : "lineup-item"} key={position}><span>{player ? String(index + 1).padStart(2, "0") : "—"}</span><div><small>{position}</small><b>{player?.handle ?? "Not drafted"}</b></div>{player && <strong>{player.rating}</strong>}</div>; })}</div><p className="power-rule">RANKED — {wins}W / {losses}L · {xp} campaign XP earned separately</p></div></section>
      </>}
    </section>
  </main>;
}
