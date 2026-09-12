"use client";

import { useEffect, useMemo, useState } from "react";
import {
  championXp,
  coinsEarned,
  coinsForStage,
  levelFromXp,
  playoffStages,
  seasonOpponents,
  simulateStage,
  teamPower,
  xpForElimination,
} from "@/lib/simulation";
import { seasons as allSeasons, seedCards } from "@/lib/seed-data";
import { useTranslation } from "@/components/i18n-provider";
import { countryToIso } from "@/lib/flags";
import { FlagIcon } from "@/components/flag-icon";
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
  readEquipped,
  readStoredNumber,
  writeStoredValue,
} from "@/components/draft-shared";

const roleInfo = {
  STARTER: { title: "Choose your starter", accent: "01" },
  SUBSTITUTE: { title: "Choose your substitute", accent: "04" },
  COACH: { title: "Choose your coach", accent: "05" },
} as const;

const STAGE_PAUSE_MS = 650;
const GAME_REVEAL_MS = 380;
const AUTO_REDRAFT_DELAY_MS = 4200;

type DraftMode = "hardcore" | "normal" | "easy";
const MODE_INFO: Record<DraftMode, { name: string; showRatings: boolean; maxRerolls: number; icon: string }> = {
  hardcore: { name: "Hardcore", showRatings: false, maxRerolls: 0, icon: "🕶" },
  normal: { name: "Normal", showRatings: false, maxRerolls: 3, icon: "⚙" },
  easy: { name: "Easy", showRatings: true, maxRerolls: 10, icon: "🌤" },
};

export const LEGENDS_SEASON: Season = { slug: "legends", name: "All Seasons · Legends", year: 0 };

function SeasonPicker({ seasons, onPick }: { seasons: Season[]; onPick: (season: Season) => void }) {
  return <section className="season-select freeplay-select">
    <div className="panel-title"><span>STEP 1</span><b>PICK A SEASON</b></div>
    <button onClick={() => onPick(LEGENDS_SEASON)} className="season-option legends-option">
      <b>★ All Seasons · Legends</b>
    </button>
    <div className="season-grid">
      {seasons.map((season) => <button key={season.slug} onClick={() => onPick(season)} className="season-option freeplay-option">
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
        <span className="mode-icon">{m.icon}</span><b>{m.name}</b>
      </button>; })}
    </div>
  </section>;
}

function LineupCard({ player, position, showRatings }: { player?: DraftCard; position: string; showRatings: boolean }) {
  const iso = player ? countryToIso(player.country) : null;
  return <div className={player ? `lineup-card filled${player.isHolo ? " holo-card" : ""}` : "lineup-card"}>
    {player?.isHolo && <div className="holo-shimmer" />}
    <small>{position}</small>
    {player ? <>
      <div className="lineup-card-avatar">{iso ? <FlagIcon iso={iso} className="card-flag" /> : null}<span>{player.handle.slice(0, 2).toUpperCase()}</span></div>
      <b>{player.handle}</b>
      <span className="lineup-card-team">{player.team}</span>
      <strong>{showRatings ? player.rating : "??"}</strong>
    </> : <div className="lineup-card-empty">—</div>}
  </div>;
}

function GameRow({ game, index }: { game: TournamentResult["games"][number]; index: number }) {
  return <div className={`game-row ${game.won ? "won" : "lost"}`} style={{ animationDelay: `${index * 40}ms` }}>
    <span className="game-number">G{index + 1}</span>
    <span className="game-score">{game.myGoals}–{game.theirGoals}</span>
    <em>{game.won ? "W" : "L"}</em>
  </div>;
}

function StagePanel({ stage, opponentName, result, isPending, revealedGames }: {
  stage: string; opponentName: string; result?: TournamentResult; isPending: boolean; revealedGames: TournamentResult["games"];
}) {
  return <div className={`stage-panel ${result ? (result.won ? "won" : "lost") : isPending ? "pending" : ""}`}>
    <div className="stage-panel-head">
      <div className="stage-panel-title"><small>{stage.toUpperCase()}</small><b>VS {opponentName}</b></div>
      {result && <div className="stage-panel-result"><strong>{result.score}</strong><em>{result.won ? "WIN" : "OUT"}</em></div>}
    </div>
    {(isPending || result) && <div className="game-log">
      {(result ? result.games : revealedGames).map((g, i) => <GameRow key={i} game={g} index={i} />)}
    </div>}
  </div>;
}

export function DraftArena() {
  const { t } = useTranslation();
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
  const [liveStageIndex, setLiveStageIndex] = useState(-1);
  const [liveGames, setLiveGames] = useState<TournamentResult["games"]>([]);
  const [simulating, setSimulating] = useState(false);
  const [lastPick, setLastPick] = useState<DraftCard | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; coins: number; particles: ReturnType<typeof levelUpParticles> } | null>(null);
  const [champion, setChampion] = useState(false);

  useEffect(() => { writeStoredValue(XP_STORAGE_KEY, String(xp)); }, [xp]);
  useEffect(() => { writeStoredValue(COIN_STORAGE_KEY, String(coins)); }, [coins]);
  useEffect(() => { raiseStatCeiling("peakCoins", coins); }, [coins]);

  const isLegends = season?.slug === LEGENDS_SEASON.slug;
  const seasonPool = useMemo(() => {
    if (!season) return [];
    return isLegends ? seedCards : seedCards.filter((card) => card.season === season.slug);
  }, [season, isLegends]);
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
    setOffer(drawOffer(seasonPool, "STARTER", [], seedCards));
  }

  function recordDraftCompletion(finishedTeam: DraftTeam) {
    if (!season || !mode) return;
    incrementStat("campaignDrafts", 1);
    if (isLegends) incrementStat("legendsDrafts", 1);
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
    if (nextRole) setOffer(drawOffer(seasonPool, nextRole, [...picked.map((player) => player.id), card.id], seedCards));
    else recordDraftCompletion(updated);
  }

  function reroll() {
    if (rerollsLeft <= 0 || simulating || !currentStep) return;
    setRerollsLeft((r) => r - 1);
    setRerollsUsedThisDraft((r) => r + 1);
    incrementStat("rerollsUsed", 1);
    if (currentStep === "ORG") setOrgOffer(drawOrgOffer());
    else setOffer(drawOffer(seasonPool, currentStep, picked.map((p) => p.id), seedCards));
  }

  function restart() {
    setTeam({ starters: [] });
    setOrgOffer(season && mode ? drawOrgOffer() : []);
    setOffer([]);
    setRerollsLeft(mode ? MODE_INFO[mode].maxRerolls : 0);
    setRerollsUsedThisDraft(0);
    setResults([]); setLastPick(null); setChampion(false); setLiveStageIndex(-1); setLiveGames([]);
  }

  async function simulate() {
    if (requiredRole || simulating || opponents.length === 0) return;
    setSimulating(true); setResults([]); setChampion(false);
    const collected: TournamentResult[] = [];
    let xpGained = 0;
    let coinGain = 0;
    let wonItAll = false;
    for (let i = 0; i < playoffStages.length; i++) {
      setLiveStageIndex(i); setLiveGames([]);
      const match = simulateStage(team, playoffStages[i], opponents[i]);
      for (let g = 0; g < match.games.length; g++) {
        await delay(GAME_REVEAL_MS);
        setLiveGames((prev) => [...prev, match.games[g]]);
      }
      await delay(STAGE_PAUSE_MS);
      collected.push(match);
      setResults([...collected]);
      coinGain += coinsForStage(i, opponents[i].power);
      if (!match.won) { xpGained = xpForElimination(i); break; }
      if (i === playoffStages.length - 1) { xpGained = championXp; wonItAll = true; }
    }
    setLiveStageIndex(-1); setLiveGames([]);
    setSimulating(false);

    const underdogWinCount = collected.filter((m) => m.won && power < m.opponentPower).length;
    if (underdogWinCount > 0) incrementStat("underdogWins", underdogWinCount);
    if (collected.length >= 3) incrementStat("top4Finishes", 1);
    if (collected.length >= 4) incrementStat("finalsReached", 1);
    if (wonItAll) {
      setChampion(true);
      const stats = incrementStat("campaignWins", 1);
      const newStreak = stats.campaignWinStreak + 1;
      updateStats({ campaignWinStreak: newStreak, campaignBestWinStreak: Math.max(stats.campaignBestWinStreak, newStreak) });
      if (mode === "hardcore") incrementStat("hardcoreWins", 1);
      if (rerollsUsedThisDraft === 0) incrementStat("noRerollChampionships", 1);
      if (season) updateStats({ championshipSeasons: [...new Set([...readStats().championshipSeasons, season.slug])] });
    } else {
      incrementStat("campaignLosses", 1);
      updateStats({ campaignWinStreak: 0 });
    }

    const newXp = xp + xpGained;
    const levelUpGained = coinsEarned(xp, newXp);
    setXp(newXp);
    if (coinGain > 0) setCoins((c) => c + coinGain);
    if (levelUpGained > 0) {
      setCoins((c) => c + levelUpGained);
      setLevelUp({ level: levelFromXp(newXp).level, coins: levelUpGained, particles: levelUpParticles(readEquipped().fx) });
    }
    if (!wonItAll) { await delay(AUTO_REDRAFT_DELAY_MS); restart(); }
  }

  const current = requiredRole ? roleInfo[requiredRole] : null;

  return <main className="arena freeplay-arena">
    <ArenaBackdrop />
    {champion ? <ChampionOverlay title="GRAND FINAL" subtitle="RLCS CHAMPIONS" onClose={() => setChampion(false)} /> : levelUp && <LevelUpOverlay level={levelUp.level} coins={levelUp.coins} particles={levelUp.particles} onClose={() => setLevelUp(null)} />}
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>{t("nav_freeplay")}</b></span></div>
      <div className="top-actions">
        <div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div>
        <div className="level"><small>LEVEL {progress.level}</small><div><i style={{ width: `${progress.intoLevel / progress.nextLevelXp * 100}%` }} /></div><b>{xp} XP</b></div>
      </div>
    </header>
    <section className="stage">
      <div className="hero-copy freeplay-hero"><p className="kicker">{t("freeplay_kicker")}</p><h1>{t("freeplay_title1")}<br /><span>{t("freeplay_title2")}</span></h1><p className="intro">{t("freeplay_intro")}</p></div>

      {!season ? <SeasonPicker seasons={allSeasons} onPick={pickSeason} /> : !mode ? <ModePicker onPick={pickMode} /> : <>
        <p className="drafting-from kicker">DRAFTING FROM · <button onClick={changeSeason} className="link-button">{season.name}</button> · <button onClick={changeMode} className="link-button">{MODE_INFO[mode].name} mode</button> · <button onClick={restart} className="link-button">↻ restart</button></p>
        <div className="draft-progress">{["ORG", "S1", "S2", "S3", "SUB", "COACH"].map((slot, index) => { const done = index === 0 ? Boolean(team.organization) : Boolean(picked[index - 1]); const isActive = index === 0 ? !team.organization : index - 1 === picked.length && Boolean(team.organization); return <div key={slot} className={done ? "progress-node complete" : isActive ? "progress-node active" : "progress-node"}><span>{done ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{slot}</small></div>; })}</div>
        {currentStep === "ORG" ? <section className="pick-zone"><div className="pick-heading"><span>{orgStepInfo.accent}</span><div><p className="kicker">LIVE DRAFT PICK</p><h2>{orgStepInfo.title}</h2></div><div className="pick-count">PICK <b>1</b> / 6</div></div><div className="cards">{orgOffer.map((org, index) => <OrgCard key={org.id} org={org} index={index} onPick={() => pickOrg(org)} />)}</div>{rerollsLeft > 0 && <button className="reroll-button" onClick={reroll}>🎲 REROLL ({rerollsLeft} left)</button>}</section>
        : current ? <section className="pick-zone"><div className="pick-heading"><span>{current.accent}</span><div><p className="kicker">LIVE DRAFT PICK</p><h2>{current.title}</h2></div><div className="pick-count">PICK <b>{picked.length + 2}</b> / 6</div></div><div className="cards">{offer.map((card, index) => <PlayerCard key={card.id} card={card} index={index} hideRating={!showRatings} showSeason={isLegends} onPick={() => pick(card)} />)}</div>{rerollsLeft > 0 && <button className="reroll-button" onClick={reroll}>🎲 REROLL ({rerollsLeft} left)</button>}{lastPick && <p className="picked-flash">✓ <b>{lastPick.handle}</b> joins your roster</p>}</section> : <section className="roster-ready"><div className="trophy">♜</div><div><p className="kicker">ROSTER COMPLETE</p><h2>YOUR DYNASTY IS READY</h2><p>Team power: <b>{showRatings ? power : "???"}</b></p></div><button onClick={simulate} disabled={simulating} className="playoff-button">{simulating ? "SIMULATING…" : "SIMULATE PLAYOFFS"} <span>→</span></button></section>}

        <section className="lineup-section">
          <div className="panel-title"><span>YOUR LINEUP</span><b>{power ? (showRatings ? `${power} POWER` : "HIDDEN") : "BUILDING"}</b></div>
          <div className="lineup-cards">
            {[...Array(5)].map((_, index) => { const p = picked[index]; const position = index < 3 ? `STARTER ${index + 1}` : index === 3 ? "SUB" : "COACH"; return <LineupCard key={position} player={p} position={position} showRatings={showRatings} />; })}
          </div>
        </section>

        <section className="match-section">
          <div className="panel-title"><span>PLAYOFF RUN</span><b>{season.name} · BO7 · MATCH-BY-MATCH</b></div>
          <div className="stage-panels">
            {playoffStages.map((stage, index) => {
              const result = results[index];
              const isPending = simulating && liveStageIndex === index;
              const opponentName = result?.opponent ?? opponents[index]?.name ?? "—";
              if (!result && !isPending && index > results.length) return <div className="stage-panel locked" key={stage}><div className="stage-panel-head"><div className="stage-panel-title"><small>{stage.toUpperCase()}</small><b>???</b></div></div></div>;
              return <StagePanel key={stage} stage={stage} opponentName={opponentName} result={result} isPending={isPending} revealedGames={isPending ? liveGames : []} />;
            })}
          </div>
          {results.length > 0 && !simulating && <p className="xp-earned">{results.some((r) => !r.won) ? "ELIMINATED — NEW DRAFT STARTING…" : "XP + COINS AWARDED — KEEP DRAFTING"}</p>}
        </section>
      </>}
    </section>
  </main>;
}
