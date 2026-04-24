import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runDraw } from "@/lib/draw-engine";
import { calculatePool } from "@/lib/prize-pool";
import { currentPeriod } from "@/lib/utils";

/**
 * Vercel Cron: runs at 00:00 UTC on the 1st of each month (see vercel.json).
 * Creates a draft draw for the new period — admin reviews & publishes from UI.
 * Protected by CRON_SECRET (Vercel sends it automatically; locally pass header).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const period = currentPeriod();
  const { data: existing } = await admin.from("draws").select("id").eq("period", period).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, message: "Draw already exists for this period" });

  const [{ data: subs }, { data: scoreRows }, { data: prev }] = await Promise.all([
    admin.from("subscriptions").select("amount_cents").eq("status", "active"),
    admin.from("scores").select("score"),
    admin.from("draws").select("jackpot_carry_cents").order("period", { ascending: false }).limit(1).maybeSingle()
  ]);

  const totalSubscriptionCents = (subs ?? []).reduce((s, r) => s + r.amount_cents, 0);
  const { data: avgRow } = await admin.from("profiles").select("charity_pct");
  const avgCharityPct = avgRow?.length ? avgRow.reduce((a, r) => a + Number(r.charity_pct), 0) / avgRow.length : 10;
  const pool = calculatePool({ totalSubscriptionCents, avgCharityPct, jackpotCarryCents: prev?.jackpot_carry_cents ?? 0 });

  const winningNumbers = runDraw({ logic: "random", scores: (scoreRows ?? []).map(s => s.score) });

  await admin.from("draws").insert({
    period, logic: "random", status: "draft",
    winning_numbers: winningNumbers,
    pool_total_cents: pool.totalPoolCents,
    jackpot_carry_cents: pool.jackpotCarryCents
  });
  return NextResponse.json({ ok: true, period });
}
