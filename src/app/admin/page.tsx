import { getDb } from "@/lib/db";
import { formatCents } from "@/lib/utils";

export default async function AdminPage() {
  const db = getDb();

  // Get stats from database
  const usersCount = (db.prepare("SELECT COUNT(*) as count FROM profiles WHERE role = 'subscriber'").get() as any).count;
  const activeSubsCount = (db.prepare("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'active'").get() as any).count;
  const latestPool = db.prepare("SELECT pool_total_cents FROM draws ORDER BY created_at DESC LIMIT 1").get() as any;
  const donationsData = db.prepare("SELECT SUM(amount_cents) as total FROM donations WHERE amount_cents > 0").get() as any;

  const stats = [
    { label: "Total users", value: usersCount ?? 0 },
    { label: "Active subscriptions", value: activeSubsCount ?? 0 },
    { label: "Latest pool", value: formatCents(latestPool?.pool_total_cents ?? 0) },
    { label: "Total charity donations", value: formatCents(donationsData?.total ?? 0) }
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
      {stats.map(s => (
        <div key={s.label} className="glass p-6">
          <p className="text-muted text-sm">{s.label}</p>
          <p className="text-2xl font-bold mt-2">{s.value}</p>
        </div>
      ))}
    </div>
  );
}