"use client";

import { useEffect, useMemo, useState } from "react";
import { seedCards } from "@/lib/seed-data";
import { useTranslation } from "@/components/i18n-provider";
import { teamPower } from "@/lib/simulation";
import { countryToIso } from "@/lib/flags";
import { FlagIcon } from "@/components/flag-icon";
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
  writeStoredValue,
  COIN_STORAGE_KEY,
  XP_STORAGE_KEY,
} from "@/components/draft-shared";

const roleInfo = {
  STARTER: { title: "Choose your starter", accent: "01" },
  SUBSTITUTE: { title: "Choose your substitute", accent: "04" },
  COACH: { title: "Choose your coach", accent: "05" },
} as const;
const SLOT_LABELS = ["ORG", "S1", "S2", "S3", "SUB", "COACH"];
const RANKED_COINS_WIN = 30;
const RANKED_COINS_LOSS = 10;

function getOrCreatePlayerKey() {
  const existing = readStoredString(PLAYER_KEY_STORAGE_KEY);
  if (existing) return existing;
  const fresh = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  writeStoredValue(PLAYER_KEY_STORAGE_KEY, fresh);
  return fresh;
}

type RosterSlot = { handle: string; rating: number; role: string };
type OpponentInfo = {
  opponentId: string; displayName: string; isBot: boolean; mmr: number; rank: RankInfo; power: number;
  roster: RosterSlot[]; org: DraftOrganization;
};
type MatchResult = {
  won: boolean; score: string; delta: number; mmr: number; rank: RankInfo;
  opponent: { displayName: string; isBot: boolean; mmr: number; power: number; rank: RankInfo };
};
type LeaderboardRow = { position: number; displayName: string; mmr: number; wins: number; losses: number; isBot: boolean; rank: RankInfo };

function OpponentSlot({ label, slot, revealed }: { label: string; slot?: RosterSlot | DraftOrganization; revealed: boolean }) {
  if (!revealed || !slot) return <div className="opp-slot locked"><small>{label}</small><span>?</span></div>;
  if ("bonus" in slot) return <div className="opp-slot filled"><small>{label}</small><b>{slot.name}</b><strong>+{slot.bonus}</strong></div>;
  return <div className="opp-slot filled"><small>{label}</small><b>{slot.handle}</b><strong>{slot.rating}</strong></div>;
}

export function OnlineDuel() {
  const { t } = useTranslation();
  const [playerKey] = useState<string | null>(() => (typeof window === "undefined" ? null : getOrCreatePlayerKey()));
  const [mmr, setMmr] = useState(STARTING_MMR);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [queuing, setQueuing] = useState(false);
  const [opponent, setOpponent] = useState<OpponentInfo | null>(null);
  const [team, setTeam] = useState<DraftTeam>({ starters: [] });
  const [orgOffer, setOrgOffer] = useState<DraftOrganization[]>(() => drawOrgOffer());
  const [offer, setOffer] = useState<DraftCard[]>(() => drawOffer(seedCards, "STARTER", []));
  const [lastPick, setLastPick] = useState<DraftCard | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [rankUp, setRankUp] = useState<RankInfo | null>(null);
  const [rankDown, setRankDown] = useState<RankInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[] | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [coins, setCoins] = useState(() => readStoredNumber(COIN_STORAGE_KEY));
  const [xp] = useState(() => readStoredNumber(XP_STORAGE_KEY));

  useEffect(() => { writeStoredValue(COIN_STORAGE_KEY, String(coins)); }, [coins]);
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
  // How many of the 6 slots (org + 5 players) you've locked in -- the opponent's matching slot
  // reveals the instant yours does, one turn behind, "alternating" as you draft.
  const revealedCount = (team.organization ? 1 : 0) + picked.length;

  async function findMatch() {
    if (queuing || !playerKey) return;
    setQueuing(true); setError(null);
    try {
      const res = await fetch("/api/online/queue", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Matchmaking failed");
      setOpponent(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matchmaking failed");
    } finally {
      setQueuing(false);
    }
  }

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
      void submitMatch(updated);
    }
  }

  function newOpponent() {
    setOpponent(null);
    setTeam({ starters: [] });
    setOrgOffer(drawOrgOffer());
    setOffer(drawOffer(seedCards, "STARTER", []));
    setLastPick(null);
    setMatchResult(null);
    setRankDown(null);
  }

  async function submitMatch(finishedTeam: DraftTeam) {
    if (!playerKey || !opponent) return;
    setSubmitting(true); setError(null);
    try {
      const finalPower = teamPower(finishedTeam);
      const res = await fetch("/api/online/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerKey, opponentId: opponent.opponentId, teamPower: finalPower,
          org: finishedTeam.organization,
          teamSummary: [...finishedTeam.starters, finishedTeam.substitute, finishedTeam.coach]
            .filter((c): c is DraftCard => Boolean(c))
            .map((c) => ({ handle: c.handle, rating: c.rating, role: c.role })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Match submission failed");
      setMatchResult(data);
      const previousRank = rankForMmr(mmr);
      setMmr(data.mmr);
      setWins((w) => w + (data.won ? 1 : 0));
      setLosses((l) => l + (data.won ? 0 : 1));
      if (data.rank.orderIndex > previousRank.orderIndex) { setRankUp(data.rank); setRankDown(null); }
      else if (data.rank.orderIndex < previousRank.orderIndex) { setRankDown(data.rank); setRankUp(null); }

      const coinGain = data.won ? RANKED_COINS_WIN : RANKED_COINS_LOSS;
      setCoins((c) => c + coinGain);

      raiseStatCeiling("peakMmr", data.mmr);
      if (data.won && finalPower < data.opponent.power) incrementStat("underdogWins", 1);
      if (data.won) {
        const stats = incrementStat("rankedWins", 1);
        const newStreak = stats.rankedWinStreak + 1;
        updateStats({ rankedWinStreak: newStreak, rankedBestWinStreak: Math.max(stats.rankedBestWinStreak, newStreak) });
      } else {
        incrementStat("rankedLosses", 1);
        updateStats({ rankedWinStreak: 0 });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Match submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function loadLeaderboard() {
    setShowLeaderboard(true);
    if (leaderboard) return;
    fetch("/api/online/leaderboard").then((r) => r.json()).then(setLeaderboard).catch(() => setLeaderboard([]));
  }

  const current = requiredRole ? roleInfo[requiredRole] : null;
  const opponentSlotValues: (RosterSlot | DraftOrganization | undefined)[] = opponent ? [opponent.org, ...opponent.roster] : [];

  return <main className="arena ranked-arena">
    <ArenaBackdrop />
    {rankUp && <ChampionOverlay title="RANK UP" subtitle={rankUp.name.toUpperCase()} onClose={() => setRankUp(null)} />}
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>{t("nav_ranked")}</b></span></div>
      <div className="top-actions">
        <div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div>
        <div className="rank-badge"><small>{rank.name.toUpperCase()}</small><b>{mmr} MMR</b></div>
        <button className="restart" onClick={loadLeaderboard}>🏆 TOP 100</button>
      </div>
    </header>
    <section className="stage">
      <div className="hero-copy"><p className="kicker">{t("ranked_kicker")}</p><h1>{t("ranked_title1")}<br /><span>{t("ranked_title2")}</span></h1><p className="intro">{t("ranked_intro")}</p></div>

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
      </section> : !opponent ? <section className="roster-ready ranked-queue-ready">
        <div className="trophy">⚔</div>
        <div><p className="kicker">STEP 1</p><h2>FIND A MATCH</h2></div>
        <button onClick={findMatch} disabled={queuing} className="playoff-button">{queuing ? "SEARCHING…" : t("ranked_find_match")} <span>→</span></button>
      </section> : <>
        <p className="drafting-from kicker">VS <b className="vs-opponent-name">{opponent.displayName}</b> · {opponent.rank.name} ({opponent.mmr} MMR){opponent.isBot ? " · practice bot" : ""}</p>
        <div className="draft-progress">{SLOT_LABELS.map((slot, index) => { const done = index === 0 ? Boolean(team.organization) : Boolean(picked[index - 1]); const isActive = index === 0 ? !team.organization : index - 1 === picked.length && Boolean(team.organization); return <div key={slot} className={done ? "progress-node complete" : isActive ? "progress-node active" : "progress-node"}><span>{done ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{slot}</small></div>; })}</div>

        <div className="vs-columns">
          <div className="vs-column">
            <div className="vs-column-head"><TeamBadge name="YOU" /><b>YOU</b></div>
            {matchResult ? <section className="match-result-panel">
              <div className={`match-outcome ${matchResult.won ? "won" : "lost"}`}>{matchResult.won ? "VICTORY" : "DEFEAT"}</div>
              <div className="match-versus">
                <div className="match-side"><TeamBadge name="YOU" /><b>YOU</b><small>{power} POWER</small></div>
                <div className="match-score">{matchResult.score}</div>
                <div className="match-side"><TeamBadge name={matchResult.opponent.displayName} /><b>{matchResult.opponent.displayName}</b><small>{matchResult.opponent.power} POWER{matchResult.opponent.isBot ? " · BOT" : ""}</small></div>
              </div>
              <p className="mmr-delta">{matchResult.delta >= 0 ? "+" : ""}{matchResult.delta} MMR → <b>{matchResult.mmr}</b> ({matchResult.rank.name}) · <CoinIcon className="inline-coin" /> +{matchResult.won ? RANKED_COINS_WIN : RANKED_COINS_LOSS}</p>
              {rankDown && <p className="rank-down-banner">⬇ RANK DOWN — {rankDown.name}</p>}
              <button className="playoff-button" onClick={newOpponent}>FIND NEW MATCH <span>→</span></button>
            </section> : submitting ? <p className="power-rule">Submitting match…</p>
              : currentStep === "ORG" ? <section className="pick-zone"><div className="pick-heading"><span>{orgStepInfo.accent}</span><div><p className="kicker">RANKED DRAFT</p><h2>{orgStepInfo.title}</h2></div><div className="pick-count">PICK <b>1</b> / 6</div></div><div className="cards">{orgOffer.map((org, index) => <OrgCard key={org.id} org={org} index={index} onPick={() => pickOrg(org)} />)}</div></section>
              : current ? <section className="pick-zone"><div className="pick-heading"><span>{current.accent}</span><div><p className="kicker">RANKED DRAFT</p><h2>{current.title}</h2></div><div className="pick-count">PICK <b>{picked.length + 2}</b> / 6</div></div><div className="cards">{offer.map((card, index) => <PlayerCard key={card.id} card={card} index={index} showSeason onPick={() => pick(card)} />)}</div>{lastPick && <p className="picked-flash">✓ <b>{lastPick.handle}</b> joins your roster</p>}</section>
              : <p className="power-rule">Roster locked — submitting…</p>}
          </div>

          <div className="vs-column">
            <div className="vs-column-head"><TeamBadge name={opponent.displayName} /><b>{opponent.displayName}</b></div>
            <div className="opp-slots">
              {SLOT_LABELS.map((label, i) => <OpponentSlot key={label} label={label} slot={opponentSlotValues[i]} revealed={i < revealedCount} />)}
            </div>
          </div>
        </div>

        {error && <p className="match-error">{error}</p>}
        <section className="bottom-grid single"><div className="squad-panel"><div className="panel-title"><span>YOUR LINEUP</span><b>{power ? `${power} POWER` : "BUILDING"}</b></div><div className="lineup">{[...Array(5)].map((_, index) => { const player = picked[index]; const position = index < 3 ? `STARTER ${index + 1}` : index === 3 ? "SUBSTITUTE" : "COACH"; const iso = player ? countryToIso(player.country) : null; return <div className={player ? "lineup-item filled" : "lineup-item"} key={position}><span>{player ? String(index + 1).padStart(2, "0") : "—"}</span><div><small>{position}</small><b>{iso && <FlagIcon iso={iso} className="card-flag" />}{player?.handle ?? "Not drafted"}</b></div>{player && <strong>{player.rating}</strong>}</div>; })}</div><p className="power-rule">RANKED — {wins}W / {losses}L · {xp} campaign XP earned separately</p></div></section>
      </>}
    </section>
  </main>;
}
