import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Appelé par Vercel Cron (voir vercel.json) toutes les 5 minutes.
// Protégé par un secret partagé pour éviter les appels externes non autorisés.

async function publishToFacebook(pageId: string, accessToken: string, message: string) {
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageId}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, access_token: accessToken }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Erreur inconnue Facebook");
  return data;
}

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const now = new Date();

  const duePosts = await prisma.post.findMany({
    where: {
      status: "SCHEDULED",
      scheduledFor: { lte: now },
    },
    include: { socialAccount: true },
    take: 20, // évite de surcharger un run
  });

  const results = [];

  for (const post of duePosts) {
    try {
      if (post.socialAccount.platform === "FACEBOOK") {
        await publishToFacebook(
          post.socialAccount.platformAccountId,
          post.socialAccount.accessToken,
          post.content
        );
      }
      // TODO: brancher INSTAGRAM et TIKTOK ici plus tard

      await prisma.post.update({
        where: { id: post.id },
        data: { status: "PUBLISHED", publishedAt: new Date() },
      });
      results.push({ id: post.id, status: "ok" });
    } catch (err) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
        },
      });
      results.push({ id: post.id, status: "failed" });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
