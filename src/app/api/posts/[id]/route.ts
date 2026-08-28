import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();

  const post = await prisma.post.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!post) {
    return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  }
  if (post.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Impossible de modifier une publication déjà publiée." },
      { status: 400 }
    );
  }

  const updated = await prisma.post.update({
    where: { id },
    data: {
      content: body.content ?? undefined,
      scheduledFor: body.scheduledFor ? new Date(body.scheduledFor) : undefined,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }
  const { id } = await params;

  const post = await prisma.post.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!post) {
    return NextResponse.json({ error: "Publication introuvable." }, { status: 404 });
  }

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
