import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, status } = (await req.json()) as { id: string; status: "approved" | "rejected" | "paid" };
  const update: any = { status, reviewed_by: user.id, reviewed_at: new Date().toISOString() };
  if (status === "paid") update.paid_at = new Date().toISOString();
  const { error } = await supabase.from("winners").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
