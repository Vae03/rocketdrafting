"use client";

import { useEffect, useMemo, useState } from "react";
import { seedCards } from "@/lib/seed-data";
import { teamPower } from "@/lib/simulation";
import type { DraftCard, DraftOrganization, DraftTeam } from "@/lib/types";
import {
  ArenaBackdrop,
  CoinIcon,
  OrgCard,
  PlayerCard,
  TeamBadge,
  COIN_STORAGE_KEY,
  drawOffer,
  drawOrgOffer,
  orgStepInfo,
  readStoredNumber,
  writeStoredValue,
} from "@/components/draft-shared";

const roleInfo = {
  STARTER: { title: "Choose your starter", accent: "01" },
  SUBSTITUTE: { title: "Choose your substitute", accent: "04" },
  COACH: { title: "Choose your coach", accent: "05" },
} as const;
const SLOT_LABELS = ["ORG", "S1", "S2", "S3", "SUB", "COACH"];

type RosterSlot = { handle: string; rating: number; role: string };
type Challenge = {
  friendUserId: string; displayName: string; avatarEmoji: string; avatarColor: string;
  power: number; roster: RosterSlot[]; org: DraftOrganization;
  headToHead: { wins: number; losses: number };
};
type MatchResult = { won: boolean; score: string; opponent: { displayName: string; power: number }; headToHead: { wins: number; losses: number } };

function OpponentSlot({ label, slot, revealed }: { label: string; slot?: RosterSlot | DraftOrganization; revealed: boolean }) {
  if (!revealed || !slot) return <div className="opp-slot locked"><small>{label}</small><span>?</span></div>;
  if ("bonus" in slot) return <div className="opp-slot filled"><small>{label}</small><b>{slot.name}</b><strong>+{slot.bonus}</strong></div>;
  return <div className="opp-slot filled"><small>{label}</small><b>{slot.handle}</b><strong>{slot.rating}</strong></div>;
}

export function FriendlyDuel({ friend, onExit }: { friend: { id: string; displayName: string }; onExit: () => void }) {
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [team, setTeam] = useState<DraftTeam>({ starters: [] });
  const [orgOffer, setOrgOffer] = useState<DraftOrganization[]>(() => drawOrgOffer());
  const [offer, setOffer] = useState<DraftCard[]>(() => drawOffer(seedCards, "STARTER", []));
  const [lastPick, setLastPick] = useState<DraftCard | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [coins, setCoins] = useState(() => readStoredNumber(COIN_STORAGE_KEY));

  useEffect(() => { writeStoredValue(COIN_STORAGE_KEY, String(coins)); }, [coins]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/friendly/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendUserId: friend.id }) })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (cancelled) return;
        if (!ok) { setError(data.error ?? "Couldn't start the battle"); return; }
        setChallenge(data);
      })
      .catch(() => { if (!cancelled) setError("Couldn't start the battle"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [friend.id]);

  const picked = useMemo(() => [...team.starters, team.substitute, team.coach].filter(Boolean) as DraftCard[], [team]);
  const requiredRole: DraftCard["role"] | null = team.starters.length < 3 ? "STARTER" : !team.substitute ? "SUBSTITUTE" : !team.coach ? "COACH" : null;
  const currentStep: "ORG" | DraftCard["role"] | null = !team.organization ? "ORG" : requiredRole;
  const power = teamPower(team);
  const revealedCount = (team.organization ? 1 : 0) + picked.length;

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
    else void submitMatch(updated);
  }

  async function submitMatch(finishedTeam: DraftTeam) {
    setSubmitting(true); setError(null);
    try {
      const finalPower = teamPower(finishedTeam);
      const res = await fetch("/api/friendly/match", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          friendUserId: friend.id, teamPower: finalPower, org: finishedTeam.organization,
          teamSummary: [...finishedTeam.starters, finishedTeam.substitute, finishedTeam.coach]
            .filter((c): c is DraftCard => Boolean(c))
            .map((c) => ({ handle: c.handle, rating: c.rating, role: c.role })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Match submission failed");
      setResult(data);
      setCoins((c) => c + (data.won ? 20 : 8));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Match submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  function battleAgain() {
    setTeam({ starters: [] });
    setOrgOffer(drawOrgOffer());
    setOffer(drawOffer(seedCards, "STARTER", []));
    setLastPick(null);
    setResult(null);
    setError(null);
    setLoading(true);
    fetch("/api/friendly/challenge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ friendUserId: friend.id }) })
      .then((r) => r.json().then((data) => ({ ok: r.ok, data })))
      .then(({ ok, data }) => { if (!ok) { setError(data.error ?? "Couldn't start the battle"); return; } setChallenge(data); })
      .catch(() => setError("Couldn't start the battle"))
      .finally(() => setLoading(false));
  }

  const current = requiredRole ? roleInfo[requiredRole] : null;
  const opponentSlotValues: (RosterSlot | DraftOrganization | undefined)[] = challenge ? [challenge.org, ...challenge.roster] : [];

  return <main className="arena ranked-arena friendly-arena">
    <ArenaBackdrop />
    <header className="topbar">
      <div className="brand"><span className="brand-icon">RL</span><span><em>ROCKET LEAGUE</em><b>FRIENDLY BATTLE</b></span></div>
      <div className="top-actions">
        <div className="coin-badge"><CoinIcon className="coin-icon" /><b>{coins}</b></div>
        <button className="restart" onClick={onExit}>← back to friends</button>
      </div>
    </header>
    <section className="stage">
      <div className="hero-copy"><p className="kicker">NO MMR AT STAKE • JUST BRAGGING RIGHTS</p><h1>CHALLENGE<br /><span>{friend.displayName.toUpperCase()}.</span></h1><p className="intro">Draft turns alternate just like Ranked — their real last-drafted roster reveals itself pick by pick.</p></div>

      {loading ? <p className="power-rule">Loading {friend.displayName}&rsquo;s team…</p>
        : error && !challenge ? <section className="roster-ready ranked-queue-ready"><div className="trophy">⚠</div><div><p className="kicker">CAN&apos;T START</p><h2>{error}</h2></div><button onClick={onExit} className="playoff-button">BACK TO FRIENDS <span>→</span></button></section>
        : challenge && <>
        <p className="drafting-from kicker">VS <b className="vs-opponent-name">{challenge.displayName}</b> · head-to-head {challenge.headToHead.wins}–{challenge.headToHead.losses}</p>
        <div className="draft-progress">{SLOT_LABELS.map((slot, index) => { const done = index === 0 ? Boolean(team.organization) : Boolean(picked[index - 1]); const isActive = index === 0 ? !team.organization : index - 1 === picked.length && Boolean(team.organization); return <div key={slot} className={done ? "progress-node complete" : isActive ? "progress-node active" : "progress-node"}><span>{done ? "✓" : String(index + 1).padStart(2, "0")}</span><small>{slot}</small></div>; })}</div>

        <div className="vs-columns">
          <div className="vs-column">
            <div className="vs-column-head"><TeamBadge name="YOU" /><b>YOU</b></div>
            {result ? <section className="match-result-panel">
              <div className={`match-outcome ${result.won ? "won" : "lost"}`}>{result.won ? "VICTORY" : "DEFEAT"}</div>
              <div className="match-versus">
                <div className="match-side"><TeamBadge name="YOU" /><b>YOU</b><small>{power} POWER</small></div>
                <div className="match-score">{result.score}</div>
                <div className="match-side"><TeamBadge name={result.opponent.displayName} /><b>{result.opponent.displayName}</b><small>{result.opponent.power} POWER</small></div>
              </div>
              <p className="mmr-delta">Head-to-head now <b>{result.headToHead.wins}–{result.headToHead.losses}</b> · <CoinIcon className="inline-coin" /> +{result.won ? 20 : 8}</p>
              <button className="playoff-button" onClick={battleAgain}>BATTLE AGAIN <span>→</span></button>
            </section> : submitting ? <p className="power-rule">Submitting match…</p>
              : currentStep === "ORG" ? <section className="pick-zone"><div className="pick-heading"><span>{orgStepInfo.accent}</span><div><p className="kicker">FRIENDLY DRAFT</p><h2>{orgStepInfo.title}</h2></div><div className="pick-count">PICK <b>1</b> / 6</div></div><div className="cards">{orgOffer.map((org, index) => <OrgCard key={org.id} org={org} index={index} onPick={() => pickOrg(org)} />)}</div></section>
              : current ? <section className="pick-zone"><div className="pick-heading"><span>{current.accent}</span><div><p className="kicker">FRIENDLY DRAFT</p><h2>{current.title}</h2></div><div className="pick-count">PICK <b>{picked.length + 2}</b> / 6</div></div><div className="cards">{offer.map((card, index) => <PlayerCard key={card.id} card={card} index={index} showSeason onPick={() => pick(card)} />)}</div>{lastPick && <p className="picked-flash">✓ <b>{lastPick.handle}</b> joins your roster</p>}</section>
              : <p className="power-rule">Roster locked — submitting…</p>}
          </div>

          <div className="vs-column">
            <div className="vs-column-head"><TeamBadge name={challenge.displayName} /><b>{challenge.displayName}</b></div>
            <div className="opp-slots">
              {SLOT_LABELS.map((label, i) => <OpponentSlot key={label} label={label} slot={opponentSlotValues[i]} revealed={i < revealedCount} />)}
            </div>
          </div>
        </div>
        {error && <p className="match-error">{error}</p>}
      </>}
    </section>
  </main>;
}
