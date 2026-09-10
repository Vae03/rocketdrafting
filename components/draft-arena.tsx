"use client";

import { useEffect, useMemo, useState } from "react";
import { defaultOpponents, levelFromXp, simulatePlayoffs, teamPower } from "@/lib/simulation";
import { seedCards } from "@/lib/seed-data";
import type { DraftCard, DraftTeam, TournamentResult } from "@/lib/types";

const organizations = [
  { id: "free-agent", name: "Free Agent", bonus: 0, color: "#687083" },
  { id: "nrg", name: "NRG", bonus: 1, color: "#f25555" },
  { id: "vitality", name: "Team Vitality", bonus: 2, color: "#ffd146" },
  { id: "karmine", name: "Karmine Corp", bonus: 3, color: "#4f79ff" },
] as const;

const roleInfo = {
  STARTER: { title: "Choose your starter", detail: "Pick 1 of 3 elite players", accent: "01" },
  SUBSTITUTE: { title: "Choose your substitute", detail: "Your clutch fourth option", accent: "04" },
  COACH: { title: "Choose your coach", detail: "The mastermind behind the roster", accent: "05" },
} as const;

function drawOffer(role: DraftCard["role"], excluded: string[]) {
  return seedCards.filter((card) => card.role === role && !excluded.includes(card.id)).sort(() => Math.random() - 0.5).slice(0, 3);
}

function PlayerCard({ card, onPick, index }: { card: DraftCard; onPick: () => void; index: number }) {
  return <button onClick={onPick} className="draft-card" style={{ animationDelay: `${index * 75}ms` }}>
    <div className="card-grid" /><div className="card-shine" />
    <div className="card-top"><span>{card.region}</span><b>{card.rating}</b></div>
    <div className="card-orb">{card.imageUrl ? <img src={card.imageUrl} alt={card.handle} /> : <span>{card.handle.slice(0, 2).toUpperCase()}</span>}</div>
    <div className="card-bottom"><p>{card.team}</p><h3>{card.handle}</h3><div><span>{card.role === "STARTER" ? "PLAYER" : card.role}</span><strong>SELECT →</strong></div></div>
  </button>;
}

export function DraftArena() {
  const [team, setTeam] = useState<DraftTeam>({ starters: [], organization: organizations[0] });
  const [offer, setOffer] = useState<DraftCard[]>(() => seedCards.filter((card) => card.role === "STARTER").slice(0, 3));
  const [xp, setXp] = useState(0);
  const [results, setResults] = useState<TournamentResult[] | null>(null);
  const [lastPick, setLastPick] = useState<DraftCard | null>(null);
  const picked = useMemo(() => [...team.starters, team.substitute, team.coach].filter(Boolean) as DraftCard[], [team]);
  const requiredRole: DraftCard["role"] | null = team.starters.length < 3 ? "STARTER" : !team.substitute ? "SUBSTITUTE" : !team.coach ? "COACH" : null;
  const power = teamPower(team);
  const progress = levelFromXp(xp);

  // The first static board keeps server/client rendering identical; it is shuffled
  // immediately after the arena mounts, then every following board is random too.
  useEffect(() => {
    const shuffleTimer = window.setTimeout(() => setOffer(drawOffer("STARTER", [])), 0);
    return () => window.clearTimeout(shuffleTimer);
  }, []);

  function pick(card: DraftCard) {
    if (!requiredRole) return;
    setLastPick(card); setResults(null);
    const updated = requiredRole === "STARTER" ? { ...team, starters: [...team.starters, card] } : requiredRole === "SUBSTITUTE" ? { ...team, substitute: card } : { ...team, coach: card };
    setTeam(updated);
    const nextRole = updated.starters.length < 3 ? "STARTER" : !updated.substitute ? "SUBSTITUTE" : !updated.coach ? "COACH" : null;
    if (nextRole) setOffer(drawOffer(nextRole, [...picked.map((player) => player.id), card.id]));
  }

  function restart() { setTeam({ starters: [], organization: organizations[0] }); setOffer(drawOffer("STARTER", [])); setResults(null); setLastPick(null); }
  function simulate() { if (!requiredRole) { const run = simulatePlayoffs(team, defaultOpponents); setResults(run.results); setXp((value) => value + run.xp); } }
  const current = requiredRole ? roleInfo[requiredRole] : null;

  return <main className="arena">
    <div className="arena-noise" /><div className="arena-lights" />
    <header className="topbar"><div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>DRAFT ARENA</b></span></div><div className="top-actions"><div className="level"><small>LEVEL {progress.level}</small><div><i style={{ width: `${progress.intoLevel / progress.nextLevelXp * 100}%` }} /></div><b>{xp} XP</b></div><button className="restart" onClick={restart}>↻ NEW DRAFT</button></div></header>
    <section className="stage">
      <div className="hero-copy"><p className="kicker">RLCS HISTORY • GLOBAL DRAFT DATABASE</p><h1>CREATE YOUR<br /><span>CHAMPIONS.</span></h1><p className="intro">Five picks. One trophy. Every choice shapes your run through the Rocket League playoffs.</p></div>
      <section className="org-select"><div><p className="kicker">ORGANIZATION BOOST</p><h2>Sign an organization</h2><p>Choose one bonus for this draft. It is added after the roster average.</p></div><div className="org-options">{organizations.map((org) => <button key={org.id} onClick={() => setTeam((currentTeam) => ({ ...currentTeam, organization: org }))} className={team.organization?.id === org.id ? "org-option selected" : "org-option"} style={{ "--org-color": org.color } as React.CSSProperties}><span>{org.name}</span><b>+{org.bonus}</b></button>)}</div></section>
      <div className="draft-progress">{["S1", "S2", "S3", "SUB", "COACH"].map((slot, index) => <div key={slot} className={picked[index] ? "progress-node complete" : index === picked.length ? "progress-node active" : "progress-node"}><span>{picked[index] ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{slot}</small></div>)}</div>
      {current ? <section className="pick-zone"><div className="pick-heading"><span>{current.accent}</span><div><p className="kicker">LIVE DRAFT PICK</p><h2>{current.title}</h2><p>{current.detail}</p></div><div className="pick-count">PICK <b>{picked.length + 1}</b> / 5</div></div><div className="cards">{offer.map((card, index) => <PlayerCard key={card.id} card={card} index={index} onPick={() => pick(card)} />)}</div>{lastPick && <p className="picked-flash">✓ <b>{lastPick.handle}</b> joins your roster</p>}</section> : <section className="roster-ready"><div className="trophy">♜</div><div><p className="kicker">ROSTER COMPLETE</p><h2>YOUR DYNASTY IS READY</h2><p>Team power: <b>{power}</b> · Take on the RLCS playoff bracket.</p></div><button onClick={simulate} className="playoff-button">SIMULATE PLAYOFFS <span>→</span></button></section>}
      <section className="bottom-grid"><div className="squad-panel"><div className="panel-title"><span>YOUR LINEUP</span><b>{power ? `${power} POWER` : "BUILDING"}</b></div><div className="lineup">{[...Array(5)].map((_, index) => { const player = picked[index]; const position = index < 3 ? `STARTER ${index + 1}` : index === 3 ? "SUBSTITUTE" : "COACH"; return <div className={player ? "lineup-item filled" : "lineup-item"} key={position}><span>{player ? String(index + 1).padStart(2, "0") : "—"}</span><div><small>{position}</small><b>{player?.handle ?? "Not drafted"}</b></div>{player && <strong>{player.rating}</strong>}</div>; })}</div><p className="power-rule">POWER = arithmetic mean of all 5 ratings + <b>{team.organization?.name} +{team.organization?.bonus}</b></p></div>
      <div className="bracket-panel"><div className="panel-title"><span>PLAYOFF RUN</span><b>TOP 16 · BO7</b></div>{["Round of 16", "Quarterfinal", "Semifinal", "Grand Final"].map((round, index) => { const result = results?.[index]; return <div className={`bracket-row ${result?.won ? "won" : result ? "lost" : ""}`} key={round}><div><small>{round.toUpperCase()}</small><b>{result?.opponent ?? defaultOpponents[index].name}</b></div><strong>{result ? result.score : "—"}</strong><em>{result ? result.won ? "WIN" : "OUT" : "WAITING"}</em></div>; })}{results && <p className="xp-earned">XP AWARDED — KEEP DRAFTING</p>}</div></section>
    </section>
  </main>;
}
