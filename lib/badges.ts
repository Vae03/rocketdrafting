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
  { id: "draft-marathon", name: "Draft Marathon", description: "Complete rosters across Campaign and Ranked combined", icon: "🏃", tiers: [10, 50, 200], value: (s) => s.campaignDrafts + s.rankedDrafts },
  { id: "total-victories", name: "Total Victories", description: "Win matches across Campaign and Ranked combined", icon: "🥇", tiers: [5, 25, 100], value: (s) => s.campaignWins + s.rankedWins },
  { id: "coin-collector", name: "Coin Collector", description: "Hold a peak coin balance", icon: "🪙", tiers: [100, 500, 1000], value: (s) => s.peakCoins },
  { id: "cosmetic-collector", name: "Cosmetic Collector", description: "Own Shop items", icon: "🎨", tiers: [5, 12, 23], value: (_s, extra) => extra.shopOwned },
  { id: "level-milestone", name: "Level Milestone", description: "Reach account levels", icon: "🆙", tiers: [5, 15, 30], value: (_s, extra) => levelFromXp(extra.xp).level },
  { id: "xp-grinder", name: "XP Grinder", description: "Earn total campaign XP", icon: "🧠", tiers: [2000, 10000, 50000], value: (_s, extra) => extra.xp },
  { id: "bracket-survivor", name: "Bracket Survivor", description: "Reach at least the Top 4 in Campaign", icon: "🛡", tiers: [1, 10, 40], value: (s) => s.top4Finishes },
  { id: "grand-finalist", name: "Grand Finalist", description: "Reach the Grand Final in Campaign", icon: "🎟", tiers: [1, 10, 40], value: (s) => s.finalsReached },
  { id: "century-club", name: "Century Club", description: "Combine wins and drafts across every mode", icon: "💯", tiers: [50, 200, 1000], value: (s) => s.campaignWins + s.rankedWins + s.campaignDrafts + s.rankedDrafts },
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
