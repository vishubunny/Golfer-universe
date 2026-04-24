import { NextResponse } from "next/server";
import { getDb, uuid } from "@/lib/db";
import bcrypt from "bcryptjs";
import { setSessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const db = getDb();
    const row = db.prepare(
      "SELECT id, email, password_hash, role FROM profiles WHERE email = ? AND role = ?"
    ).get(email.toLowerCase(), "admin") as any;

    if (!row) {
      return NextResponse.json({ error: "Invalid credentials or admin access required" }, { status: 401 });
    }

    if (!bcrypt.compareSync(password, row.password_hash)) {
      return NextResponse.json({ error: "Invalid credentials or admin access required" }, { status: 401 });
    }

    const user = { id: row.id, email: row.email, role: row.role };
    await setSessionCookie(user);

    return NextResponse.json({ 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      } 
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}
