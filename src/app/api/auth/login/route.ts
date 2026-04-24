import { NextResponse } from "next/server";
import { loginUser } from "@/lib/auth";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const r = await loginUser(email, password);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ user: { id: r.user!.id, email: r.user!.email, role: r.user!.role } });
}
