import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const NAV = [
  { href: "/calendrier", label: "📅 Calendrier" },
  { href: "/automatisations", label: "💬 Automatisations" },
  { href: "/profil-ia", label: "✨ Profil IA" },
  { href: "/comptes", label: "🔗 Comptes" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-line bg-panel px-5 py-7 hidden md:block">
        <div className="font-display text-lg font-bold text-ink mb-8">
          Post<span className="text-orange">Marché</span>
        </div>
        <nav className="space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block text-sm font-semibold text-ink px-3 py-2 rounded-lg hover:bg-orange-soft/50 transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
