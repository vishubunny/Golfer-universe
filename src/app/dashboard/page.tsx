import { createClient } from "@/lib/supabase/server";
import { formatCents } from "@/lib/utils";
import Link from "next/link";

export default async function DashboardHome() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: sub }, { data: scores }, { data: winners }] = await Promise.all([
    supabase.from("profiles").select("*, charities(name)").eq("id", user.id).single(),
    supabase.from("subscriptions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("scores").select("*").eq("user_id", user.id).order("played_on", { ascending: false }),
    supabase.from("winners").select("*").eq("user_id", user.id)
  ]);

  const totalWon = (winners ?? []).reduce((s, w) => s + (w.prize_cents ?? 0), 0);
  const status = sub?.status ?? "none";

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <Card title="Subscription" cta={<Link href="/dashboard/subscription" className="text-brand-100 text-sm">Manage →</Link>}>
        <p className="text-2xl font-bold capitalize">{status}</p>
        {sub?.current_period_end && <p className="text-muted text-sm mt-1">Renews {new Date(sub.current_period_end).toLocaleDateString()}</p>}
      </Card>
      <Card title="Charity" cta={<Link href="/dashboard/charity" className="text-brand-100 text-sm">Change →</Link>}>
        <p className="text-2xl font-bold">{(profile as any)?.charities?.name ?? "Not selected"}</p>
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
