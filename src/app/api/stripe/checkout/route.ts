import { NextResponse } from "next/server";
import { getDb, uuid } from "@/lib/db";
import { getServerUser } from "@/lib/auth";

/**
 * Mock checkout — no Stripe needed. Immediately marks the user as having an
 * active subscription for the chosen plan and redirects to the dashboard.
 */
export async function POST(req: Request) {
  const { plan } = (await req.json()) as { plan: "monthly" | "yearly" };
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const amount_cents = plan === "yearly" ? 9900 : 999;
  const periodDays = plan === "yearly" ? 365 : 30;
  const db = getDb();
  // Cancel any existing active subs, insert a fresh one
  db.prepare(`UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ? AND status = 'active'`).run(user.id);
  db.prepare(`INSERT INTO subscriptions (id, user_id, plan, status, amount_cents, current_period_start, current_period_end) VALUES (?, ?, ?, 'active', ?, datetime('now'), datetime('now', '+${periodDays} days'))`)
    .run(uuid(), user.id, plan, amount_cents);
  return NextResponse.json({ url: "/dashboard?checkout=success" });
}

