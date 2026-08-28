import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const TONE_LABELS: Record<string, string> = {
  PRO: "professionnel et sérieux",
  AMICAL: "amical et chaleureux",
  DIRECT: "direct et sans détour",
  HUMORISTIQUE: "léger et humoristique",
};

const LENGTH_GUIDE: Record<string, string> = {
  COURT: "1 à 2 phrases maximum",
  MOYEN: "un court paragraphe de 3 à 4 phrases",
  LONG: "un paragraphe complet et développé",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const { topic, length } = await req.json();

  const aiProfile = await prisma.aiProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!aiProfile) {
    return NextResponse.json(
      { error: "Configure d'abord ton profil IA (ton, contexte business)." },
      { status: 400 }
    );
  }

  const requestedLength = length ?? aiProfile.defaultLength;
  const examples = Array.isArray(aiProfile.sampleExamples)
    ? (aiProfile.sampleExamples as string[]).slice(0, 5)
    : [];

  const systemPrompt = `Tu écris des publications pour les réseaux sociaux d'une entreprise.
Contexte de l'entreprise : ${aiProfile.businessContext}
Ton à adopter : ${TONE_LABELS[aiProfile.tone]}
Longueur attendue : ${LENGTH_GUIDE[requestedLength]}
Emojis : ${aiProfile.useEmojis ? "oui, avec modération" : "non, aucun emoji"}
${examples.length > 0 ? `Exemples de style à imiter (ne pas copier, s'en inspirer) :\n${examples.map((e, i) => `${i + 1}. ${e}`).join("\n")}` : ""}

Réponds uniquement avec le texte du post, sans guillemets ni préambule. Propose 3 variantes séparées par "---".`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: topic
            ? `Sujet du post : ${topic}`
            : "Propose un post pertinent pour cette entreprise aujourd'hui.",
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    return NextResponse.json(
      { error: "Échec de la génération IA.", details: errText },
      { status: 502 }
    );
  }

  const data = await response.json();
  const rawText: string = data.choices?.[0]?.message?.content ?? "";

  const variants = rawText
    .split("---")
    .map((v: string) => v.trim())
    .filter(Boolean);

  return NextResponse.json({ variants });
}