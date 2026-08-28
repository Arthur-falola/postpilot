import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const rules = await prisma.commentDmRule.findMany({
    where: { socialAccount: { userId: session.user.id } },
    include: {
      socialAccount: { select: { displayName: true, platform: true } },
      _count: { select: { logs: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(rules);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { socialAccountId, name, keyword, messageTemplate } = await req.json();

  if (!socialAccountId || !name || !messageTemplate) {
    return NextResponse.json(
      { error: "Compte, nom et message sont requis." },
      { status: 400 }
    );
  }

  // Vérifie que le compte social appartient bien à l'utilisateur connecté
  const account = await prisma.socialAccount.findFirst({
    where: { id: socialAccountId, userId: session.user.id },
  });
  if (!account) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const rule = await prisma.commentDmRule.create({
    data: {
      socialAccountId,
      userId: session.user.id,
      name,
      keyword: keyword || null,
      messageTemplate,
    },
  });

  return NextResponse.json(rule, { status: 201 });
}
