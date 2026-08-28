"use client";

import { useEffect, useState } from "react";

type SocialAccountLite = { id: string; displayName: string; platform: string };
type Rule = {
  id: string;
  name: string;
  keyword: string | null;
  messageTemplate: string;
  active: boolean;
  socialAccount: { displayName: string; platform: string };
  _count: { logs: number };
};

export default function AutomatisationsPage() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [accounts, setAccounts] = useState<SocialAccountLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    socialAccountId: "",
    name: "",
    keyword: "",
    messageTemplate: "Merci pour ton commentaire {prenom} ! 🙏 Je t'envoie les infos ici.",
  });
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [rulesRes, accountsRes] = await Promise.all([
      fetch("/api/comment-rules"),
      fetch("/api/social-accounts"),
    ]);
    if (rulesRes.ok) setRules(await rulesRes.json());
    if (accountsRes.ok) setAccounts(await accountsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/comment-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm({ socialAccountId: "", name: "", keyword: "", messageTemplate: "" });
      loadData();
    }
  }

  async function toggleActive(rule: Rule) {
    setRules((prev) =>
      prev.map((r) => (r.id === rule.id ? { ...r, active: !r.active } : r))
    );
    await fetch(`/api/comment-rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette règle ?")) return;
    setRules((prev) => prev.filter((r) => r.id !== id));
    await fetch(`/api/comment-rules/${id}`, { method: "DELETE" });
  }

  return (
    <div className="max-w-4xl mx-auto px-7 py-9">
      <div className="flex justify-between items-end mb-7">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft mb-1">
            Automatisations
          </p>
          <h1 className="font-display text-[28px] font-semibold text-ink">
            DM automatique sur commentaire
          </h1>
          <p className="text-ink-soft text-sm mt-1">
            Réponds en privé automatiquement quand quelqu&apos;un commente tes publications.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-orange text-white font-bold text-sm rounded-xl px-5 py-3 shadow-[0_4px_12px_rgba(232,98,44,0.3)] hover:brightness-105 transition"
        >
          + Nouvelle règle
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-panel border border-line rounded-2xl p-6 mb-7 space-y-4"
        >
          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wide">
              Compte social
            </label>
            <select
              required
              value={form.socialAccountId}
              onChange={(e) => setForm({ ...form, socialAccountId: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
            >
              <option value="">Choisir un compte…</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName} ({a.platform})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wide">
              Nom de la règle
            </label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex : Merci pour le commentaire"
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wide">
              Mot-clé déclencheur (optionnel)
            </label>
            <input
              value={form.keyword}
              onChange={(e) => setForm({ ...form, keyword: e.target.value })}
              placeholder="Laisser vide = tous les commentaires"
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-ink-soft mb-1.5 uppercase tracking-wide">
              Message envoyé en DM
            </label>
            <textarea
              required
              rows={3}
              value={form.messageTemplate}
              onChange={(e) => setForm({ ...form, messageTemplate: e.target.value })}
              className="w-full border border-line rounded-lg px-3 py-2.5 text-sm bg-white resize-none"
            />
            <p className="text-xs text-ink-soft mt-1">
              Astuce : utilise <code className="bg-mustard-soft px-1 rounded">{"{prenom}"}</code> pour personnaliser.
            </p>
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-ink text-white font-bold text-sm rounded-lg px-5 py-2.5 disabled:opacity-50"
            >
              {saving ? "Création…" : "Créer la règle"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-ink-soft text-sm font-semibold px-3"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-ink-soft text-sm">Chargement…</p>
      ) : rules.length === 0 ? (
        <div className="bg-panel border border-dashed border-line rounded-2xl py-14 text-center">
          <p className="text-ink-soft text-sm italic">
            Aucune règle pour l&apos;instant — crée-en une pour répondre automatiquement à tes commentaires.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="bg-panel border border-line rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-sm text-ink">{rule.name}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-orange-soft text-orange px-2 py-0.5 rounded-full">
                    {rule.socialAccount.platform}
                  </span>
                  {rule.keyword && (
                    <span className="text-[10px] font-bold uppercase tracking-wide bg-mustard-soft text-mustard px-2 py-0.5 rounded-full">
                      mot-clé : {rule.keyword}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-soft truncate">{rule.messageTemplate}</p>
                <p className="text-[11px] text-ink-soft mt-1">
                  {rule._count.logs} DM envoyé{rule._count.logs !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => toggleActive(rule)}
                  className={`w-11 h-6 rounded-full relative transition ${
                    rule.active ? "bg-orange" : "bg-line"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                      rule.active ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="text-danger text-xs font-semibold hover:underline"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
