export type DraftRole = "STARTER" | "SUBSTITUTE" | "COACH";

export type DraftCard = {
  id: string;
  handle: string;
  team: string;
  season: string;
  seasonName: string;
  year: number;
  role: DraftRole;
  rating: number;
  region: string;
  /** Optional licensed/hosted portrait URL. Undefined cards render an initials avatar. */
  imageUrl?: string;
};

export type Season = {
  slug: string;
  name: string;
  year: number;
};

export type DraftTeam = {
  starters: DraftCard[];
  substitute?: DraftCard;
  coach?: DraftCard;
  organization?: DraftOrganization;
};

export type DraftOrganization = {
  id: string;
  name: string;
  bonus: number;
  color: string;
};

export type PlayoffStage = "Top 16" | "Top 8" | "Top 4" | "Final";

export type TournamentResult = {
  round: PlayoffStage;
  opponent: string;
  opponentPower: number;
  won: boolean;
  score: string;
};
