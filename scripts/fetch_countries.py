"""Phase (optional, network): fetch each unique player's own Liquipedia page (rate-limited,
cached to disk) to read their `country=` infobox field, used for flag emoji in the UI.
Resumable: re-running skips handles already cached."""
import json
import os
import re
import sys
import time
import urllib.request
import urllib.parse
import gzip
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
sys.path.insert(0, str(SCRIPT_DIR))
from build_rosters import unique_people

ENDPOINT = "https://liquipedia.net/rocketleague/api.php"
USER_AGENT = "RocketLeagueDraftResearch/1.0 (leandropaolicelli@gmail.com)"
CACHE_DIR = REPO_ROOT / "data" / "liquipedia-players-cache"
RATE_LIMIT_SECONDS = 2.1


def safe_filename(handle):
    return re.sub(r"[^A-Za-z0-9_.-]", "_", handle) + ".json"


def fetch_title(title):
    params = {
        "action": "query", "format": "json", "prop": "revisions",
        "rvprop": "content", "rvslots": "main", "redirects": "1", "titles": title,
    }
    url = ENDPOINT + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "gzip"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        raw = resp.read()
        if resp.headers.get("Content-Encoding") == "gzip":
            raw = gzip.decompress(raw)
    data = json.loads(raw.decode("utf-8"))
    pages = data.get("query", {}).get("pages", {})
    if not pages:
        return ""
    pid = list(pages.keys())[0]
    if pid == "-1":
        return ""
    rev = pages[pid].get("revisions")
    return rev[0]["slots"]["main"]["*"] if rev else ""


def extract_infobox_field(content, field):
    m = re.search(r"\|\s*" + re.escape(field) + r"\s*=\s*([^\n|]*)", content)
    return m.group(1).strip() if m else ""


def main():
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    people = unique_people()
    todo = [(k, v) for k, v in people.items() if not (CACHE_DIR / safe_filename(k)).exists()]
    print(f"Total handles: {len(people)} | already cached: {len(people) - len(todo)} | to fetch: {len(todo)}")
    for i, (key, info) in enumerate(todo):
        handle = info["handle"]
        link = info["link"]
        title_tried = link if link else handle
        try:
            content = fetch_title(title_tried)
            if not content and link:
                content = fetch_title(handle)
                title_tried = handle
        except Exception as e:
            content = ""
            print(f"[{i+1}/{len(todo)}] ERROR {handle}: {e}")
        country = extract_infobox_field(content, "country") if content else ""
        result = {"handle": handle, "title_tried": title_tried, "found": bool(content), "country": country}
        with open(CACHE_DIR / safe_filename(key), "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        if (i + 1) % 25 == 0 or i == len(todo) - 1:
            print(f"[{i+1}/{len(todo)}] {handle} -> found={result['found']} country={country or '?'}")
        time.sleep(RATE_LIMIT_SECONDS)
    print("Done.")


if __name__ == "__main__":
    main()
