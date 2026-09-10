# Historical RLCS catalog workflow

`liquipedia-seasons.json` is the audit list for all RLCS seasons. Run `npm run catalog:fetch` only after setting an identifying `LIQUIPEDIA_USER_AGENT` in `.env`. The downloader caches every season's MediaWiki API response into `liquipedia-cache/*.json` and limits requests to one every 2.1 seconds.

`rlcs-cards.json` and `rlcs-seasons-meta.json` are **generated** — run `python scripts/emit_data.py` (from the repo root) after `catalog:fetch` to (re)build them from whatever is in `liquipedia-cache/`. That pipeline (`scripts/build_rosters.py` → `scripts/compute_ratings.py` → `scripts/emit_data.py`) parses each season's `TeamParticipants` roster block for team/region/placement and per-person role (STARTER / SUBSTITUTE / COACH — a card is only ever marked SUBSTITUTE when the wikitext records `status=sub` for that person, never just because a player could have filled in), then rates each card from a blend of individual signal (trophies, season awards, whole-career aggregate) and that season's team placement — see the module docstring in `compute_ratings.py` for the exact formula. Season 9 and Season X are skipped: their World Championship LANs were cancelled (COVID-19), so there's no participant data to parse.

Player portraits were evaluated and are intentionally **not** included: Liquipedia's image CDN returns HTTP 403 on hotlinked `<img>` requests from another origin, and rehosting the files would need a per-photo license check regardless. The UI's initials-avatar fallback covers every card.

The source is Liquipedia under CC-BY-SA 3.0. Preserve the source URL, import date, and in-app attribution when extending the catalog further.
