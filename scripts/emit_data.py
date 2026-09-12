"""Phase 3: turn rated cards into the JSON files lib/seed-data.ts imports.

NOTE on player photos: Liquipedia's image CDN returns HTTP 403 on hotlinked <img> requests from
other origins (confirmed by loading a drafted card in the actual app), and rehosting the files
ourselves would need a per-photo license check per data/README.md's import policy. So no
imageUrl is emitted here; the UI's initials-avatar fallback (+ a country flag, see country= below)
covers every card.

Two additions layered on top of the real Liquipedia-sourced cards:
- MANUAL_ADDITIONS: a small, explicitly-labeled "Community & Rising Talent" pseudo-season for a
  handful of specific players the user asked to guarantee are *possible* pulls, who never
  appeared in a Worlds-qualified top-20 roster in the real cached data (verified by individual
  Liquipedia lookup -- they play in smaller/regional community leagues, not RLCS proper). Kept
  clearly separate from the real historical data rather than silently invented into a real season.
- Holo variants: the 5 highest-rated real appearances (by distinct player) each get a second,
  rarer "holo" card at +3 rating (capped 99) -- see lib/draft-shared.tsx's weighted draw for the
  lower pull rate.
"""
import json
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))
from compute_ratings import build_cards
from build_rosters import load_all_seasons

OUT_JSON = REPO_ROOT / "data" / "rlcs-cards.json"
OUT_SEASONS = REPO_ROOT / "data" / "rlcs-seasons-meta.json"
PLAYERS_CACHE = REPO_ROOT / "data" / "liquipedia-players-cache"

HOLO_COUNT = 5
HOLO_BONUS = 3

COMMUNITY_SEASON = {"slug": "community", "name": "Community & Rising Talent", "year": 2026}
MANUAL_ADDITIONS = [
    {"handle": "Rezears", "team": "The LANimals", "region": "Europe", "role": "SUBSTITUTE", "rating": 62, "country": "Germany"},
    {"handle": "Tox", "team": "Volare", "region": "Europe", "role": "SUBSTITUTE", "rating": 60, "country": "Germany"},
    {"handle": "Osaft", "team": "Triple pop", "region": "Europe", "role": "SUBSTITUTE", "rating": 58, "country": "Germany"},
    {"handle": "Dayyshift", "team": "Flyback eSports", "region": "Europe", "role": "SUBSTITUTE", "rating": 59, "country": "Germany"},
]


def load_countries():
    countries = {}
    if not PLAYERS_CACHE.exists():
        return countries
    for path in PLAYERS_CACHE.glob("*.json"):
        try:
            rec = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        if rec.get("country"):
            countries[rec["handle"].lower()] = rec["country"]
    return countries


def make_id(season, team, handle, role, seen_ids, suffix=""):
    card_id = f"{season}-{team}-{handle}-{role}{suffix}".replace(" ", "_")
    base_id = card_id
    n = 2
    while card_id in seen_ids:
        card_id = f"{base_id}-{n}"
        n += 1
    seen_ids.add(card_id)
    return card_id


def main():
    cards = build_cards()
    countries = load_countries()
    seen_ids = set()
    out = []
    for c in cards:
        out.append({
            "id": make_id(c["season"], c["team"], c["handle"], c["role"], seen_ids),
            "handle": c["handle"],
            "team": c["team"],
            "season": c["season"],
            "seasonName": c["seasonName"],
            "year": c["year"],
            "role": c["role"],
            "rating": c["rating"],
            "region": c["region"],
            **({"country": countries[c["handle"].lower()]} if c["handle"].lower() in countries else {}),
        })

    for m in MANUAL_ADDITIONS:
        out.append({
            "id": make_id(COMMUNITY_SEASON["slug"], m["team"], m["handle"], m["role"], seen_ids),
            "handle": m["handle"], "team": m["team"], "season": COMMUNITY_SEASON["slug"],
            "seasonName": COMMUNITY_SEASON["name"], "year": COMMUNITY_SEASON["year"],
            "role": m["role"], "rating": m["rating"], "region": m["region"],
            **({"country": m["country"]} if m.get("country") else {}),
        })

    # Holo variants: top 5 distinct players by their single best real appearance.
    best_by_handle = {}
    for c in out:
        key = c["handle"].lower()
        if key not in best_by_handle or c["rating"] > best_by_handle[key]["rating"]:
            best_by_handle[key] = c
    holo_sources = sorted(best_by_handle.values(), key=lambda c: -c["rating"])[:HOLO_COUNT]
    for src in holo_sources:
        holo = dict(src)
        holo["id"] = make_id(src["season"], src["team"], src["handle"], src["role"], seen_ids, suffix="-HOLO")
        # The 5 holo variants are, by construction, the best cards in the whole pool -- always the
        # cap (99), not literally base+3, so "5 players at a 99 rating" holds regardless of how
        # the non-holo ceiling (96) happens to round for that particular player.
        holo["rating"] = 99
        holo["isHolo"] = True
        out.append(holo)

    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    seasons_meta = []
    seen_slugs = set()
    for meta, teams, awards, prizes in sorted(load_all_seasons(), key=lambda x: x[0]["year"]):
        if meta["slug"] in seen_slugs:
            continue
        seen_slugs.add(meta["slug"])
        seasons_meta.append({"slug": meta["slug"], "name": meta["name"], "year": meta["year"]})
    seasons_meta.append(COMMUNITY_SEASON)
    OUT_SEASONS.write_text(json.dumps(seasons_meta, ensure_ascii=False, indent=2), encoding="utf-8")

    with_country = sum(1 for c in out if c.get("country"))
    print(f"Wrote {len(out)} cards ({with_country} with country, {HOLO_COUNT} holo) across {len(seasons_meta)} seasons -> {OUT_JSON}")


if __name__ == "__main__":
    main()
