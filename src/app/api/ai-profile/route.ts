import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const profile = await prisma.aiProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json(profile);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { businessContext, tone, defaultLength, useEmojis, sampleExamples } =
    await req.json();

  if (!businessContext) {
    return NextResponse.json(
      { error: "Décris ton activité pour continuer." },
      { status: 400 }
    );
  }

  const profile = await prisma.aiProfile.upsert({
    where: { userId: session.user.id },
    update: {
      businessContext,
      tone,
      defaultLength,
      useEmojis,
      sampleExamples: sampleExamples ?? [],
    },
    create: {
      userId: session.user.id,
      businessContext,
      tone: tone ?? "AMICAL",
      defaultLength: defaultLength ?? "MOYEN",
      useEmojis: useEmojis ?? true,
      sampleExamples: sampleExamples ?? [],
    },
  });

  return NextResponse.json(profile);
}
