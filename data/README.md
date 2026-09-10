# Historical RLCS catalog workflow

liquipedia-seasons.json is the audit list for all RLCS seasons. Run npm run catalog:fetch only after setting an identifying LIQUIPEDIA_USER_AGENT in .env. The downloader caches every season's MediaWiki API response and limits requests to one every 2.1 seconds.

To publish a season, a curator must review the cached standings and enter the top 30 teams across that season's regions. Record each person in the exact historical role held on that roster: STARTER, SUBSTITUTE, or COACH. A card must never be marked SUBSTITUTE merely because the player could have filled in. Add photoUrl only after verifying the image license or permission; otherwise the UI intentionally shows initials.

The source is Liquipedia under CC-BY-SA 3.0. Preserve the source URL, import date, and in-app attribution when publishing the catalog.
