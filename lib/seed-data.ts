import type { DraftCard } from "@/lib/types";

// Sample 2024 data. Add seasons by appending roster members here or importing them
// through Prisma. Ratings are editorial game ratings, not official Psyonix statistics.
const members: Array<[string, string, string, "STARTER" | "SUBSTITUTE" | "COACH", number, string]> = [
  ["zen", "Team Vitality", "2024", "STARTER", 99, "EU"], ["Radosin", "Team Vitality", "2024", "STARTER", 91, "EU"], ["Alpha54", "Team Vitality", "2024", "STARTER", 93, "EU"], ["Saizen", "Team Vitality", "2024", "SUBSTITUTE", 85, "EU"], ["Ferra", "Team Vitality", "2024", "COACH", 95, "EU"],
  ["BeastMode", "G2 Stride", "2024", "STARTER", 98, "NA"], ["Daniel", "G2 Stride", "2024", "STARTER", 97, "NA"], ["Atomic", "G2 Stride", "2024", "STARTER", 94, "NA"], ["Hockser", "G2 Stride", "2024", "SUBSTITUTE", 87, "NA"], ["Satthew", "G2 Stride", "2024", "COACH", 91, "NA"],
  ["Vatira", "Karmine Corp", "2024", "STARTER", 97, "EU"], ["Atow", "Karmine Corp", "2024", "STARTER", 96, "EU"], ["Rise", "Karmine Corp", "2024", "STARTER", 94, "EU"], ["Itachi", "Karmine Corp", "2024", "SUBSTITUTE", 88, "EU"], ["Eversax", "Karmine Corp", "2024", "COACH", 93, "EU"],
  ["Monkey Moon", "Team BDS", "2024", "STARTER", 95, "EU"], ["ExoTiiK", "Team BDS", "2024", "STARTER", 95, "EU"], ["dralii", "Team BDS", "2024", "STARTER", 96, "EU"], ["M0nkey M00n", "Team BDS", "2024", "SUBSTITUTE", 84, "EU"], ["Mew", "Team BDS", "2024", "COACH", 92, "EU"],
  ["LJ", "Spacestation Gaming", "2024", "STARTER", 94, "NA"], ["Chicago", "Spacestation Gaming", "2024", "STARTER", 90, "NA"], ["hockser", "Spacestation Gaming", "2024", "STARTER", 91, "NA"], ["Arsenal", "Spacestation Gaming", "2024", "SUBSTITUTE", 86, "NA"], ["Chrome", "Spacestation Gaming", "2024", "COACH", 94, "NA"],
  ["Firstkiller", "Gen.G Mobil1 Racing", "2024", "STARTER", 96, "NA"], ["AppJack", "Gen.G Mobil1 Racing", "2024", "STARTER", 92, "EU"], ["Jack", "Gen.G Mobil1 Racing", "2024", "STARTER", 90, "EU"], ["Noly", "Gen.G Mobil1 Racing", "2024", "SUBSTITUTE", 88, "EU"], ["Allushin", "Gen.G Mobil1 Racing", "2024", "COACH", 89, "NA"],
  ["Lostt", "FURIA", "2024", "STARTER", 93, "SAM"], ["yanxnz", "FURIA", "2024", "STARTER", 95, "SAM"], ["drufinho", "FURIA", "2024", "STARTER", 91, "SAM"], ["caard", "FURIA", "2024", "SUBSTITUTE", 84, "SAM"], ["kaue", "FURIA", "2024", "COACH", 87, "SAM"],
  ["Trk511", "Team Falcons", "2024", "STARTER", 94, "MENA"], ["Rw9", "Team Falcons", "2024", "STARTER", 92, "MENA"], ["Kiileerrz", "Team Falcons", "2024", "STARTER", 94, "MENA"], ["Nwpo", "Team Falcons", "2024", "SUBSTITUTE", 90, "MENA"], ["oKhaliD", "Team Falcons", "2024", "COACH", 88, "MENA"]
];

export const seedCards: DraftCard[] = members.map(([handle, team, season, role, rating, region], index) => ({ id: `${season}-${handle}-${index}`, handle, team, season, role, rating, region }));

export const seasons = ["2024"];
