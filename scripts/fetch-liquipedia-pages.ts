/**
 * Downloads season source pages through Liquipedia's public MediaWiki API.
 * The downloader deliberately caches results and waits 2.1 seconds per request.
 */
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { join } from "node:path";

type SeasonSource = { slug: string; name: string; year: number; page: string };
type Manifest = { source: string; seasons: SeasonSource[] };
const endpoint = "https://liquipedia.net/rocketleague/api.php";

async function loadLocalEnv() {
  try {
    const contents = await readFile(".env", "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // A useful configuration error is shown below if the value is absent.
  }
}

async function main() {
  await loadLocalEnv();
  const userAgent = process.env.LIQUIPEDIA_USER_AGENT;
  if (!userAgent || !userAgent.includes("@")) throw new Error("Set LIQUIPEDIA_USER_AGENT with an identifying contact address before importing.");

  const manifest = JSON.parse(await readFile("data/liquipedia-seasons.json", "utf8")) as Manifest;
  const cacheDirectory = join("data", "liquipedia-cache");
  await mkdir(cacheDirectory, { recursive: true });
  for (const [index, season] of manifest.seasons.entries()) {
    const destination = join(cacheDirectory, season.slug + ".json");
    try { await access(destination); console.log("Cached: " + season.name); continue; } catch { /* cache miss */ }
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 2_100));
    const parameters = new URLSearchParams({ action: "query", format: "json", prop: "revisions", rvprop: "content|timestamp", rvslots: "main", redirects: "1", titles: season.page });
    const response = await fetch(endpoint + "?" + parameters, { headers: { "User-Agent": userAgent, "Accept-Encoding": "gzip" } });
    if (!response.ok) throw new Error("Liquipedia returned HTTP " + response.status + " for " + season.name);
    const page = await response.json();
    await writeFile(destination, JSON.stringify({ importedAt: new Date().toISOString(), sourceUrl: "https://liquipedia.net/rocketleague/" + season.page, season, page }, null, 2));
    console.log("Fetched: " + season.name);
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
