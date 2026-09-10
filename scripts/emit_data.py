"""Phase 3: turn rated cards into the JSON files lib/seed-data.ts imports.

NOTE on player photos: Liquipedia's image CDN returns HTTP 403 on hotlinked <img> requests from
other origins (confirmed by loading a drafted card in the actual app), and rehosting the files
ourselves would need a per-photo license check per data/README.md's import policy. So no
imageUrl is emitted here; the UI's initials-avatar fallback covers every card.
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


def main():
    cards = build_cards()
    out = []
    seen_ids = set()
    for c in cards:
        card_id = f'{c["season"]}-{c["team"]}-{c["handle"]}-{c["role"]}'.replace(" ", "_")
        base_id = card_id
        n = 2
        while card_id in seen_ids:
            card_id = f"{base_id}-{n}"
            n += 1
        seen_ids.add(card_id)
        out.append({
            "id": card_id,
            "handle": c["handle"],
            "team": c["team"],
            "season": c["season"],
            "seasonName": c["seasonName"],
            "year": c["year"],
            "role": c["role"],
            "rating": c["rating"],
            "region": c["region"],
        })

    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")

    seasons_meta = []
    seen_slugs = set()
    for meta, teams, awards in sorted(load_all_seasons(), key=lambda x: x[0]["year"]):
        if meta["slug"] in seen_slugs:
            continue
        seen_slugs.add(meta["slug"])
        seasons_meta.append({"slug": meta["slug"], "name": meta["name"], "year": meta["year"]})
    OUT_SEASONS.write_text(json.dumps(seasons_meta, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Wrote {len(out)} cards across {len(seasons_meta)} seasons -> {OUT_JSON}")


if __name__ == "__main__":
    main()
