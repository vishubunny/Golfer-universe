import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";

export default async function AdminOverview() {
  const supabase = createClient();
  const [{ count: users }, { count: activeSubs }, { data: pool }, { data: donations }] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("draws").select("pool_total_cents").order("created_at", { ascending: false }).limit(1),
    supabase.from("donations").select("amount_cents")
  ]);
  const totalDonations = ((donations ?? []) as any[]).reduce((s: number, d: any) => s + d.amount_cents, 0);
  const stats = [
    { label: "Total users", value: users ?? 0 },
    { label: "Active subscriptions", value: activeSubs ?? 0 },
    { label: "Latest pool", value: formatCents(pool?.[0]?.pool_total_cents ?? 0) },
    { label: "Total charity donations", value: formatCents(totalDonations) }
  ];
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map(s => (
        <div key={s.label} className="glass p-6">
          <p className="text-muted text-sm">{s.label}</p>
          <p className="text-2xl font-bold mt-2">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
