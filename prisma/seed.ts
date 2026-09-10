import { PrismaClient, Role } from "@prisma/client";
import { seedCards } from "../lib/seed-data";

const prisma = new PrismaClient();

async function main() {
  for (const card of seedCards) {
    const season = await prisma.season.upsert({ where: { slug: card.season }, update: {}, create: { slug: card.season, name: `RLCS ${card.season}`, year: Number(card.season) } });
    const organization = await prisma.organization.upsert({ where: { name: card.team }, update: {}, create: { name: card.team, region: card.region } });
    const person = await prisma.person.upsert({ where: { handle: card.handle }, update: {}, create: { handle: card.handle } });
    const roster = await prisma.roster.upsert({ where: { seasonId_organizationId: { seasonId: season.id, organizationId: organization.id } }, update: {}, create: { seasonId: season.id, organizationId: organization.id, placement: 1 } });
    await prisma.rosterMember.upsert({ where: { rosterId_personId_role: { rosterId: roster.id, personId: person.id, role: card.role as Role } }, update: { rating: card.rating }, create: { rosterId: roster.id, personId: person.id, role: card.role as Role, rating: card.rating } });
  }
}
main().finally(() => prisma.$disconnect());
