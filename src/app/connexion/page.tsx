"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ConnexionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email ou mot de passe incorrect.");
      return;
    }

    router.push(searchParams.get("callbackUrl") || "/calendrier");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="text-center mb-8">
        <div className="font-display text-2xl font-bold text-ink mb-1">
          Post<span className="text-orange">Marché</span>
        </div>
        <p className="text-ink-soft text-sm">Connecte-toi à ton espace</p>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-7">
        <button
          onClick={() => signIn("google", { callbackUrl: "/calendrier" })}
          className="w-full flex items-center justify-center gap-2.5 border border-line bg-white rounded-xl py-2.5 text-sm font-bold text-ink mb-5 hover:bg-orange-soft/40 transition"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.61z"/>
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 009 18z"/>
            <path fill="#FBBC05" d="M3.96 10.7A5.4 5.4 0 013.68 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 000 9c0 1.45.35 2.83.96 4.03l3-2.33z"/>
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 00.96 4.97l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
          </svg>
          Continuer avec Google
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="h-px bg-line flex-1" />
          <span className="text-[11px] text-ink-soft font-semibold uppercase">ou</span>
          <div className="h-px bg-line flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
              placeholder="toi@exemple.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wide">
              Mot de passe
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-danger text-xs font-semibold">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange text-white font-bold text-sm rounded-xl py-3 shadow-[0_4px_12px_rgba(232,98,44,0.3)] hover:brightness-105 transition disabled:opacity-50"
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-ink-soft mt-5">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="text-orange font-bold">
          Créer un compte
        </Link>
      </p>
    </div>
  );
}

export default function ConnexionPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Suspense fallback={null}>
        <ConnexionForm />
      </Suspense>
    </div>
  );
}