import { LegalPage } from "@/components/legal-page";

const ENTRIES = [
  {
    date: "2026-09-12",
    title: "Modernized card GUI, badges galore, big data update",
    items: [
      "Added RLCS Season X (rebuilt from its 4 regional championship pages after the World Championship was replaced by regional finals)",
      "Country flags on every card, drafted from real Liquipedia data",
      "Redesigned player cards: bigger region badge, flag, season tag in Legends mode, sealed (hidden-bonus) organization packs",
      "Substitute pool greatly expanded: any lower-rated player is now sub-eligible, not just historically-recorded subs",
      "5 rare holographic (+3 rating, capped 99) card variants for the very best players, with a much lower pull rate",
      "Ratings now also weigh real tournament earnings where Liquipedia records them, and use a revised region strength order (EU > MENA > NA > SAM > OCE > APAC > SSA)",
      "Freeplay (formerly \"Campaign\"): seasons now list oldest-first, coins are earned per playoff stage reached (more for tougher opponents), opponents are now randomized instead of the same 4 teams every run, and the whole background got a sharper, richer redesign",
      "New match-by-match playoff simulation: every Bo7 now reveals individual game scores instead of just a final series tally",
      "Completely rebuilt \"Your Lineup\" panel as a card-based roster display",
      "Shop: 5 new categories (card frames, victory banners, level-up FX, profile banners, team badge shapes), all cosmetics now actually apply visually, and prices went up across the board",
      "30 more (very grindy) badges on top of the original 30",
      "Footer with Impressum, Datenschutz, Kontakt, AGB and this Changelog",
    ],
  },
  {
    date: "2026-09-10",
    title: "Ranked 1v1, Profile, Badges, and difficulty modes",
    items: [
      "New Ranked 1v1 mode with a real backend: matchmaking, an RLCS-style rank ladder, a Top 100 leaderboard, and practice bots for cold-start queues",
      "Hardcore / Normal / Easy difficulty modes for Freeplay (hidden ratings + limited rerolls)",
      "Player Profile page with the first 30-badge, 3-tier challenge system",
      "Auto-restart into a new draft after a playoff elimination",
      "Cosmetic Shop (23 items at the time) and a dramatically reworked level-up celebration",
      "Fixed a rank-up/rank-down display bug and widened MMR bands so one match can no longer skip a whole rank tier",
    ],
  },
  {
    date: "2026-09-10 (earlier)",
    title: "Real RLCS history replaces the sample data",
    items: [
      "Replaced the original 2024-only sample roster with real rosters parsed from Liquipedia across 13 RLCS seasons",
      "Individual-performance-first rating formula (trophies, season awards, career longevity) after early per-season-only ratings felt arbitrary",
      "Coin currency, XP leveling, and an all-seasons \"Legends\" draft pool",
    ],
  },
];

export default function ChangelogPage() {
  return <LegalPage title="Changelog">
    <p>Was sich in RocketLeagueDraft zuletzt getan hat — chronologisch, neueste Änderungen zuerst.</p>
    {ENTRIES.map((entry) => <section key={entry.date} className="changelog-entry">
      <h2>{entry.title}<small>{entry.date}</small></h2>
      <ul>{entry.items.map((item, i) => <li key={i}>{item}</li>)}</ul>
    </section>)}
  </LegalPage>;
}
