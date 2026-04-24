import { getServerUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { formatCents } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardHome() {
  const user = await getServerUser();
  if (!user) return null;

  const db = getDb();

  // Get user profile
  const profile = db.prepare(`
    SELECT p.*, c.name as charity_name 
    FROM profiles p 
    LEFT JOIN charities c ON p.charity_id = c.id 
    WHERE p.id = ?
  `).get(user.id) as any;

  // Get subscription
  const subscription = db.prepare(`
    SELECT * FROM subscriptions 
    WHERE user_id = ? 
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(user.id) as any;

  // Get scores
  const scores = db.prepare(`
    SELECT * FROM scores 
    WHERE user_id = ? 
    ORDER BY played_on DESC
  `).all(user.id) as any[];

  // Get winners/winnings
  const winners = db.prepare(`
    SELECT * FROM winners 
    WHERE user_id = ? 
    ORDER BY created_at DESC
  `).all(user.id) as any[];

  const totalWon = (winners ?? []).reduce((s, w) => s + (w.prize_cents ?? 0), 0);
  const status = subscription?.status ?? "none";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card title="Subscription" cta={<Link href="/dashboard/subscription" className="text-brand-100 text-sm">Manage →</Link>}>
        <p className="text-2xl font-bold capitalize">{status}</p>
        {subscription?.current_period_end && <p className="text-muted text-sm mt-1">Renews {new Date(subscription.current_period_end).toLocaleDateString()}</p>}
      </Card>
      <Card title="Charity" cta={<Link href="/dashboard/charity" className="text-brand-100 text-sm">Change →</Link>}>
        <p className="text-2xl font-bold">{profile?.charity_name ?? "Not selected"}</p>
        <p className="text-muted text-sm mt-1">{profile?.charity_pct}% of subscription</p>
      </Card>
      <Card title="Recent scores" cta={<Link href="/dashboard/scores" className="text-brand-100 text-sm">Edit →</Link>}>
        <div className="flex gap-2 flex-wrap">
          {(scores ?? []).map(s => (
            <span key={s.id} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm">{s.score}</span>
          ))}
          {!scores?.length && <p className="text-muted text-sm">Log your first score to enter the next draw.</p>}
        </div>
      </Card>
      <Card title="Winnings">
        <p className="text-2xl font-bold">{formatCents(totalWon)}</p>
        <p className="text-muted text-sm mt-1">{(winners ?? []).length} prize(s) won</p>
      </Card>
    </div>
  );
}

function Card({ title, children, cta }: { title: string; children: React.ReactNode; cta?: React.ReactNode }) {
  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between mb-3"><h3 className="text-sm uppercase tracking-wide text-muted">{title}</h3>{cta}</div>
      {children}
    </div>
  );
}
