import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

const SCOPES = [
  "pages_show_list",
  "pages_manage_posts",
  "pages_read_engagement",
  "pages_messaging",
].join(",");

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/connexion", process.env.NEXTAUTH_URL));
  }

  // "state" protège contre le CSRF et nous permet de retrouver l'utilisateur au retour
  const state = crypto.randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: true,
    maxAge: 600, // 10 minutes, le temps du flux
    sameSite: "lax",
  });

  const redirectUri = `${process.env.NEXTAUTH_URL}/api/facebook/callback`;

  const authUrl = new URL("https://www.facebook.com/v19.0/dialog/oauth");
  authUrl.searchParams.set("client_id", process.env.META_APP_ID!);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("response_type", "code");

  return NextResponse.redirect(authUrl.toString());
}
