import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const posts = await prisma.post.findMany({
    where: {
      userId: session.user.id,
      ...(from && to
        ? { scheduledFor: { gte: new Date(from), lte: new Date(to) } }
        : {}),
    },
    include: {
      socialAccount: { select: { displayName: true, platform: true } },
    },
    orderBy: { scheduledFor: "asc" },
  });

  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { socialAccountId, content, scheduledFor, source } = await req.json();

  if (!socialAccountId || !content || !scheduledFor) {
    return NextResponse.json(
      { error: "Compte, contenu et date sont requis." },
      { status: 400 }
    );
  }

  const account = await prisma.socialAccount.findFirst({
    where: { id: socialAccountId, userId: session.user.id },
  });
  if (!account) {
    return NextResponse.json({ error: "Compte introuvable." }, { status: 404 });
  }

  const post = await prisma.post.create({
    data: {
      userId: session.user.id,
      socialAccountId,
      content,
      scheduledFor: new Date(scheduledFor),
      status: "SCHEDULED",
      source: source === "AI_GENERATED" ? "AI_GENERATED" : "MANUAL",
    },
  });

  return NextResponse.json(post, { status: 201 });
}
