import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json({ results: [] });

  const matches = await prisma.user.findMany({
    where: { displayName: { contains: q }, id: { not: me.id } },
    take: 10,
    select: { id: true, displayName: true, avatarEmoji: true, avatarColor: true },
  });

  return NextResponse.json({ results: matches });
}
