# RocketLeagueDraft

A Next.js app where players draft a historical RLCS five-person roster from any of 13 real seasons (or an all-seasons "Legends" pool), simulate an animated playoff bracket, level up, spend coins in a cosmetic shop, and queue into a ranked 1v1 against other players' saved rosters.

## Run locally

1. Install Node.js 20.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env`.
3. Run `npm run db:generate` then `npm run db:push` to create the SQLite database (required for Ranked mode's matchmaking, MMR and leaderboard — Campaign mode and the Shop work without it).
4. Run `npm run dev` and open `http://localhost:3000`.

Campaign mode and the Shop read from the generated `data/rlcs-cards.json` via `lib/seed-data.ts` and need no database. Ranked mode is the only part that talks to the Prisma-backed API routes under `app/api/online/`.

## Architecture

- `app/` — Next.js App Router UI + `app/api/online/` route handlers (matchmaking, leaderboard).
- `components/app-shell.tsx` — top-level Campaign / Ranked / Shop tab switcher.
- `components/draft-arena.tsx` — the campaign draft + stage-by-stage animated playoff simulation.
- `components/online-duel.tsx` — ranked draft + matchmaking against another saved roster.
- `components/shop.tsx` — cosmetic-only purchases (arena themes, profile titles, coin skins); never touches ratings or simulation.
- `components/draft-shared.tsx` — UI/logic shared by campaign and ranked drafting (org packs, player cards, overlays).
- `lib/simulation.ts` — team power, Bo7 odds, stage-by-stage playoff simulation, XP/coin math.
- `lib/ranks.ts` — MMR → rank tier mapping and the Elo-style MMR delta formula.
- `lib/seed-data.ts` — generated card data, reads `data/rlcs-cards.json` / `data/rlcs-seasons-meta.json`.
- `prisma/schema.prisma` — historical-import model (`Season`/`Roster`/`RosterMember`) plus the ranked-mode model (`PlayerIdentity`/`Match`).
- `scripts/build_rosters.py`, `scripts/compute_ratings.py`, `scripts/emit_data.py` (Python) — the pipeline that turns `data/liquipedia-cache/*.json` into `data/rlcs-cards.json` / `data/rlcs-seasons-meta.json`. Re-run `python scripts/emit_data.py` after adding a season to `data/liquipedia-cache/` (via `npm run catalog:fetch`) to regenerate the catalog.

## Where the card data comes from

`data/rlcs-cards.json` (733 cards, 13 seasons: S1–S8, 2021–22, 2022–23, 2024, 2025, 2026) is generated from `data/liquipedia-cache/*.json`, which the existing `npm run catalog:fetch` script downloads. Season 9 and Season X are excluded — their World Championship LANs were cancelled (COVID-19), so Liquipedia has no participant data for them.

Roles (`STARTER` / `SUBSTITUTE` / `COACH`) are read directly from each season's recorded roster — a card is only ever offered as a substitute if it was genuinely benched that season. Player portraits were evaluated but are **not** included: Liquipedia's image CDN returns HTTP 403 on cross-origin `<img>` requests (confirmed by testing), and rehosting the files would need a per-photo license check per the policy below. The UI's initials-avatar fallback covers every card instead.

### Ratings

Ratings are a heuristic, not an official statistic — there is no public per-match performance dataset to draw on. Each rating blends two percentile-normalized components (computed once across the *entire* dataset, so "91" means the same tier of player in 2018 and 2026):

- **Individual signal (60% weight):** the player's recorded trophies and season awards (MVP, regional MVP, Striker/Saviour/Playmaker of the Season) *for that appearance*, plus their whole-career aggregate (total trophies, total awards, number of relevant seasons) — so a multi-season, repeatedly-decorated player clearly outrates a single-season riser, regardless of which team they're on.
- **Placement signal (40% weight):** that season's team strength — region weight (Europe/NA are historically deeper than other regions) × within-region qualification placement × a penalty for teams that only reached the event via a Last Chance Qualifier rather than qualifying directly.

## Game rules

Team Power = arithmetic mean of all five drafted ratings + the selected organization's bonus (0–3, offered as a random 3-card pack like the players). Playoffs are simulated one stage at a time — Top 16 → Top 8 → Top 4 → Final — against real teams from the drafted season (or, in Legends mode, teams aggregated across all seasons), each Bo7. Leveling up awards 10 coins, spendable in the Shop on purely cosmetic items.

## Ranked mode

Ranked always draws from the full all-seasons player pool. Drafting a roster and queuing calls `POST /api/online/match`, which upserts your `PlayerIdentity` (keyed by a random ID generated client-side into `localStorage`, the same "swap in real auth later" pattern as `UserProgress.userKey`), finds the closest-MMR opponent with a saved roster, simulates one Bo7, and applies an Elo-style MMR delta (`lib/ranks.ts`). Rank tiers mirror Rocket League's ladder (Bronze → Supersonic Legend); the MMR thresholds are an editorial approximation, not Psyonix's real curve. A fixed pool of practice bots (`lib/bots.ts`) backfills matchmaking before other real players exist, the same way most matchmakers handle a cold start — the leaderboard marks them clearly.

## Historical-data import policy

Liquipedia's Rocket League portal is CC-BY-SA 3.0; preserve source URL and collection date if you extend the catalog further. Don't hotlink or copy portraits without confirming license/permission per-photo — this is why the shipped catalog has no images. The `Person` / `RosterMember` Prisma schema is ready to receive a fuller historical import (including photo rights) if that's ever done properly.
