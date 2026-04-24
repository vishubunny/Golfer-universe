import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user) redirect("/admin/login?next=/admin");
  if (user.role !== "admin") redirect("/dashboard");

  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/draws", label: "Draws" },
    { href: "/admin/charities", label: "Charities" },
    { href: "/admin/winners", label: "Winners" }
  ];
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-2">Admin dashboard</h1>
      <p className="text-sm text-muted mb-6">Signed in as <span className="text-white">{user.email}</span>. Use the tabs below to monitor users, draws, and charity impact.</p>
      <div className="flex gap-2 flex-wrap mb-8">
        {tabs.map(t => <Link key={t.href} href={t.href} className="btn-ghost !py-1.5 !px-3 text-sm">{t.label}</Link>)}
      </div>
      {children}
    </div>
  );
}
