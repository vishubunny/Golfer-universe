import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDraw, type DrawLogic } from "@/lib/draw-engine";
import { calculatePool } from "@/lib/prize-pool";

/**
 * Admin-only: simulate a draw for `period` without publishing.
 * Stores as draws.status = 'simulated' (overwriting prior simulation for that period).
 */
export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { period, logic } = (await req.json()) as { period: string; logic: DrawLogic };
  const admin = createAdminClient();

  // Aggregate active subscription revenue + scores for algorithm
  const [{ data: subs }, { data: scoreRows }, { data: prevDraw }] = await Promise.all([
    admin.from("subscriptions").select("amount_cents").eq("status", "active"),
    admin.from("scores").select("score"),
    admin.from("draws").select("jackpot_carry_cents, fiveCents:pool_total_cents")
      .eq("status", "published").order("period", { ascending: false }).limit(1).maybeSingle()
  ]);

  const totalSubscriptionCents = (subs ?? []).reduce((s, r) => s + r.amount_cents, 0);
  const { data: avgRow } = await admin.from("profiles").select("charity_pct");
  const avgCharityPct = avgRow?.length ? avgRow.reduce((a, r) => a + Number(r.charity_pct), 0) / avgRow.length : 10;

  const pool = calculatePool({
    totalSubscriptionCents,
    avgCharityPct,
    jackpotCarryCents: (prevDraw as any)?.jackpot_carry_cents ?? 0
  });

  const winningNumbers = runDraw({
    logic,
    scores: (scoreRows ?? []).map(s => s.score)
  });

  const { data, error } = await admin.from("draws").upsert({
    period, logic, status: "simulated",
    winning_numbers: winningNumbers,
    pool_total_cents: pool.totalPoolCents,
    jackpot_carry_cents: pool.jackpotCarryCents
  }, { onConflict: "period" }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ draw: data, pool });
}
