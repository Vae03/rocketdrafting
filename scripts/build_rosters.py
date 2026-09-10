"""Phase 1: parse all cached RLCS season pages into structured roster data
(no network calls -- pure parsing of data/liquipedia-cache/*.json)."""
import json
import re
import sys
import glob
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))
from wikitext import find_all_templates, split_params, parse_named_params

CACHE_DIR = str(REPO_ROOT / "data" / "liquipedia-cache")
CANCELLED_SEASONS = {"rlcs-s9", "rlcs-x"}  # Worlds LAN cancelled (COVID-19); no participant data
TOP_N_TEAMS = 20


def load_content(path):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    pages = data["page"]["query"]["pages"]
    pid = list(pages.keys())[0]
    rev = pages[pid].get("revisions")
    content = rev[0]["slots"]["main"]["*"] if rev else ""
    return content, data["season"], data["sourceUrl"]


def parse_person(content):
    positional, named = parse_named_params(split_params(content))
    handle = (positional[0] if positional else named.get("name", "?")).strip()
    role = named.get("role", "").strip().lower()
    status = named.get("status", "").strip().lower()
    link = named.get("link", "").strip()
    trophies = named.get("trophies", "0").strip()
    try:
        trophies_n = int(re.sub(r"[^0-9]", "", trophies) or "0")
    except ValueError:
        trophies_n = 0
    is_coach = role in ("coach", "performance coach", "assistant coach", "analyst", "manager")
    is_sub = status == "sub"
    return {"handle": handle, "link": link, "is_coach": is_coach, "is_sub": is_sub, "trophies": trophies_n}


def parse_opponent(content):
    positional, named = parse_named_params(split_params(content))
    team_name = (positional[0] if positional else named.get("name", "?")).strip()
    players_val = named.get("players", "")
    persons_templates = find_all_templates(players_val, "Persons")
    people = []
    seen = set()
    if persons_templates:
        for p_content, _, _ in find_all_templates(persons_templates[0][0], "Person"):
            person = parse_person(p_content)
            key = person["handle"].lower()
            if key and key not in seen:
                seen.add(key)
                people.append(person)
    qual_val = named.get("qualification", "")
    region, placement, is_wildcard = None, None, False
    for q_content, _, _ in find_all_templates(qual_val, "Qualification"):
        _, qnamed = parse_named_params(split_params(q_content))
        region, is_wildcard = extract_region(qnamed)
        placement_raw = qnamed.get("placement")
        try:
            placement = int(re.sub(r"[^0-9]", "", placement_raw)) if placement_raw else None
        except ValueError:
            placement = None
    return {"team": team_name, "region": region, "placement": placement, "is_wildcard": is_wildcard, "people": people}


REGION_ABBR = {
    "NA": "North America", "EU": "Europe", "SAM": "South America",
    "MENA": "Middle East and North Africa", "OCE": "Oceania",
    "APAC": "Asia-Pacific", "SSA": "Sub-Saharan Africa",
}


def extract_region(qnamed):
    """Returns (region_name_or_None, is_wildcard). Handles three wikitext shapes seen across
    seasons: a clean 'text=<Region> Points Ranking', a Last Chance Qualifier text like
    'Last Chance Qualifier: MENA', or (2026) no text= at all -- only 'page=.../Rankings/<Region>'."""
    text = qnamed.get("text", "")
    page = qnamed.get("page", "")
    is_wildcard = "last chance qualifier" in text.lower() or "last chance qualifier" in page.lower()
    if is_wildcard:
        m = re.search(r":\s*([A-Za-z]+)\s*$", text)
        if m:
            return REGION_ABBR.get(m.group(1).upper(), m.group(1)), True
    if text:
        cleaned = re.sub(r"\s+(Points Ranking|Ranking|Tiebreaker)\s*$", "", text).strip()
        if cleaned:
            return cleaned, is_wildcard
    m = re.search(r"Rankings/([A-Za-z_\- ]+?)\s*$", page)
    if m:
        return m.group(1).replace("_", " ").strip(), is_wildcard
    return None, is_wildcard


def parse_awards(content):
    """Returns dict: lower(handle) -> list of award label strings (season-level, not regional)."""
    awards = {}
    for block_content, _, _ in find_all_templates(content, "AwardPrizePool"):
        for slot_content, _, _ in find_all_templates(block_content, "Slot"):
            _, snamed = parse_named_params(split_params(slot_content))
            award_label = snamed.get("award", "")
            solo_blocks = find_all_templates(slot_content, "SoloOpponent")
            if not solo_blocks:
                continue
            solo_pos, _ = parse_named_params(split_params(solo_blocks[0][0]))
            if not solo_pos:
                continue
            handle_key = solo_pos[0].strip().lower()
            awards.setdefault(handle_key, []).append(award_label)
    return awards


def parse_season(path):
    content, season_meta, source_url = load_content(path)
    if season_meta["slug"] in CANCELLED_SEASONS or not content:
        return season_meta, [], {}
    tp_blocks = find_all_templates(content, "TeamParticipants")
    teams_by_name = {}
    for block_content, _, _ in tp_blocks:
        for opp_content, _, _ in find_all_templates(block_content, "Opponent"):
            team = parse_opponent(opp_content)
            if not team["team"] or team["team"] == "TBD":
                continue
            # Prefer the entry that actually has people + a placement; keep first seen otherwise.
            existing = teams_by_name.get(team["team"])
            if existing is None or (not existing["people"] and team["people"]):
                teams_by_name[team["team"]] = team
    teams = list(teams_by_name.values())
    awards = parse_awards(content)
    return season_meta, teams, awards


# Editorial region-strength weights (game-balance heuristic, not an official ranking):
# reflects RLCS's historically deeper/stronger regions so e.g. "Europe #3" isn't ranked
# below "Oceania #1" purely because of within-region placement number.
REGION_WEIGHT = {
    "Europe": 1.00,
    "North America": 0.93,
    "South America": 0.85,
    "Oceania": 0.78,
    "Middle East and North Africa": 0.75,
    "Asia-Pacific": 0.72,
    "Asia": 0.72,
    "Sub-Saharan Africa": 0.68,
}
DEFAULT_REGION_WEIGHT = 0.75


def team_strength(team):
    weight = REGION_WEIGHT.get(team["region"], DEFAULT_REGION_WEIGHT)
    placement = team["placement"] or 6
    within_region = max(1.0 - (placement - 1) * 0.12, 0.35)
    # A Last Chance Qualifier / wildcard spot means the team wasn't strong enough to qualify
    # directly from its region -- placement=1 in an LCQ bracket is not placement=1 in the region.
    wildcard_penalty = 0.7 if team.get("is_wildcard") else 1.0
    return weight * within_region * wildcard_penalty


def rank_key(team):
    return -team_strength(team)


def top_n(teams, n=TOP_N_TEAMS):
    ordered = sorted(teams, key=rank_key)
    return ordered[:n]


def load_all_seasons():
    all_seasons = []
    for path in sorted(glob.glob(CACHE_DIR + r"\*.json")):
        meta, teams, awards = parse_season(path)
        if not teams:
            continue
        selected = top_n(teams)
        all_seasons.append((meta, selected, awards))
    return all_seasons


def unique_people():
    """handle_lower -> {handle, link} picking the first non-empty link seen."""
    people = {}
    for meta, teams, awards in load_all_seasons():
        for t in teams:
            for p in t["people"]:
                key = p["handle"].lower()
                if key not in people:
                    people[key] = {"handle": p["handle"], "link": p["link"]}
                elif p["link"] and not people[key]["link"]:
                    people[key]["link"] = p["link"]
    return people


if __name__ == "__main__":
    all_seasons = load_all_seasons()
    for meta, teams, awards in all_seasons:
        total_people = sum(len(t["people"]) for t in teams)
        subs = sum(1 for t in teams for p in t["people"] if p["is_sub"])
        coaches = sum(1 for t in teams for p in t["people"] if p["is_coach"])
        print(f"{meta['slug']:16s} kept={len(teams):3d} people={total_people:4d} subs={subs:3d} coaches={coaches:3d} awards={len(awards):3d}")
    print("\nTOTAL seasons kept:", len(all_seasons))
    print("TOTAL unique handles:", len(unique_people()))
