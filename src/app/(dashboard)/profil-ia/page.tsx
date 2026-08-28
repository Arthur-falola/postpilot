"use client";

import { useEffect, useState } from "react";

const TONES = [
  { value: "PRO", label: "Professionnel" },
  { value: "AMICAL", label: "Amical" },
  { value: "DIRECT", label: "Direct" },
  { value: "HUMORISTIQUE", label: "Humoristique" },
];

const LENGTHS = [
  { value: "COURT", label: "Court (1-2 phrases)" },
  { value: "MOYEN", label: "Moyen (un paragraphe)" },
  { value: "LONG", label: "Long (développé)" },
];

export default function ProfilIaPage() {
  const [businessContext, setBusinessContext] = useState("");
  const [tone, setTone] = useState("AMICAL");
  const [defaultLength, setDefaultLength] = useState("MOYEN");
  const [useEmojis, setUseEmojis] = useState(true);
  const [examples, setExamples] = useState<string[]>([""]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/ai-profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setBusinessContext(data.businessContext ?? "");
          setTone(data.tone ?? "AMICAL");
          setDefaultLength(data.defaultLength ?? "MOYEN");
          setUseEmojis(data.useEmojis ?? true);
          const ex = Array.isArray(data.sampleExamples) ? data.sampleExamples : [];
          setExamples(ex.length > 0 ? ex : [""]);
        }
        setLoading(false);
      });
  }, []);

  function updateExample(i: number, value: string) {
    setExamples((prev) => prev.map((e, idx) => (idx === i ? value : e)));
  }

  function addExample() {
    if (examples.length < 5) setExamples((prev) => [...prev, ""]);
  }

  function removeExample(i: number) {
    setExamples((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);

    const res = await fetch("/api/ai-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        businessContext,
        tone,
        defaultLength,
        useEmojis,
        sampleExamples: examples.filter((e) => e.trim().length > 0),
      }),
    });

    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return <div className="max-w-2xl mx-auto px-7 py-9 text-ink-soft text-sm">Chargement…</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-7 py-9">
      <div className="mb-7">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1">
          Intelligence artificielle
        </p>
        <h1 className="font-display text-[28px] font-semibold text-ink">
          Entraîne ton assistant IA
        </h1>
        <p className="text-ink-soft text-sm mt-1">
          Donne un peu de contexte pour que les posts générés te ressemblent vraiment.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-panel border border-line rounded-2xl p-6">
          <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wide">
            Décris ton activité en quelques phrases
          </label>
          <textarea
            required
            rows={3}
            value={businessContext}
            onChange={(e) => setBusinessContext(e.target.value)}
            placeholder="Ex : Je vends des vêtements pour enfants à Cotonou, livraison le jour même."
            className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white resize-none"
          />
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6 space-y-5">
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-2 uppercase tracking-wide">
              Ton
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((t) => (
                <button
                  type="button"
                  key={t.value}
                  onClick={() => setTone(t.value)}
                  className={`text-sm font-semibold rounded-lg py-2 px-3 border transition ${
                    tone === t.value
                      ? "bg-orange text-white border-orange"
                      : "bg-white text-ink border-line"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft mb-2 uppercase tracking-wide">
              Longueur par défaut
            </label>
            <div className="grid grid-cols-1 gap-2">
              {LENGTHS.map((l) => (
                <button
                  type="button"
                  key={l.value}
                  onClick={() => setDefaultLength(l.value)}
                  className={`text-sm font-semibold rounded-lg py-2 px-3 border text-left transition ${
                    defaultLength === l.value
                      ? "bg-mustard text-white border-mustard"
                      : "bg-white text-ink border-line"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-ink-soft uppercase tracking-wide">
              Utiliser des emojis
            </label>
            <button
              type="button"
              onClick={() => setUseEmojis((v) => !v)}
              className={`w-11 h-6 rounded-full relative transition ${
                useEmojis ? "bg-orange" : "bg-line"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                  useEmojis ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="bg-panel border border-line rounded-2xl p-6">
          <label className="block text-xs font-bold text-ink-soft mb-1 uppercase tracking-wide">
            Exemples de posts que tu aimes (optionnel)
          </label>
          <p className="text-xs text-ink-soft mb-3">
            Colle 2-3 anciens posts — l&apos;IA s&apos;en inspirera pour le style, sans les copier.
          </p>
          <div className="space-y-2.5">
            {examples.map((ex, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  rows={2}
                  value={ex}
                  onChange={(e) => updateExample(i, e.target.value)}
                  placeholder={`Exemple ${i + 1}…`}
                  className="flex-1 border border-line rounded-lg px-3 py-2 text-sm bg-white resize-none"
                />
                {examples.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExample(i)}
                    className="text-danger text-xs font-bold px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          {examples.length < 5 && (
            <button
              type="button"
              onClick={addExample}
              className="text-orange text-xs font-bold mt-3"
            >
              + Ajouter un exemple
            </button>
          )}
        </div>

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="bg-orange text-white font-bold text-sm rounded-xl px-6 py-3 shadow-[0_4px_12px_rgba(232,98,44,0.3)] hover:brightness-105 transition disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer le profil"}
          </button>
          {saved && <span className="text-mustard text-sm font-bold">✓ Profil mis à jour</span>}
        </div>
      </form>
    </div>
  );
}
