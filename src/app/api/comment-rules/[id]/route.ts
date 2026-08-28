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

  const rule = await prisma.commentDmRule.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!rule) {
    return NextResponse.json({ error: "Règle introuvable." }, { status: 404 });
  }

  const updated = await prisma.commentDmRule.update({
    where: { id },
    data: {
      active: typeof body.active === "boolean" ? body.active : undefined,
      name: body.name ?? undefined,
      keyword: body.keyword !== undefined ? body.keyword || null : undefined,
      messageTemplate: body.messageTemplate ?? undefined,
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

  const rule = await prisma.commentDmRule.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!rule) {
    return NextResponse.json({ error: "Règle introuvable." }, { status: 404 });
  }

  await prisma.commentDmRule.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
