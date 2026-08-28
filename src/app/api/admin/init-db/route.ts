import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Route à usage unique : crée toutes les tables directement en SQL,
// pour les cas où `prisma db push` ne peut pas être lancé depuis l'environnement de dev (ex: Termux sans Ubuntu).
// Protégée par CRON_SECRET (déjà présent dans tes variables d'environnement Vercel).
// ⚠️ Supprime ce fichier une fois la base initialisée.

const SQL_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT PRIMARY KEY,
    "name" TEXT,
    "email" TEXT UNIQUE NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "password" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "accounts" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    UNIQUE ("provider", "providerAccountId")
  )`,
  `CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT PRIMARY KEY,
    "sessionToken" TEXT UNIQUE NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT UNIQUE NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    UNIQUE ("identifier", "token")
  )`,
  `DO $$ BEGIN
    CREATE TYPE "Platform" AS ENUM ('FACEBOOK', 'INSTAGRAM', 'TIKTOK');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "social_accounts" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "platform" "Platform" NOT NULL,
    "platformAccountId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "tokenExpiresAt" TIMESTAMP(3),
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("userId", "platform", "platformAccountId")
  )`,
  `DO $$ BEGIN
    CREATE TYPE "PostStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN
    CREATE TYPE "PostSource" AS ENUM ('MANUAL', 'AI_GENERATED');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "posts" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "socialAccountId" TEXT NOT NULL REFERENCES "social_accounts"("id") ON DELETE CASCADE,
    "content" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "status" "PostStatus" NOT NULL DEFAULT 'DRAFT',
    "source" "PostSource" NOT NULL DEFAULT 'MANUAL',
    "scheduledFor" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "posts_status_scheduledFor_idx" ON "posts"("status", "scheduledFor")`,
  `DO $$ BEGIN
    CREATE TYPE "PostTone" AS ENUM ('PRO', 'AMICAL', 'DIRECT', 'HUMORISTIQUE');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN
    CREATE TYPE "PostLength" AS ENUM ('COURT', 'MOYEN', 'LONG');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "ai_profiles" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "businessContext" TEXT NOT NULL,
    "tone" "PostTone" NOT NULL DEFAULT 'AMICAL',
    "defaultLength" "PostLength" NOT NULL DEFAULT 'MOYEN',
    "useEmojis" BOOLEAN NOT NULL DEFAULT true,
    "sampleExamples" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "comment_dm_rules" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL REFERENCES "social_accounts"("id") ON DELETE CASCADE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "keyword" TEXT,
    "messageTemplate" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL
  )`,
  `DO $$ BEGIN
    CREATE TYPE "DmSendStatus" AS ENUM ('SENT', 'SKIPPED', 'FAILED');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "comment_dm_logs" (
    "id" TEXT PRIMARY KEY,
    "ruleId" TEXT NOT NULL REFERENCES "comment_dm_rules"("id") ON DELETE CASCADE,
    "commentId" TEXT NOT NULL,
    "commenterId" TEXT NOT NULL,
    "status" "DmSendStatus" NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("ruleId", "commentId")
  )`,
  `DO $$ BEGIN
    CREATE TYPE "PlanTier" AS ENUM ('FREE_TRIAL', 'MENSUEL');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED');
  EXCEPTION WHEN duplicate_object THEN null; END $$`,
  `CREATE TABLE IF NOT EXISTS "subscriptions" (
    "id" TEXT PRIMARY KEY,
    "userId" TEXT UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "plan" "PlanTier" NOT NULL DEFAULT 'FREE_TRIAL',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "trialEndsAt" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const results: { statement: number; ok: boolean; error?: string }[] = [];

  for (let i = 0; i < SQL_STATEMENTS.length; i++) {
    try {
      await prisma.$executeRawUnsafe(SQL_STATEMENTS[i]);
      results.push({ statement: i, ok: true });
    } catch (err) {
      results.push({
        statement: i,
        ok: false,
        error: err instanceof Error ? err.message : "Erreur inconnue",
      });
    }
  }

  return NextResponse.json({ done: true, results });
}
