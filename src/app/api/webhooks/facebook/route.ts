import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendMessengerDm } from "@/lib/messenger";

// ---------- Étape 1 : handshake de vérification (Meta appelle ceci une fois, en GET) ----------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Vérification échouée." }, { status: 403 });
}

// ---------- Étape 2 : réception des événements réels (nouveaux commentaires, etc.) ----------
export async function POST(req: Request) {
  const rawBody = await req.text();

  // Vérifie que l'appel vient bien de Meta (signature HMAC)
  const signature = req.headers.get("x-hub-signature-256");
  if (!isValidSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Signature invalide." }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field === "feed" && change.value?.item === "comment") {
        await handleNewComment(change.value);
      }
    }
  }

  // Toujours répondre 200 vite — Meta réessaie sinon et peut suspendre le webhook
  return NextResponse.json({ received: true });
}

function isValidSignature(rawBody: string, signature: string | null): boolean {
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", process.env.META_APP_SECRET!)
      .update(rawBody)
      .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

async function handleNewComment(value: {
  comment_id: string;
  from: { id: string; name?: string };
  message: string;
  post_id: string;
  page_id?: string;
}) {
  // Retrouve le compte social correspondant à la page qui a reçu le commentaire
  const socialAccount = await prisma.socialAccount.findFirst({
    where: { platformAccountId: extractPageId(value.post_id) },
    include: {
      commentDmRules: { where: { active: true } },
    },
  });

  if (!socialAccount) return; // page pas connectée à un compte PostPilot

  for (const rule of socialAccount.commentDmRules) {
    const matches =
      !rule.keyword ||
      value.message.toLowerCase().includes(rule.keyword.toLowerCase());

    if (!matches) continue;

    // Anti-doublon : une seule tentative par (règle, commentaire)
    const alreadyLogged = await prisma.commentDmLog.findUnique({
      where: { ruleId_commentId: { ruleId: rule.id, commentId: value.comment_id } },
    });
    if (alreadyLogged) continue;

    const personalizedMessage = rule.messageTemplate.replace(
      "{prenom}",
      value.from.name?.split(" ")[0] ?? ""
    );

    try {
      await sendMessengerDm({
        pageAccessToken: socialAccount.accessToken,
        recipientCommentId: value.comment_id, // Meta autorise le DM référencé par le comment_id (private reply)
        message: personalizedMessage,
      });

      await prisma.commentDmLog.create({
        data: {
          ruleId: rule.id,
          commentId: value.comment_id,
          commenterId: value.from.id,
          status: "SENT",
        },
      });
    } catch (err) {
      await prisma.commentDmLog.create({
        data: {
          ruleId: rule.id,
          commentId: value.comment_id,
          commenterId: value.from.id,
          status: "FAILED",
          errorMessage: err instanceof Error ? err.message : "Erreur inconnue",
        },
      });
    }
  }
}

// post_id Facebook a le format "PAGEID_POSTID"
function extractPageId(postId: string): string {
  return postId.split("_")[0];
}
