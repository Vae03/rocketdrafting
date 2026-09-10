import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rankForMmr } from "@/lib/ranks";

export async function GET() {
  const top = await prisma.playerIdentity.findMany({
    orderBy: { mmr: "desc" },
    take: 100,
    select: { displayName: true, mmr: true, wins: true, losses: true, isBot: true },
  });
  return NextResponse.json(
    top.map((p, index) => ({ position: index + 1, ...p, rank: rankForMmr(p.mmr) })),
  );
}
