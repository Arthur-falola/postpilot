import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import type { SocialAccount } from "@prisma/client";

const PLATFORM_LABEL: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

export default async function ComptesPage({
  searchParams,
}: {
  searchParams: Promise<{ connecte?: string; erreur?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const { connecte, erreur } = await searchParams;

  const accounts = await prisma.socialAccount.findMany({
    where: { userId: session.user.id },
    orderBy: { connectedAt: "desc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-7 py-9">
      <div className="mb-7">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1">
          Paramètres
        </p>
        <h1 className="font-display text-[28px] font-semibold text-ink">
          Comptes connectés
        </h1>
        <p className="text-ink-soft text-sm mt-1">
          Connecte tes pages Facebook pour programmer et automatiser tes publications.
        </p>
      </div>

      {connecte && (
        <div className="bg-mustard-soft border border-mustard text-ink text-sm rounded-xl px-4 py-3 mb-6">
          {connecte === "0"
            ? "Connexion réussie, mais aucune page trouvée sur ce compte Facebook."
            : `${connecte} page${Number(connecte) > 1 ? "s" : ""} connectée${Number(connecte) > 1 ? "s" : ""} avec succès.`}
        </div>
      )}
      {erreur && (
        <div className="bg-red-50 border border-danger text-danger text-sm rounded-xl px-4 py-3 mb-6">
          {erreur === "annule"
            ? "Connexion annulée."
            : `Erreur lors de la connexion : ${erreur}`}
        </div>
      )}

      <a
        href="/api/facebook/connect"
        className="inline-flex items-center gap-2.5 bg-orange text-white font-bold text-sm rounded-xl px-5 py-3 shadow-[0_4px_12px_rgba(232,98,44,0.3)] hover:brightness-105 transition mb-8"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
        Connecter une page Facebook
      </a>

      {accounts.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-2xl py-14 text-center">
          <p className="text-ink-soft text-sm italic">
            Aucun compte connecté pour l&apos;instant.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((account: SocialAccount) => {
            const daysLeft = account.tokenExpiresAt
              ? Math.max(
                  0,
                  Math.ceil(
                    (account.tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  )
                )
              : null;
            return (
              <div
                key={account.id}
                className="bg-panel border border-line rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-full shrink-0 bg-[repeating-linear-gradient(45deg,#E8622C,#E8622C_3px,#D4A017_3px,#D4A017_6px)]" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-ink truncate">{account.displayName}</p>
                    <p className="text-xs text-ink-soft">
                      {PLATFORM_LABEL[account.platform] ?? account.platform}
                      {daysLeft !== null && (
                        <span className={daysLeft < 7 ? "text-danger font-semibold" : ""}>
                          {" · "}
                          {daysLeft < 7
                            ? `expire dans ${daysLeft} j — reconnecte bientôt`
                            : `expire dans ${daysLeft} j`}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wide bg-mustard-soft text-mustard px-2.5 py-1 rounded-full shrink-0">
                  Actif
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
