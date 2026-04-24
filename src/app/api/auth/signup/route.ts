import { NextResponse } from "next/server";
import { signupUser } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password, full_name } = await req.json();
  const r = await signupUser(email, password, full_name);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ user: { id: r.user!.id, email: r.user!.email } });
}
