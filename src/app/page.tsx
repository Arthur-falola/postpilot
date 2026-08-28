import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-3xl font-bold text-ink mb-3">
        Post<span className="text-orange">Marché</span>
      </div>
      <p className="text-ink-soft text-base max-w-md mb-8">
        Programme, automatise et génère tes publications Facebook et Instagram — sans y penser.
      </p>
      <div className="flex gap-3">
        <Link
          href="/inscription"
          className="bg-orange text-white font-bold text-sm rounded-xl px-6 py-3 shadow-[0_4px_12px_rgba(232,98,44,0.3)]"
        >
          Commencer gratuitement
        </Link>
        <Link
          href="/connexion"
          className="border border-line bg-panel text-ink font-bold text-sm rounded-xl px-6 py-3"
        >
          Se connecter
        </Link>
      </div>
    </div>
  );
}
