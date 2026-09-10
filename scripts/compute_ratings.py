"""Phase 2: turn parsed rosters into rated DraftCard-shaped records.

Rating design (rewritten after feedback that the old placement-only formula was "fatal" --
e.g. a one-season wildcard-qualifier player rated the same as a multi-season legend):

  rating = f(individual_component, placement_component)

- individual_component is the dominant term (60%): built from THIS season's own trophies/award
  signal *plus* the player's whole-career aggregate (how many seasons they've been relevant in,
  how many trophies/awards across their whole recorded history) -- so sustained excellence
  (zen: many seasons, repeat trophies) clearly outscores a single lucky run (a one-season
  wildcard-qualifier player with zero trophies), independent of which team they're on.
- placement_component (40%) is that season's team strength: region weight (Europe/NA historically
  deeper than other regions) x within-region placement x a wildcard penalty for teams that only
  reached the event via a Last Chance Qualifier rather than qualifying directly.
- Both terms are computed for every player across the *entire* dataset first, then percentile-
  normalized once globally (not per-season) so a given rating means the same thing everywhere:
  "91" is always roughly the same tier of player, whether in 2018 or 2026.

Still a heuristic/game-balance system, not an official statistic -- there is no public per-match
individual performance data to draw on -- but it now differentiates real career-relevant signals
instead of an artifact of which bracket a team happened to qualify through.
"""
import sys
import bisect
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_rosters import load_all_seasons, team_strength

ROLE_FACTOR = {"STARTER": 1.0, "SUBSTITUTE": 0.9, "COACH": 0.85}
RATING_FLOOR = 55
RATING_SPAN = 44  # -> ratings land in [55, 99]

INDIVIDUAL_WEIGHT = 0.6
PLACEMENT_WEIGHT = 0.4

AWARD_WEIGHT = {
    "season mvp": 0.45,
}
DEFAULT_AWARD_WEIGHT = 0.28  # regional MVP / Striker / Saviour / Playmaker of the Season, etc.


def role_of(person):
    if person["is_coach"]:
        return "COACH"
    if person["is_sub"]:
        return "SUBSTITUTE"
    return "STARTER"


def award_weight(label):
    key = label.lower()
    if "season mvp" in key and "regional" not in key and "end of" not in key.replace("-", " "):
        return AWARD_WEIGHT["season mvp"]
    return DEFAULT_AWARD_WEIGHT


def build_cards():
    all_seasons = load_all_seasons()

    # Pass 1: collect every (season, team, person, team_strength, award_count) appearance,
    # and build each handle's whole-career aggregate at the same time.
    appearances = []  # dicts, one per drafted card
    career = {}  # handle_lower -> {trophies, awards, seasons}

    for meta, teams, awards in all_seasons:
        for team in teams:
            strength = team_strength(team)
            for person in team["people"]:
                handle_key = person["handle"].lower()
                season_award_labels = awards.get(handle_key, [])
                season_award_score = sum(award_weight(a) for a in season_award_labels)
                entry = career.setdefault(handle_key, {"trophies": 0, "awards": 0.0, "seasons": set()})
                entry["trophies"] += person["trophies"]
                entry["awards"] += season_award_score
                entry["seasons"].add(meta["slug"])
                appearances.append({
                    "handle": person["handle"], "handle_key": handle_key,
                    "team": team["team"], "season": meta["slug"], "seasonName": meta["name"],
                    "year": meta["year"], "role": role_of(person), "region": team["region"] or "Unknown",
                    "strength": strength, "trophies_this_season": person["trophies"],
                    "season_award_score": season_award_score,
                })

    # Pass 2: score each appearance using that player's now-complete career aggregate.
    scored = []
    for a in appearances:
        c = career[a["handle_key"]]
        career_seasons = len(c["seasons"])
        individual_raw = (
            a["trophies_this_season"] * 0.15
            + a["season_award_score"]
            + min(c["trophies"], 6) * 0.10
            + min(c["awards"], 3.0) * 0.12
            + min(career_seasons, 8) * 0.05
        )
        scored.append({**a, "individual_raw": individual_raw})

    # Pass 3: percentile-normalize BOTH components once across the whole dataset (not per
    # season) so ratings mean the same tier of player everywhere, then blend + apply role factor.
    def percentile_rank(values):
        ordered = sorted(values)
        n = len(ordered)
        ranks = []
        for v in values:
            lo = bisect.bisect_left(ordered, v)
            hi = bisect.bisect_right(ordered, v)
            ranks.append(((lo + hi - 1) / 2) / max(n - 1, 1))
        return ranks

    individual_pct = percentile_rank([s["individual_raw"] for s in scored])
    placement_pct = percentile_rank([s["strength"] for s in scored])

    cards = []
    for s, ind_pct, plc_pct in zip(scored, individual_pct, placement_pct):
        blended = ind_pct * INDIVIDUAL_WEIGHT + plc_pct * PLACEMENT_WEIGHT
        blended *= ROLE_FACTOR[s["role"]]
        rating = round(RATING_FLOOR + min(blended, 1.0) * RATING_SPAN)
        cards.append({
            "handle": s["handle"], "team": s["team"], "season": s["season"],
            "seasonName": s["seasonName"], "year": s["year"], "role": s["role"],
            "region": s["region"], "rating": max(1, min(99, rating)),
        })
    return cards


if __name__ == "__main__":
    cards = build_cards()
    print("Total cards:", len(cards))
    ratings = sorted(c["rating"] for c in cards)
    print("min/median/max:", ratings[0], ratings[len(ratings)//2], ratings[-1])
    for c in cards:
        if c["handle"].lower() in ("zen", "m7md") and c["season"] == "rlcs-2026":
            print(c)
    print("--- spot check known legends (should be high) ---")
    for handle in ["Kaydop", "GarrettG", "SquishyMuffinz", "zen", "Firstkiller"]:
        entries = [c for c in cards if c["handle"].lower() == handle.lower()]
        for e in sorted(entries, key=lambda x: x["year"]):
            print(handle, e["season"], e["team"], e["rating"])
