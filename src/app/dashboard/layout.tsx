import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getServerUser();
  if (!user) redirect("/login?next=/dashboard");
  if (user.role === "admin") redirect("/admin");

  const tabs = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/scores", label: "Scores" },
    { href: "/dashboard/subscription", label: "Subscription" },
    { href: "/dashboard/charity", label: "Charity" },
    { href: "/dashboard/winnings", label: "Winnings" }
  ];
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Your dashboard</h1>
      <div className="flex gap-2 flex-wrap mb-8">
        {tabs.map(t => (
          <Link key={t.href} href={t.href} className="btn-ghost !py-1.5 !px-3 text-sm">{t.label}</Link>
        ))}
      </div>
      {children}
    </div>
  );
}
