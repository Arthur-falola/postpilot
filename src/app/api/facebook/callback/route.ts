import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/connexion", process.env.NEXTAUTH_URL));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const dashboardUrl = new URL("/comptes", process.env.NEXTAUTH_URL);

  if (errorParam) {
    dashboardUrl.searchParams.set("erreur", "annule");
    return NextResponse.redirect(dashboardUrl);
  }

  // Vérifie le "state" pour se protéger du CSRF
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("fb_oauth_state")?.value;
  if (!code || !state || state !== expectedState) {
    dashboardUrl.searchParams.set("erreur", "etat_invalide");
    return NextResponse.redirect(dashboardUrl);
  }
  cookieStore.delete("fb_oauth_state");

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/facebook/callback`;

  try {
    // Étape 1 : échange du code contre un token utilisateur courte durée
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          redirect_uri: redirectUri,
          code,
        })
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(tokenData.error?.message ?? "Échange du code échoué.");

    // Étape 2 : conversion en token longue durée (~60 jours)
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: process.env.META_APP_ID!,
          client_secret: process.env.META_APP_SECRET!,
          fb_exchange_token: tokenData.access_token,
        })
    );
    const longLivedData = await longLivedRes.json();
    if (!longLivedRes.ok)
      throw new Error(longLivedData.error?.message ?? "Conversion du token échouée.");

    const userLongLivedToken = longLivedData.access_token;
    const expiresInSeconds: number = longLivedData.expires_in ?? 60 * 24 * 60 * 60;

    // Étape 3 : récupère les pages gérées par l'utilisateur (chaque page a son propre token, non expirant tant que le token user est valide)
    const pagesRes = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userLongLivedToken}`
    );
    const pagesData = await pagesRes.json();
    if (!pagesRes.ok) throw new Error(pagesData.error?.message ?? "Récupération des pages échouée.");

    const tokenExpiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    // Étape 4 : sauvegarde chaque page comme SocialAccount (upsert pour éviter les doublons si reconnexion)
    for (const page of pagesData.data ?? []) {
      await prisma.socialAccount.upsert({
        where: {
          userId_platform_platformAccountId: {
            userId: session.user.id,
            platform: "FACEBOOK",
            platformAccountId: page.id,
          },
        },
        update: {
          displayName: page.name,
          accessToken: page.access_token,
          tokenExpiresAt,
        },
        create: {
          userId: session.user.id,
          platform: "FACEBOOK",
          platformAccountId: page.id,
          displayName: page.name,
          accessToken: page.access_token,
          tokenExpiresAt,
        },
      });
    }

    dashboardUrl.searchParams.set("connecte", String((pagesData.data ?? []).length));
    return NextResponse.redirect(dashboardUrl);
  } catch (err) {
    dashboardUrl.searchParams.set(
      "erreur",
      err instanceof Error ? err.message : "inconnue"
    );
    return NextResponse.redirect(dashboardUrl);
  }
}
