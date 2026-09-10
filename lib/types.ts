export type DraftRole = "STARTER" | "SUBSTITUTE" | "COACH";

export type DraftCard = {
  id: string;
  handle: string;
  team: string;
  season: string;
  role: DraftRole;
  rating: number;
  region: string;
  /** Optional licensed/hosted portrait URL. Undefined cards render an initials avatar. */
  imageUrl?: string;
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

export type TournamentResult = {
  round: "Round of 16" | "Quarterfinal" | "Semifinal" | "Grand Final";
  opponent: string;
  opponentPower: number;
  won: boolean;
  score: string;
};
