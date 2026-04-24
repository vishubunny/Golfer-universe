import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { countMatches } from "@/lib/draw-engine";
import { calculatePool, distributePrizes } from "@/lib/prize-pool";

/**
 * Admin-only: publish a simulated draw → calculates winners, prizes, and creates winner rows.
 */
export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { drawId } = (await req.json()) as { drawId: string };
  const admin = createAdminClient();

  const { data: draw } = await admin.from("draws").select("*").eq("id", drawId).single();
  if (!draw) return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  if (draw.status === "published") return NextResponse.json({ error: "Already published" }, { status: 400 });

  // Pull all active subscribers + their last 5 distinct scores
  const { data: subs } = await admin.from("subscriptions").select("user_id, amount_cents").eq("status", "active");
  const { data: avgRow } = await admin.from("profiles").select("charity_pct");
  const avgCharityPct = avgRow?.length ? avgRow.reduce((a, r) => a + Number(r.charity_pct), 0) / avgRow.length : 10;

  // Calculate matches per active user
  const winnersByTier: Record<3 | 4 | 5, string[]> = { 3: [], 4: [], 5: [] };
  for (const s of subs ?? []) {
    const { data: rows } = await admin.from("scores").select("score").eq("user_id", s.user_id);
    const matches = countMatches((rows ?? []).map(r => r.score), draw.winning_numbers);
    if (matches >= 3 && matches <= 5) winnersByTier[matches as 3 | 4 | 5].push(s.user_id);
  }

  const totalSubscriptionCents = (subs ?? []).reduce((acc, r) => acc + r.amount_cents, 0);
  const pool = calculatePool({ totalSubscriptionCents, avgCharityPct, jackpotCarryCents: draw.jackpot_carry_cents });
  const dist = distributePrizes({ pool, fiveWinners: winnersByTier[5].length, fourWinners: winnersByTier[4].length, threeWinners: winnersByTier[3].length });

  // Insert winners
  const winnerRows: any[] = [];
  for (const uid of winnersByTier[5]) winnerRows.push({ draw_id: drawId, user_id: uid, match_count: 5, prize_cents: dist.perFiveCents });
  for (const uid of winnersByTier[4]) winnerRows.push({ draw_id: drawId, user_id: uid, match_count: 4, prize_cents: dist.perFourCents });
  for (const uid of winnersByTier[3]) winnerRows.push({ draw_id: drawId, user_id: uid, match_count: 3, prize_cents: dist.perThreeCents });
  if (winnerRows.length) await admin.from("winners").insert(winnerRows);

  await admin.from("draws").update({
    status: "published", published_at: new Date().toISOString(),
    pool_total_cents: pool.totalPoolCents,
    jackpot_carry_cents: dist.newJackpotCarryCents
  }).eq("id", drawId);

  // Auto-create donation rows from each subscription's charity contribution this period
  const { data: profiles } = await admin.from("profiles").select("id, charity_id, charity_pct");
  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]));
  const donationRows: any[] = [];
  for (const s of subs ?? []) {
    const p = profileMap.get(s.user_id);
    if (!p?.charity_id) continue;
    donationRows.push({ user_id: s.user_id, charity_id: p.charity_id, amount_cents: Math.floor(s.amount_cents * (Number(p.charity_pct) / 100)), source: "subscription" });
  }
  if (donationRows.length) await admin.from("donations").insert(donationRows);

  return NextResponse.json({ ok: true, winners: winnerRows.length, distribution: dist });
}
