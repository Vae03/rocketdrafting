# RocketLeagueDraft

A Next.js MVP where players draft a historical RLCS five-person roster, simulate a playoff bracket, and gain XP.

## Run locally

1. Install Node.js 20.9 or newer and run `npm install`.
2. Copy `.env.example` to `.env`.
3. Run `npm run db:generate`, `npm run db:push`, then `npm run db:seed` to create the optional SQLite data store.
4. Run `npm run dev` and open `http://localhost:3000`.

The playable MVP intentionally reads from `lib/seed-data.ts` so it works immediately even before a database is configured. The Prisma schema and seed script provide the production migration path. The included board contains representative 2024 teams; it is intentionally a sample rather than an assertion that the historical catalog is complete.

## Architecture

- `app/` — Next.js App Router UI.
- `components/draft-arena.tsx` — client-side draft state and interaction.
- `lib/simulation.ts` — deterministic-to-test tournament rules plus random Bo7 outcomes.
- `lib/seed-data.ts` — sample card data. Each card is a season-specific rating.
- `prisma/schema.prisma` — normalized model: people → season rosters → role/rating.

## Growing the database

Create a `Season`, its top teams as `Organization` + `Roster`, then add each person as a `RosterMember`. A person may appear on any number of season rosters, which preserves historical transfers and lets the same player have a different rating every season. Replace the `seedCards` reader with a server-side Prisma query/API route when the full historical dataset is imported.

The ratings in the included 2024 sample are game-balance values, not official RLCS stats. Validate/import placements, rosters, and ratings from a maintained source before presenting the full all-seasons database as factual.

## Game rules

Team Power = arithmetic mean of all five drafted ratings + the selected organization bonus (0–3). Only cards specifically recorded as SUBSTITUTE can occupy the substitute slot; a starter-only player is never offered there. The bracket is four Bo7 series: Round of 16 → Quarterfinal → Semifinal → Grand Final.

## Historical-data import policy

The app is deliberately not claiming that its small local sample is the full RLCS archive. A complete catalog needs a documented source for every season's regional standings, roster roles, and player-photo rights. The recommended import rule is: rank teams by that season's official or recorded points across all regions, retain the top 30, and store the source URL and collection date with every imported roster.

Liquipedia's Rocket League portal exposes team, player, and event listings, while official Rocket League rules define modern qualification points; use these as review sources and do not hotlink or copy portraits without confirming their license or permission. The Person / RosterMember schema is ready for this historical import, including season-specific ratings and a genuine substitute role.
