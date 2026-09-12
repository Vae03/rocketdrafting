import type { DraftOrganization } from "@/lib/types";

// Kept in a plain (non-"use client") module so server-only code (the ranked-mode API routes) can
// import it directly -- importing a value from a "use client" file into server code silently
// resolves to an empty client-reference stub instead of the real array/object.
export const organizationPool: DraftOrganization[] = [
  { id: "free-agent", name: "Free Agent", bonus: 0, color: "#687083" },
  { id: "nrg", name: "NRG", bonus: 1, color: "#f25555" },
  { id: "spacestation", name: "Spacestation Gaming", bonus: 1, color: "#3ec9e0" },
  { id: "gen-g", name: "Gen.G", bonus: 1, color: "#aa8fff" },
  { id: "furia", name: "FURIA", bonus: 1, color: "#3a3a44" },
  { id: "falcons", name: "Team Falcons", bonus: 2, color: "#8fd13f" },
  { id: "g2", name: "G2 Esports", bonus: 2, color: "#e5e5e5" },
  { id: "bds", name: "Team BDS", bonus: 2, color: "#5fb4ff" },
  { id: "vitality", name: "Team Vitality", bonus: 2, color: "#ffd146" },
  { id: "karmine", name: "Karmine Corp", bonus: 3, color: "#4f79ff" },
  { id: "moist", name: "Moist Esports", bonus: 3, color: "#7ee0ff" },
  { id: "gentle-mates", name: "Gentle Mates", bonus: 3, color: "#ff8fd6" },
] as const;
