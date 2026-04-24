import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/auth";

export async function GET() {
  const u = await getServerUser();
  return NextResponse.json({ user: u ? { id: u.id, email: u.email, role: u.role } : null });
}
