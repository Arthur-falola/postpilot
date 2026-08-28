"use client";

import { useEffect, useMemo, useState } from "react";

type SocialAccountLite = { id: string; displayName: string; platform: string };
type Post = {
  id: string;
  content: string;
  scheduledFor: string;
  status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "FAILED";
  source: "MANUAL" | "AI_GENERATED";
  socialAccount: { displayName: string; platform: string };
};

const JOURS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // semaine commence lundi
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatDayMonth(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export default function CalendrierPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<SocialAccountLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState<{ date: Date } | null>(null);
  const [form, setForm] = useState({ socialAccountId: "", content: "", time: "09:00" });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiVariants, setAiVariants] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);

  async function loadPosts() {
    setLoading(true);
    const from = weekStart.toISOString();
    const to = new Date(weekEnd.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString();
    const res = await fetch(`/api/posts?from=${from}&to=${to}`);
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
    fetch("/api/social-accounts").then((r) => r.ok && r.json()).then((data) => data && setAccounts(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart]);

  function postsForDay(day: Date) {
    return posts.filter((p) => {
      const d = new Date(p.scheduledFor);
      return (
        d.getFullYear() === day.getFullYear() &&
        d.getMonth() === day.getMonth() &&
        d.getDate() === day.getDate()
      );
    });
  }

  function openForm(date: Date) {
    setForm({ socialAccountId: accounts[0]?.id ?? "", content: "", time: "09:00" });
    setAiVariants([]);
    setShowForm({ date });
  }

  async function handleGenerateAi() {
    setAiLoading(true);
    setAiVariants([]);
    const res = await fetch("/api/posts/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setAiLoading(false);
    if (res.ok) {
      const data = await res.json();
      setAiVariants(data.variants ?? []);
    } else {
      const data = await res.json();
      alert(data.error ?? "Échec de la génération. Configure d'abord ton profil IA.");
    }
  }

  async function handleSubmit(e: React.FormEvent, source: "MANUAL" | "AI_GENERATED" = "MANUAL") {
    e.preventDefault();
    if (!showForm) return;
    setSaving(true);

    const [hours, minutes] = form.time.split(":").map(Number);
    const scheduledFor = new Date(showForm.date);
    scheduledFor.setHours(hours, minutes, 0, 0);

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        socialAccountId: form.socialAccountId,
        content: form.content,
        scheduledFor: scheduledFor.toISOString(),
        source,
      }),
    });

    setSaving(false);
    if (res.ok) {
      setShowForm(null);
      loadPosts();
    } else {
      const data = await res.json();
      alert(data.error ?? "Erreur lors de la création.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette publication ?")) return;
    setPosts((prev) => prev.filter((p) => p.id !== id));
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
  }

  const today = new Date();
  const isToday = (d: Date) =>
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();

  return (
    <div className="max-w-6xl mx-auto px-7 py-9">
      <div className="flex justify-between items-end mb-6">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1">
            Calendrier
          </p>
          <h1 className="font-display text-[28px] font-semibold text-ink">
            {formatDayMonth(weekStart)} → {formatDayMonth(weekEnd)}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekStart(addDays(weekStart, -7))}
            className="border border-line bg-panel text-ink text-sm font-bold rounded-lg px-3.5 py-2"
          >
            ← Semaine préc.
          </button>
          <button
            onClick={() => setWeekStart(startOfWeek(new Date()))}
            className="border border-line bg-panel text-ink text-sm font-bold rounded-lg px-3.5 py-2"
          >
            Aujourd&apos;hui
          </button>
          <button
            onClick={() => setWeekStart(addDays(weekStart, 7))}
            className="border border-line bg-panel text-ink text-sm font-bold rounded-lg px-3.5 py-2"
          >
            Semaine suiv. →
          </button>
        </div>
      </div>

      {accounts.length === 0 && !loading && (
        <div className="bg-mustard-soft border border-mustard text-ink text-sm rounded-xl px-4 py-3 mb-6">
          Connecte d&apos;abord une page Facebook dans{" "}
          <a href="/comptes" className="font-bold underline">
            Comptes
          </a>{" "}
          pour pouvoir programmer des publications.
        </div>
      )}

      <div className="grid grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayPosts = postsForDay(day);
          return (
            <div
              key={day.toISOString()}
              className={`bg-panel border rounded-2xl p-3 min-h-[230px] flex flex-col ${
                isToday(day) ? "border-mustard bg-mustard-soft/40" : "border-line"
              }`}
            >
              <div className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">
                {JOURS[day.getDay()]}
              </div>
              <div className="font-display text-xl font-semibold text-ink mb-2.5">
                {day.getDate()}
              </div>

              <div className="flex-1 space-y-2">
                {dayPosts.map((post) => (
                  <div
                    key={post.id}
                    className="bg-white rounded-xl overflow-hidden shadow-sm group"
                  >
                    <div
                      className={`text-[9px] font-extrabold uppercase tracking-wide px-2.5 py-1 flex justify-between items-center text-white ${
                        post.socialAccount.platform === "INSTAGRAM" ? "bg-magenta" : "bg-orange"
                      }`}
                    >
                      <span>
                        {post.socialAccount.platform === "INSTAGRAM" ? "Instagram" : "Facebook"}
                        {post.source === "AI_GENERATED" && " · ✨ IA"}
                      </span>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="opacity-0 group-hover:opacity-100 transition"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="p-2">
                      <div className="text-[11px] font-bold text-ink-soft">
                        {new Date(post.scheduledFor).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {post.status === "PUBLISHED" && (
                          <span className="text-mustard"> · publié</span>
                        )}
                        {post.status === "FAILED" && (
                          <span className="text-danger"> · échec</span>
                        )}
                      </div>
                      <div className="text-xs text-ink leading-snug line-clamp-3">
                        {post.content}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => openForm(day)}
                className="mt-2 text-xs font-bold text-orange border border-dashed border-orange/40 rounded-lg py-1.5 hover:bg-orange-soft transition"
              >
                + Ajouter
              </button>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50"
          onClick={() => setShowForm(null)}
        >
          <div
            className="bg-panel rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-xl font-semibold text-ink mb-4">
              Nouvelle publication — {formatDayMonth(showForm.date)}
            </h2>

            <form onSubmit={(e) => handleSubmit(e, "MANUAL")} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wide">
                  Compte
                </label>
                <select
                  required
                  value={form.socialAccountId}
                  onChange={(e) => setForm({ ...form, socialAccountId: e.target.value })}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
                >
                  <option value="">Choisir…</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.displayName} ({a.platform})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wide">
                    Heure
                  </label>
                  <input
                    type="time"
                    required
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-ink-soft uppercase tracking-wide">
                    Contenu
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateAi}
                    disabled={aiLoading}
                    className="text-[11px] font-bold text-orange disabled:opacity-50"
                  >
                    {aiLoading ? "Génération…" : "✨ Générer avec l'IA"}
                  </button>
                </div>
                <textarea
                  required
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white resize-none"
                  placeholder="Écris ton post, ou génère-le avec l'IA…"
                />
              </div>

              {aiVariants.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-ink-soft uppercase tracking-wide">
                    Variantes proposées
                  </p>
                  {aiVariants.map((v, i) => (
                    <button
                      type="button"
                      key={i}
                      onClick={() => setForm({ ...form, content: v })}
                      className="w-full text-left text-xs bg-mustard-soft border border-mustard/30 rounded-lg p-2.5 hover:brightness-95"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-orange text-white font-bold text-sm rounded-lg px-5 py-2.5 disabled:opacity-50"
                >
                  {saving ? "Enregistrement…" : "Programmer"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(null)}
                  className="text-ink-soft text-sm font-semibold px-3"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
