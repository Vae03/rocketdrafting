"use client";

import { useEffect, useMemo, useState } from "react";
import {
  championXp,
  coinsEarned,
  levelFromXp,
  playoffStages,
  seasonOpponents,
  simulateStage,
  teamPower,
  xpForElimination,
} from "@/lib/simulation";
import { seasons as allSeasons, seedCards } from "@/lib/seed-data";
import { incrementStat, raiseStatCeiling, todayKey, updateStats, readStats } from "@/lib/stats";
import type { DraftCard, DraftOrganization, DraftTeam, Season, TournamentResult } from "@/lib/types";
import {
  ArenaBackdrop,
  ChampionOverlay,
  CoinIcon,
  LevelUpOverlay,
  OrgCard,
  PlayerCard,
  TeamBadge,
  COIN_STORAGE_KEY,
  XP_STORAGE_KEY,
  delay,
  drawOffer,
  drawOrgOffer,
  levelUpParticles,
  orgStepInfo,
  readStoredNumber,
} from "@/components/draft-shared";

const roleInfo = {
  STARTER: { title: "Choose your starter", detail: "Pick 1 of 3 elite players", accent: "01" },
  SUBSTITUTE: { title: "Choose your substitute", detail: "Only ever fielded as a real sub — no bench-only cards allowed", accent: "04" },
  COACH: { title: "Choose your coach", detail: "The mastermind behind the roster", accent: "05" },
} as const;

const STAGE_REVEAL_DELAY_MS = 1100;
const AUTO_REDRAFT_DELAY_MS = 4200;

type DraftMode = "hardcore" | "normal" | "easy";
const MODE_INFO: Record<DraftMode, { name: string; showRatings: boolean; maxRerolls: number; blurb: string; icon: string }> = {
  hardcore: { name: "Hardcore", showRatings: false, maxRerolls: 0, blurb: "No ratings shown. No rerolls. Pure gut instinct.", icon: "🕶" },
  normal: { name: "Normal", showRatings: false, maxRerolls: 3, blurb: "No ratings shown, but 3 rerolls to bail on a bad offer.", icon: "⚙" },
  easy: { name: "Easy", showRatings: true, maxRerolls: 10, blurb: "Ratings visible, 10 rerolls to build the perfect roster.", icon: "🌤" },
};

export const LEGENDS_SEASON: Season = { slug: "legends", name: "All Seasons · Legends", year: 0 };

function SeasonPicker({ seasons, onPick }: { seasons: Season[]; onPick: (season: Season) => void }) {
  return <section className="season-select">
    <div className="panel-title"><span>STEP 1</span><b>PICK A SEASON</b></div>
    <button onClick={() => onPick(LEGENDS_SEASON)} className="season-option legends-option">
      <b>★ All Seasons · Legends</b><span>Draft any player from any era — Kaydop, zen and Rezears on one roster</span>
    </button>
    <div className="season-grid">
      {seasons.map((season) => <button key={season.slug} onClick={() => onPick(season)} className="season-option">
        <b>{season.name}</b><span>{season.year}</span>
      </button>)}
    </div>
  </section>;
}

function ModePicker({ onPick }: { onPick: (mode: DraftMode) => void }) {
  return <section className="season-select">
    <div className="panel-title"><span>STEP 2</span><b>PICK A DIFFICULTY</b></div>
    <div className="mode-grid">
      {(Object.keys(MODE_INFO) as DraftMode[]).map((key) => { const m = MODE_INFO[key]; return <button key={key} onClick={() => onPick(key)} className={`mode-option mode-${key}`}>
        <span className="mode-icon">{m.icon}</span><b>{m.name}</b><p>{m.blurb}</p>
      </button>; })}
    </div>
  </section>;
}

export function DraftArena() {
  const [season, setSeason] = useState<Season | null>(null);
  const [mode, setMode] = useState<DraftMode | null>(null);
  const [team, setTeam] = useState<DraftTeam>({ starters: [] });
  const [orgOffer, setOrgOffer] = useState<DraftOrganization[]>([]);
  const [offer, setOffer] = useState<DraftCard[]>([]);
  const [rerollsLeft, setRerollsLeft] = useState(0);
  const [rerollsUsedThisDraft, setRerollsUsedThisDraft] = useState(0);
  const [xp, setXp] = useState(() => readStoredNumber(XP_STORAGE_KEY));
  const [coins, setCoins] = useState(() => readStoredNumber(COIN_STORAGE_KEY));
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [lastPick, setLastPick] = useState<DraftCard | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; coins: number; particles: ReturnType<typeof levelUpParticles> } | null>(null);
  const [champion, setChampion] = useState(false);

  useEffect(() => { try { window.localStorage.setItem(XP_STORAGE_KEY, String(xp)); } catch { /* ignore */ } }, [xp]);
  useEffect(() => { try { window.localStorage.setItem(COIN_STORAGE_KEY, String(coins)); } catch { /* ignore */ } }, [coins]);
  useEffect(() => { raiseStatCeiling("peakCoins", coins); }, [coins]);

  const seasonPool = useMemo(() => {
    if (!season) return [];
    return season.slug === LEGENDS_SEASON.slug ? seedCards : seedCards.filter((card) => card.season === season.slug);
  }, [season]);
  const opponents = useMemo(() => (season ? seasonOpponents(seasonPool) : []), [season, seasonPool]);
  const picked = useMemo(() => [...team.starters, team.substitute, team.coach].filter(Boolean) as DraftCard[], [team]);
  const requiredRole: DraftCard["role"] | null = team.starters.length < 3 ? "STARTER" : !team.substitute ? "SUBSTITUTE" : !team.coach ? "COACH" : null;
  const currentStep: "ORG" | DraftCard["role"] | null = !team.organization ? "ORG" : requiredRole;
  const power = teamPower(team);
  const progress = levelFromXp(xp);
  const showRatings = mode ? MODE_INFO[mode].showRatings : true;

  function pickSeason(nextSeason: Season) {
    setSeason(nextSeason);
  }

  function changeSeason() {
    setSeason(null); setMode(null); setTeam({ starters: [] }); setOrgOffer([]); setOffer([]); setResults([]); setLastPick(null);
  }

  function pickMode(nextMode: DraftMode) {
    setMode(nextMode);
    setRerollsLeft(MODE_INFO[nextMode].maxRerolls);
    setRerollsUsedThisDraft(0);
    setOrgOffer(drawOrgOffer());
  }

  function changeMode() {
    setMode(null); setTeam({ starters: [] }); setOrgOffer([]); setOffer([]); setResults([]); setLastPick(null);
  }

  function pickOrg(org: DraftOrganization) {
    if (simulating) return;
    setTeam((currentTeam) => ({ ...currentTeam, organization: org }));
    setOffer(drawOffer(seasonPool, "STARTER", []));
  }

  function recordDraftCompletion(finishedTeam: DraftTeam) {
    if (!season || !mode) return;
    incrementStat("campaignDrafts", 1);
    if (season.slug === LEGENDS_SEASON.slug) incrementStat("legendsDrafts", 1);
    const finishedPower = teamPower(finishedTeam);
    raiseStatCeiling("peakPower", finishedPower);
    updateStats({
      addSeason: season.slug,
      addCoach: finishedTeam.coach?.handle,
      addOrg: finishedTeam.organization?.name,
      addDay: todayKey(),
    });
    if (finishedTeam.substitute && finishedTeam.substitute.rating < 70) incrementStat("subPicksBelowSeventy", 1);
  }

  function pick(card: DraftCard) {
    if (!requiredRole || simulating) return;
    setLastPick(card); setResults([]);
    const updated = requiredRole === "STARTER" ? { ...team, starters: [...team.starters, card] } : requiredRole === "SUBSTITUTE" ? { ...team, substitute: card } : { ...team, coach: card };
    setTeam(updated);
    const nextRole = updated.starters.length < 3 ? "STARTER" : !updated.substitute ? "SUBSTITUTE" : !updated.coach ? "COACH" : null;
    if (nextRole) setOffer(drawOffer(seasonPool, nextRole, [...picked.map((player) => player.id), card.id]));
    else recordDraftCompletion(updated);
  }

  function reroll() {
    if (rerollsLeft <= 0 || simulating || !currentStep) return;
    setRerollsLeft((r) => r - 1);
    setRerollsUsedThisDraft((r) => r + 1);
    incrementStat("rerollsUsed", 1);
    if (currentStep === "ORG") setOrgOffer(drawOrgOffer());
    else setOffer(drawOffer(seasonPool, currentStep, picked.map((p) => p.id)));
  }

  function restart() {
    setTeam({ starters: [] });
    setOrgOffer(season && mode ? drawOrgOffer() : []);
    setOffer([]);
    setRerollsLeft(mode ? MODE_INFO[mode].maxRerolls : 0);
    setRerollsUsedThisDraft(0);
    setResults([]); setLastPick(null); setChampion(false);
  }

  async function simulate() {
    if (requiredRole || simulating || opponents.length === 0) return;
    setSimulating(true); setResults([]); setChampion(false);
    const collected: TournamentResult[] = [];
    let xpGained = 0;
    let wonItAll = false;
    for (let i = 0; i < playoffStages.length; i++) {
      await delay(STAGE_REVEAL_DELAY_MS);
      const match = simulateStage(team, playoffStages[i], opponents[i]);
      collected.push(match);
      setResults([...collected]);
      if (!match.won) { xpGained = xpForElimination(i); break; }
      if (i === playoffStages.length - 1) { xpGained = championXp; wonItAll = true; }
    }
    await delay(400);
    setSimulating(false);

    const underdogWinCount = collected.filter((m) => m.won && power < m.opponentPower).length;
    if (underdogWinCount > 0) incrementStat("underdogWins", underdogWinCount);
    if (collected.length >= 3) incrementStat("top4Finishes", 1);
    if (collected.length >= 4) incrementStat("finalsReached", 1);
    if (wonItAll) {
      setChampion(true);
      const stats = incrementStat("campaignWins", 1);
      const newStreak = stats.campaignWinStreak + 1;
      const bumped = { ...stats, campaignWinStreak: newStreak, campaignBestWinStreak: Math.max(stats.campaignBestWinStreak, newStreak) };
      updateStats(bumped);
      if (mode === "hardcore") incrementStat("hardcoreWins", 1);
      if (rerollsUsedThisDraft === 0) incrementStat("noRerollChampionships", 1);
      if (season) updateStats({ championshipSeasons: [...new Set([...readStats().championshipSeasons, season.slug])] });
    } else {
      incrementStat("campaignLosses", 1);
      updateStats({ campaignWinStreak: 0 });
    }

    const newXp = xp + xpGained;
    const gained = coinsEarned(xp, newXp);
    setXp(newXp);
    if (gained > 0) {
      setCoins((c) => c + gained);
      setLevelUp({ level: levelFromXp(newXp).level, coins: gained, particles: levelUpParticles() });
    }
    if (!wonItAll) { await delay(AUTO_REDRAFT_DELAY_MS); restart(); }
  }

  const current = requiredRole ? roleInfo[requiredRole] : null;

  return <main className="arena">
    <ArenaBackdrop />
    {champion ? <ChampionOverlay title="GRAND FINAL" subtitle="RLCS CHAMPIONS" onClose={() => setChampion(false)} /> : levelUp && <LevelUpOverlay level={levelUp.level} coins={levelUp.coins} particles={levelUp.particles} onClose={() => setLevelUp(null)} />}
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>DRAFT ARENA</b></span></div>
      <div className="top-actions">
        <div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div>
        <div className="level"><small>LEVEL {progress.level}</small><div><i style={{ width: `${progress.intoLevel / progress.nextLevelXp * 100}%` }} /></div><b>{xp} XP</b></div>
        <button className="restart" onClick={restart}>↻ NEW DRAFT</button>
      </div>
    </header>
    <section className="stage">
      <div className="hero-copy"><p className="kicker">RLCS HISTORY • GLOBAL DRAFT DATABASE</p><h1>CREATE YOUR<br /><span>CHAMPIONS.</span></h1><p className="intro">Five picks. One trophy. Every choice shapes your run through the Rocket League playoffs.</p></div>

      {!season ? <SeasonPicker seasons={allSeasons} onPick={pickSeason} /> : !mode ? <ModePicker onPick={pickMode} /> : <>
        <p className="drafting-from kicker">DRAFTING FROM · <button onClick={changeSeason} className="link-button">{season.name}</button> · <button onClick={changeMode} className="link-button">{MODE_INFO[mode].name} mode (change)</button></p>
        <div className="draft-progress">{["ORG", "S1", "S2", "S3", "SUB", "COACH"].map((slot, index) => { const done = index === 0 ? Boolean(team.organization) : Boolean(picked[index - 1]); const isActive = index === 0 ? !team.organization : index - 1 === picked.length && Boolean(team.organization); return <div key={slot} className={done ? "progress-node complete" : isActive ? "progress-node active" : "progress-node"}><span>{done ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{slot}</small></div>; })}</div>
        {currentStep === "ORG" ? <section className="pick-zone"><div className="pick-heading"><span>{orgStepInfo.accent}</span><div><p className="kicker">LIVE DRAFT PICK</p><h2>{orgStepInfo.title}</h2><p>{orgStepInfo.detail}</p></div><div className="pick-count">PICK <b>1</b> / 6</div></div><div className="cards">{orgOffer.map((org, index) => <OrgCard key={org.id} org={org} index={index} onPick={() => pickOrg(org)} />)}</div>{rerollsLeft > 0 && <button className="reroll-button" onClick={reroll}>🎲 REROLL ({rerollsLeft} left)</button>}</section>
        : current ? <section className="pick-zone"><div className="pick-heading"><span>{current.accent}</span><div><p className="kicker">LIVE DRAFT PICK</p><h2>{current.title}</h2><p>{current.detail}</p></div><div className="pick-count">PICK <b>{picked.length + 2}</b> / 6</div></div><div className="cards">{offer.map((card, index) => <PlayerCard key={card.id} card={card} index={index} hideRating={!showRatings} onPick={() => pick(card)} />)}</div>{rerollsLeft > 0 && <button className="reroll-button" onClick={reroll}>🎲 REROLL ({rerollsLeft} left)</button>}{lastPick && <p className="picked-flash">✓ <b>{lastPick.handle}</b> joins your roster</p>}</section> : <section className="roster-ready"><div className="trophy">♜</div><div><p className="kicker">ROSTER COMPLETE</p><h2>YOUR DYNASTY IS READY</h2><p>Team power: <b>{showRatings ? power : "???"}</b> · Take on the {season.name} playoff bracket.</p></div><button onClick={simulate} disabled={simulating} className="playoff-button">{simulating ? "SIMULATING…" : "SIMULATE PLAYOFFS"} <span>→</span></button></section>}
        <section className="bottom-grid"><div className="squad-panel"><div className="panel-title"><span>YOUR LINEUP</span><b>{power ? (showRatings ? `${power} POWER` : "HIDDEN") : "BUILDING"}</b></div><div className="lineup">{[...Array(5)].map((_, index) => { const player = picked[index]; const position = index < 3 ? `STARTER ${index + 1}` : index === 3 ? "SUBSTITUTE" : "COACH"; return <div className={player ? "lineup-item filled" : "lineup-item"} key={position}><span>{player ? String(index + 1).padStart(2, "0") : "—"}</span><div><small>{position}</small><b>{player?.handle ?? "Not drafted"}</b></div>{player && <strong>{showRatings ? player.rating : "?"}</strong>}</div>; })}</div><p className="power-rule">POWER = arithmetic mean of all 5 ratings + <b>{team.organization?.name} +{team.organization?.bonus}</b></p></div>
        <div className="bracket-panel"><div className="panel-title"><span>PLAYOFF RUN</span><b>{season.name} · BO7</b></div>{playoffStages.map((stage, index) => { const result = results[index]; const isPending = simulating && index === results.length; const opponentName = result?.opponent ?? opponents[index]?.name ?? "—"; return <div className={`bracket-row ${result ? `revealed ${result.won ? "won" : "lost"}` : isPending ? "pending" : ""}`} key={stage}><div className="bracket-matchup"><TeamBadge name="YOU" size="sm" /><em className="vs">VS</em>{opponentName !== "—" && <TeamBadge name={opponentName} size="sm" />}<div><small>{stage.toUpperCase()}</small><b>{opponentName}</b></div></div><strong>{result ? result.score : isPending ? "···" : "—"}</strong><em className="bracket-status">{result ? result.won ? "WIN" : "OUT" : isPending ? "LIVE" : "WAITING"}</em></div>; })}{results.length > 0 && !simulating && <p className="xp-earned">{results.some((r) => !r.won) ? "ELIMINATED — NEW DRAFT STARTING…" : "XP AWARDED — KEEP DRAFTING"}</p>}</div></section>
      </>}
    </section>
  </main>;
}
