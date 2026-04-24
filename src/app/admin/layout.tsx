import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/draws", label: "Draws" },
    { href: "/admin/charities", label: "Charities" },
    { href: "/admin/winners", label: "Winners" }
  ];
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">Admin</h1>
      <div className="flex gap-2 flex-wrap mb-8">
        {tabs.map(t => <Link key={t.href} href={t.href} className="btn-ghost !py-1.5 !px-3 text-sm">{t.label}</Link>)}
      </div>
      {children}
    </div>
  );
}
