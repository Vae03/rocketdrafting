import { levelFromXp } from "@/lib/simulation";
import { maxOrgUses, type PlayerStats } from "@/lib/stats";

export type BadgeDef = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tiers: [number, number, number];
  value: (stats: PlayerStats, extra: { xp: number; shopOwned: number }) => number;
};

const TIER_NAMES = ["", "Bronze", "Silver", "Gold"] as const;

export const BADGES: BadgeDef[] = [
  { id: "champion", name: "Champion", description: "Win the Grand Final in Campaign mode", icon: "🏆", tiers: [1, 10, 50], value: (s) => s.campaignWins },
  { id: "playoff-grinder", name: "Playoff Grinder", description: "Complete Campaign playoff runs", icon: "📅", tiers: [5, 25, 100], value: (s) => s.campaignDrafts },
  { id: "win-streak", name: "On a Heater", description: "String together Campaign championships in a row", icon: "🔥", tiers: [2, 5, 10], value: (s) => s.campaignBestWinStreak },
  { id: "hardcore-hero", name: "Hardcore Hero", description: "Win a championship with ratings hidden (Hardcore mode)", icon: "🕶", tiers: [1, 5, 20], value: (s) => s.hardcoreWins },
  { id: "legends-league", name: "Legends League", description: "Complete drafts in the All-Seasons Legends pool", icon: "⭐", tiers: [1, 10, 50], value: (s) => s.legendsDrafts },
  { id: "flawless-draft", name: "Flawless Draft", description: "Win a championship without using a single reroll", icon: "💎", tiers: [1, 5, 20], value: (s) => s.noRerollChampionships },
  { id: "season-explorer", name: "Season Explorer", description: "Draft from distinct RLCS seasons", icon: "🗺", tiers: [3, 7, 13], value: (s) => s.seasonsDrafted.length },
  { id: "coach-collector", name: "Coach Collector", description: "Draft distinct coaches across all your rosters", icon: "📋", tiers: [5, 20, 50], value: (s) => s.coachesDrafted.length },
  { id: "org-loyalist", name: "Org Loyalist", description: "Sign the same organization repeatedly", icon: "🤝", tiers: [5, 15, 40], value: (s) => maxOrgUses(s) },
  { id: "underdog-hero", name: "Underdog Hero", description: "Win a match despite being the lower-rated team", icon: "🐺", tiers: [1, 10, 25], value: (s) => s.underdogWins },
  { id: "reroll-regular", name: "Reroll Regular", description: "Use a draft reroll", icon: "🎲", tiers: [5, 25, 100], value: (s) => s.rerollsUsed },
  { id: "power-player", name: "Power Player", description: "Reach a peak drafted Team Power", icon: "⚡", tiers: [90, 95, 98], value: (s) => s.peakPower },
  { id: "rlcs-historian", name: "RLCS Historian", description: "Win championships in distinct seasons", icon: "📚", tiers: [3, 6, 10], value: (s) => s.championshipSeasons.length },
  { id: "ranked-rookie", name: "Ranked Rookie", description: "Win Ranked 1v1 duels", icon: "⚔", tiers: [1, 10, 50], value: (s) => s.rankedWins },
  { id: "ranked-veteran", name: "Ranked Veteran", description: "Play Ranked 1v1 duels", icon: "🎖", tiers: [5, 25, 100], value: (s) => s.rankedWins + s.rankedLosses },
  { id: "ranked-win-streak", name: "Ladder Warlord", description: "String together Ranked wins in a row", icon: "🌪", tiers: [2, 5, 10], value: (s) => s.rankedBestWinStreak },
  { id: "ladder-climber", name: "Ladder Climber", description: "Reach Platinum, Diamond, then Champion MMR", icon: "📈", tiers: [660, 990, 1320], value: (s) => s.peakMmr },
  { id: "elite-status", name: "Elite Status", description: "Reach Grand Champion, then push toward Supersonic Legend", icon: "👑", tiers: [1590, 1700, 1800], value: (s) => s.peakMmr },
  { id: "sub-specialist", name: "Sub Specialist", description: "Draft an underrated substitute (below 70 rating)", icon: "🔄", tiers: [1, 10, 30], value: (s) => s.subPicksBelowSeventy },
  { id: "big-spender", name: "Big Spender", description: "Spend coins in the Shop", icon: "🛒", tiers: [50, 200, 500], value: (s) => s.coinsSpent },
  { id: "daily-grinder", name: "Daily Grinder", description: "Play on distinct days", icon: "📆", tiers: [3, 7, 30], value: (s) => s.daysPlayed.length },
  { id: "draft-marathon", name: "Draft Marathon", description: "Complete rosters across Freeplay, Ranked and Career combined", icon: "🏃", tiers: [10, 50, 200], value: (s) => s.campaignDrafts + s.rankedDrafts + s.careerDrafts },
  { id: "total-victories", name: "Total Victories", description: "Win matches across Freeplay, Ranked and Career combined", icon: "🥇", tiers: [5, 25, 100], value: (s) => s.campaignWins + s.rankedWins + s.careerWins },
  { id: "career-climber", name: "Career Climber", description: "Clear RLCS seasons in Career mode, from Season 1 toward the present", icon: "🪜", tiers: [3, 8, 14], value: (s) => s.careerHighestSeasonIndex },
  { id: "coin-collector", name: "Coin Collector", description: "Hold a peak coin balance", icon: "🪙", tiers: [100, 500, 1000], value: (s) => s.peakCoins },
  { id: "cosmetic-collector", name: "Cosmetic Collector", description: "Own Shop items", icon: "🎨", tiers: [10, 25, 40], value: (_s, extra) => extra.shopOwned },
  { id: "level-milestone", name: "Level Milestone", description: "Reach account levels", icon: "🆙", tiers: [5, 15, 30], value: (_s, extra) => levelFromXp(extra.xp).level },
  { id: "xp-grinder", name: "XP Grinder", description: "Earn total campaign XP", icon: "🧠", tiers: [2000, 10000, 50000], value: (_s, extra) => extra.xp },
  { id: "bracket-survivor", name: "Bracket Survivor", description: "Reach at least the Top 4 in Campaign", icon: "🛡", tiers: [1, 10, 40], value: (s) => s.top4Finishes },
  { id: "grand-finalist", name: "Grand Finalist", description: "Reach the Grand Final in Campaign", icon: "🎟", tiers: [1, 10, 40], value: (s) => s.finalsReached },
  { id: "century-club", name: "Century Club", description: "Combine wins and drafts across every mode", icon: "💯", tiers: [50, 200, 1000], value: (s) => s.campaignWins + s.rankedWins + s.careerWins + s.campaignDrafts + s.rankedDrafts + s.careerDrafts },

  // --- The following 20 are deliberately, extremely grindy long-term goals: weeks-to-months of
  // sustained play to gold, not something a single sitting reasonably completes. ---
  { id: "century-campaigner", name: "Century Campaigner", description: "Complete an enormous number of Campaign playoff runs", icon: "🏛", tiers: [200, 750, 2000], value: (s) => s.campaignDrafts },
  { id: "immortal-streak", name: "Immortal Streak", description: "String together an outrageous Campaign win streak", icon: "☄", tiers: [15, 30, 50], value: (s) => s.campaignBestWinStreak },
  { id: "serial-champion", name: "Serial Champion", description: "Win the Grand Final over and over", icon: "🏆", tiers: [100, 500, 2000], value: (s) => s.campaignWins },
  { id: "ranked-grandmaster", name: "Ranked Grandmaster", description: "Rack up Ranked 1v1 wins", icon: "⚔", tiers: [100, 500, 2000], value: (s) => s.rankedWins },
  { id: "marathon-ranked", name: "Marathon Ranked", description: "Play an enormous number of Ranked duels", icon: "🏃‍♂", tiers: [200, 750, 2500], value: (s) => s.rankedWins + s.rankedLosses },
  { id: "unbeatable-streak", name: "Unbeatable Streak", description: "String together an outrageous Ranked win streak", icon: "🌩", tiers: [15, 30, 50], value: (s) => s.rankedBestWinStreak },
  { id: "legend-of-the-ladder", name: "Legend of the Ladder", description: "Push your peak MMR to the very top of the ladder", icon: "🌌", tiers: [1750, 1790, 1800], value: (s) => s.peakMmr },
  { id: "perfectionist", name: "Perfectionist", description: "Win championships without ever using a reroll, again and again", icon: "💎", tiers: [20, 75, 250], value: (s) => s.noRerollChampionships },
  { id: "hardcore-legend", name: "Hardcore Legend", description: "Rack up Hardcore-mode championships", icon: "🕶", tiers: [20, 75, 250], value: (s) => s.hardcoreWins },
  { id: "underdog-saga", name: "Underdog Saga", description: "Win as the lower-rated team, over and over", icon: "🐺", tiers: [50, 200, 750], value: (s) => s.underdogWins },
  { id: "season-master", name: "Season Master", description: "Draft from every single RLCS season", icon: "🗺", tiers: [10, 13, 14], value: (s) => s.seasonsDrafted.length },
  { id: "coach-whisperer", name: "Coach Whisperer", description: "Draft an enormous roster of distinct coaches over time", icon: "📋", tiers: [75, 200, 500], value: (s) => s.coachesDrafted.length },
  { id: "loyal-to-a-fault", name: "Loyal to a Fault", description: "Sign the same organization an absurd number of times", icon: "🤝", tiers: [75, 200, 500], value: (s) => maxOrgUses(s) },
  { id: "reroll-addict", name: "Reroll Addict", description: "Burn through an enormous number of rerolls", icon: "🎲", tiers: [200, 750, 2500], value: (s) => s.rerollsUsed },
  { id: "big-baller", name: "Big Baller", description: "Spend an enormous amount of coins in the Shop", icon: "💸", tiers: [500, 2000, 6000], value: (s) => s.coinsSpent },
  { id: "vault-keeper", name: "Vault Keeper", description: "Hoard an enormous coin balance", icon: "🏦", tiers: [2000, 6000, 15000], value: (s) => s.peakCoins },
  { id: "everyday-grinder", name: "Everyday Grinder", description: "Play on an enormous number of distinct days", icon: "📅", tiers: [50, 150, 365], value: (s) => s.daysPlayed.length },
  { id: "bracket-legend", name: "Bracket Legend", description: "Reach the Top 4 over and over and over", icon: "🛡", tiers: [50, 200, 750], value: (s) => s.top4Finishes },
  { id: "finalist-forever", name: "Finalist Forever", description: "Reach the Grand Final an enormous number of times", icon: "🎟", tiers: [50, 200, 750], value: (s) => s.finalsReached },
  { id: "sub-connoisseur", name: "Sub Connoisseur", description: "Draft underrated substitutes, again and again and again", icon: "🔄", tiers: [50, 200, 750], value: (s) => s.subPicksBelowSeventy },
];

export type BadgeProgress = { def: BadgeDef; tier: number; value: number; nextThreshold: number | null; tierName: string };

export function computeBadgeProgress(stats: PlayerStats, extra: { xp: number; shopOwned: number }): BadgeProgress[] {
  return BADGES.map((def) => {
    const value = def.value(stats, extra);
    let tier = 0;
    for (let i = 0; i < def.tiers.length; i++) if (value >= def.tiers[i]) tier = i + 1;
    const nextThreshold = tier < 3 ? def.tiers[tier] : null;
    return { def, tier, value, nextThreshold, tierName: TIER_NAMES[tier] || "" };
  });
}
