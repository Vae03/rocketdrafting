"use client";

import { useEffect, useMemo, useState } from "react";
import {
  championXp,
  coinsEarned,
  coinsForStage,
  levelFromXp,
  playoffStages,
  seasonOpponents,
  simulateCareerStage,
  teamPower,
  xpForElimination,
} from "@/lib/simulation";
import { seasons as allSeasons, seedCards } from "@/lib/seed-data";
import { useTranslation } from "@/components/i18n-provider";
import { countryToIso } from "@/lib/flags";
import { FlagIcon } from "@/components/flag-icon";
import { advanceCareer, readCareer, type CareerState } from "@/lib/career";
import { incrementStat, raiseStatCeiling, todayKey, updateStats, readStats } from "@/lib/stats";
import type { DraftCard, DraftOrganization, DraftTeam, Season, TournamentResult } from "@/lib/types";
import {
  ArenaBackdrop,
  ChampionOverlay,
  CoinIcon,
  LevelUpOverlay,
  OrgCard,
  PlayerCard,
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
const MAX_REROLLS = 3;

/** Reward scaling for the extra risk of climbing higher -- modest and linear (the difficulty curve
 * itself is exponential via lib/simulation.ts's careerWinChance; rewards just need to keep pace). */
function careerRewardMultiplier(careerIndex: number) {
  return 1 + careerIndex * 0.15;
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

function LineupCard({ player, position }: { player?: DraftCard; position: string }) {
  const iso = player ? countryToIso(player.country) : null;
  return <div className={player ? `lineup-card filled${player.isHolo ? " holo-card" : ""}` : "lineup-card"}>
    {player?.isHolo && <div className="holo-shimmer" />}
    <small>{position}</small>
    {player ? <>
      <div className="lineup-card-avatar">{iso ? <FlagIcon iso={iso} className="card-flag" /> : null}<span>{player.handle.slice(0, 2).toUpperCase()}</span></div>
      <b>{player.handle}</b>
      <span className="lineup-card-team">{player.team}</span>
      <strong>{player.rating}</strong>
    </> : <div className="lineup-card-empty">—</div>}
  </div>;
}

function CareerLadder({ seasons, career, onPick }: { seasons: Season[]; career: CareerState; onPick: (index: number) => void }) {
  const complete = career.unlockedIndex === seasons.length - 1 && career.clearedSlugs.includes(seasons[seasons.length - 1]?.slug);
  return <section className="season-select career-ladder">
    <div className="panel-title"><span>THE CLIMB</span><b>{complete ? "CAREER COMPLETE" : `SEASON ${career.unlockedIndex + 1} OF ${seasons.length}`}</b></div>
    {complete && <p className="career-complete-banner">🏆 You&rsquo;ve climbed from RLCS Season 1 all the way to the present. Keep replaying the top for coins and XP.</p>}
    <div className="ladder-track">
      {seasons.map((season, index) => {
        const cleared = career.clearedSlugs.includes(season.slug);
        const locked = index > career.unlockedIndex;
        const current = index === career.unlockedIndex;
        const status = cleared && !current ? "cleared" : current ? "current" : "locked";
        return <button key={season.slug} disabled={locked} onClick={() => onPick(index)} className={`ladder-node ${status}`}>
          <span className="ladder-node-icon">{locked ? "🔒" : cleared ? "✓" : "⚔"}</span>
          <b>{season.name}</b>
          <small>{season.year}</small>
        </button>;
      })}
    </div>
  </section>;
}

export function CareerArena() {
  const { t } = useTranslation();
  const [career, setCareer] = useState<CareerState>(() => readCareer());
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [team, setTeam] = useState<DraftTeam>({ starters: [] });
  const [orgOffer, setOrgOffer] = useState<DraftOrganization[]>([]);
  const [offer, setOffer] = useState<DraftCard[]>([]);
  const [rerollsLeft, setRerollsLeft] = useState(MAX_REROLLS);
  const [xp, setXp] = useState(() => readStoredNumber(XP_STORAGE_KEY));
  const [coins, setCoins] = useState(() => readStoredNumber(COIN_STORAGE_KEY));
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [liveStageIndex, setLiveStageIndex] = useState(-1);
  const [liveGames, setLiveGames] = useState<TournamentResult["games"]>([]);
  const [simulating, setSimulating] = useState(false);
  const [lastPick, setLastPick] = useState<DraftCard | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; coins: number; particles: ReturnType<typeof levelUpParticles> } | null>(null);
  const [advanced, setAdvanced] = useState<{ clearedSeason: string; nextSeason: string | null } | null>(null);

  useEffect(() => { writeStoredValue(XP_STORAGE_KEY, String(xp)); }, [xp]);
  useEffect(() => { writeStoredValue(COIN_STORAGE_KEY, String(coins)); }, [coins]);
  useEffect(() => { raiseStatCeiling("peakCoins", coins); }, [coins]);

  const season = activeIndex !== null ? allSeasons[activeIndex] : null;
  const seasonPool = useMemo(() => (season ? seedCards.filter((card) => card.season === season.slug) : []), [season]);
  const rawOpponents = useMemo(() => (season ? seasonOpponents(seasonPool) : []), [season, seasonPool]);
  const picked = useMemo(() => [...team.starters, team.substitute, team.coach].filter(Boolean) as DraftCard[], [team]);
  const requiredRole: DraftCard["role"] | null = team.starters.length < 3 ? "STARTER" : !team.substitute ? "SUBSTITUTE" : !team.coach ? "COACH" : null;
  const currentStep: "ORG" | DraftCard["role"] | null = !team.organization ? "ORG" : requiredRole;
  const power = teamPower(team);
  const progress = levelFromXp(xp);
  const rewardMult = activeIndex !== null ? careerRewardMultiplier(activeIndex) : 1;

  function enterSeason(index: number) {
    setActiveIndex(index);
    setTeam({ starters: [] });
    setOrgOffer(drawOrgOffer());
    setOffer([]);
    setRerollsLeft(MAX_REROLLS);
    setResults([]); setLastPick(null); setAdvanced(null);
  }

  function backToLadder() {
    setActiveIndex(null);
    setTeam({ starters: [] }); setOrgOffer([]); setOffer([]); setResults([]); setLastPick(null); setAdvanced(null);
  }

  function pickOrg(org: DraftOrganization) {
    if (simulating) return;
    setTeam((currentTeam) => ({ ...currentTeam, organization: org }));
    setOffer(drawOffer(seasonPool, "STARTER", [], seedCards));
  }

  function pick(card: DraftCard) {
    if (!requiredRole || simulating) return;
    setLastPick(card); setResults([]);
    const updated = requiredRole === "STARTER" ? { ...team, starters: [...team.starters, card] } : requiredRole === "SUBSTITUTE" ? { ...team, substitute: card } : { ...team, coach: card };
    setTeam(updated);
    const nextRole = updated.starters.length < 3 ? "STARTER" : !updated.substitute ? "SUBSTITUTE" : !updated.coach ? "COACH" : null;
    if (nextRole) setOffer(drawOffer(seasonPool, nextRole, [...picked.map((player) => player.id), card.id], seedCards));
    else {
      incrementStat("careerDrafts", 1);
      const finishedPower = teamPower(updated);
      raiseStatCeiling("peakPower", finishedPower);
      if (season) updateStats({ addSeason: season.slug, addCoach: updated.coach?.handle, addOrg: updated.organization?.name, addDay: todayKey() });
      if (updated.substitute && updated.substitute.rating < 70) incrementStat("subPicksBelowSeventy", 1);
    }
  }

  function reroll() {
    if (rerollsLeft <= 0 || simulating || !currentStep) return;
    setRerollsLeft((r) => r - 1);
    incrementStat("rerollsUsed", 1);
    if (currentStep === "ORG") setOrgOffer(drawOrgOffer());
    else setOffer(drawOffer(seasonPool, currentStep, picked.map((p) => p.id), seedCards));
  }

  function restartDraft() {
    setTeam({ starters: [] });
    setOrgOffer(drawOrgOffer());
    setOffer([]);
    setRerollsLeft(MAX_REROLLS);
    setResults([]); setLastPick(null); setAdvanced(null); setLiveStageIndex(-1); setLiveGames([]);
  }

  async function simulate() {
    if (requiredRole || simulating || rawOpponents.length === 0 || activeIndex === null || !season) return;
    setSimulating(true); setResults([]); setAdvanced(null);
    const collected: TournamentResult[] = [];
    let xpGained = 0;
    let coinGain = 0;
    let wonItAll = false;
    for (let i = 0; i < playoffStages.length; i++) {
      setLiveStageIndex(i); setLiveGames([]);
      const match = simulateCareerStage(team, playoffStages[i], rawOpponents[i], activeIndex);
      for (let g = 0; g < match.games.length; g++) {
        await delay(GAME_REVEAL_MS);
        setLiveGames((prev) => [...prev, match.games[g]]);
      }
      await delay(STAGE_PAUSE_MS);
      collected.push(match);
      setResults([...collected]);
      coinGain += Math.round(coinsForStage(i, rawOpponents[i].power) * rewardMult);
      if (!match.won) { xpGained = Math.round(xpForElimination(i) * rewardMult); break; }
      if (i === playoffStages.length - 1) { xpGained = Math.round(championXp * rewardMult); wonItAll = true; }
    }
    setLiveStageIndex(-1); setLiveGames([]);
    setSimulating(false);

    const underdogWinCount = collected.filter((m) => m.won && power < m.opponentPower).length;
    if (underdogWinCount > 0) incrementStat("underdogWins", underdogWinCount);
    if (wonItAll) {
      const stats = incrementStat("careerWins", 1);
      const newStreak = stats.careerWinStreak + 1;
      updateStats({ careerWinStreak: newStreak, careerBestWinStreak: Math.max(stats.careerBestWinStreak, newStreak) });
      raiseStatCeiling("careerHighestSeasonIndex", activeIndex + 1);
      updateStats({ championshipSeasons: [...new Set([...readStats().championshipSeasons, season.slug])] });
      const nextState = advanceCareer(season.slug, activeIndex, allSeasons.length);
      setCareer(nextState);
      const nextSeason = activeIndex + 1 < allSeasons.length ? allSeasons[activeIndex + 1].name : null;
      setAdvanced({ clearedSeason: season.name, nextSeason });
    } else {
      incrementStat("careerLosses", 1);
      updateStats({ careerWinStreak: 0 });
    }

    const newXp = xp + xpGained;
    const levelUpGained = coinsEarned(xp, newXp);
    setXp(newXp);
    if (coinGain > 0) setCoins((c) => c + coinGain);
    if (levelUpGained > 0) {
      setCoins((c) => c + levelUpGained);
      setLevelUp({ level: levelFromXp(newXp).level, coins: levelUpGained, particles: levelUpParticles(readEquipped().fx) });
    }
    if (!wonItAll) { await delay(AUTO_REDRAFT_DELAY_MS); restartDraft(); }
  }

  const current = requiredRole ? roleInfo[requiredRole] : null;

  return <main className="arena career-arena">
    <ArenaBackdrop />
    {advanced ? <ChampionOverlay title="SEASON CLEARED" subtitle={advanced.nextSeason ? `${advanced.nextSeason.toUpperCase()} UNLOCKED` : "CAREER COMPLETE"} onClose={() => setAdvanced(null)} />
      : levelUp && <LevelUpOverlay level={levelUp.level} coins={levelUp.coins} particles={levelUp.particles} onClose={() => setLevelUp(null)} />}
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>{t("nav_career")}</b></span></div>
      <div className="top-actions">
        <div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div>
        <div className="level"><small>LEVEL {progress.level}</small><div><i style={{ width: `${progress.intoLevel / progress.nextLevelXp * 100}%` }} /></div><b>{xp} XP</b></div>
      </div>
    </header>
    <section className="stage">
      <div className="hero-copy career-hero"><p className="kicker">{t("career_kicker")}</p><h1>{t("career_title1")}<br /><span>{t("career_title2")}</span></h1><p className="intro">{t("career_intro")}</p></div>

      {!season ? <CareerLadder seasons={allSeasons} career={career} onPick={enterSeason} /> : <>
        <p className="drafting-from kicker">CAREER · <b>{season.name}</b> · DIFFICULTY ×{rewardMult.toFixed(2)} · <button onClick={backToLadder} className="link-button">↻ back to ladder</button></p>
        <div className="draft-progress">{["ORG", "S1", "S2", "S3", "SUB", "COACH"].map((slot, index) => { const done = index === 0 ? Boolean(team.organization) : Boolean(picked[index - 1]); const isActive = index === 0 ? !team.organization : index - 1 === picked.length && Boolean(team.organization); return <div key={slot} className={done ? "progress-node complete" : isActive ? "progress-node active" : "progress-node"}><span>{done ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{slot}</small></div>; })}</div>
        {currentStep === "ORG" ? <section className="pick-zone"><div className="pick-heading"><span>{orgStepInfo.accent}</span><div><p className="kicker">CAREER DRAFT PICK</p><h2>{orgStepInfo.title}</h2></div><div className="pick-count">PICK <b>1</b> / 6</div></div><div className="cards">{orgOffer.map((org, index) => <OrgCard key={org.id} org={org} index={index} onPick={() => pickOrg(org)} />)}</div>{rerollsLeft > 0 && <button className="reroll-button" onClick={reroll}>🎲 REROLL ({rerollsLeft} left)</button>}</section>
        : current ? <section className="pick-zone"><div className="pick-heading"><span>{current.accent}</span><div><p className="kicker">CAREER DRAFT PICK</p><h2>{current.title}</h2></div><div className="pick-count">PICK <b>{picked.length + 2}</b> / 6</div></div><div className="cards">{offer.map((card, index) => <PlayerCard key={card.id} card={card} index={index} onPick={() => pick(card)} />)}</div>{rerollsLeft > 0 && <button className="reroll-button" onClick={reroll}>🎲 REROLL ({rerollsLeft} left)</button>}{lastPick && <p className="picked-flash">✓ <b>{lastPick.handle}</b> joins your roster</p>}</section>
          : <section className="roster-ready"><div className="trophy">♜</div><div><p className="kicker">ROSTER COMPLETE</p><h2>{season.name.toUpperCase()} AWAITS</h2><p>Team power: <b>{power}</b></p></div><button onClick={simulate} disabled={simulating} className="playoff-button">{simulating ? "SIMULATING…" : "SIMULATE PLAYOFFS"} <span>→</span></button></section>}

        <section className="lineup-section">
          <div className="panel-title"><span>YOUR LINEUP</span><b>{power ? `${power} POWER` : "BUILDING"}</b></div>
          <div className="lineup-cards">
            {[...Array(5)].map((_, index) => { const p = picked[index]; const position = index < 3 ? `STARTER ${index + 1}` : index === 3 ? "SUB" : "COACH"; return <LineupCard key={position} player={p} position={position} />; })}
          </div>
        </section>

        <section className="match-section">
          <div className="panel-title"><span>PLAYOFF RUN</span><b>{season.name} · BO7 · MATCH-BY-MATCH</b></div>
          <div className="stage-panels">
            {playoffStages.map((stage, index) => {
              const result = results[index];
              const isPending = simulating && liveStageIndex === index;
              const opponentName = result?.opponent ?? rawOpponents[index]?.name ?? "—";
              if (!result && !isPending && index > results.length) return <div className="stage-panel locked" key={stage}><div className="stage-panel-head"><div className="stage-panel-title"><small>{stage.toUpperCase()}</small><b>???</b></div></div></div>;
              return <StagePanel key={stage} stage={stage} opponentName={opponentName} result={result} isPending={isPending} revealedGames={isPending ? liveGames : []} />;
            })}
          </div>
          {results.length > 0 && !simulating && <p className="xp-earned">{results.some((r) => !r.won) ? "ELIMINATED — NEW DRAFT STARTING…" : "SEASON CLEARED — NEXT SEASON UNLOCKED"}</p>}
        </section>
      </>}
    </section>
  </main>;
}
