import { NextResponse } from "next/server";
export const runtime = "nodejs";
// Stripe webhook is a no-op in local mode (mock checkout updates subscriptions directly).
export async function POST() {
  return NextResponse.json({ received: true, note: "Stripe disabled in local mode" });
}

