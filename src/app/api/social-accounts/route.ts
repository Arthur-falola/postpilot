import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const accounts = await prisma.socialAccount.findMany({
    where: { userId: session.user.id },
    select: { id: true, displayName: true, platform: true },
    orderBy: { connectedAt: "desc" },
  });

  return NextResponse.json(accounts);
}
