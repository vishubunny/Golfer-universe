import { NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs";
import { getServerUser } from "@/lib/auth";

export const runtime = "nodejs";

const UPLOAD_ROOT = path.join(process.cwd(), "data", "uploads");

export async function POST(req: Request) {
  const user = await getServerUser();
  if (!user) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  const fd = await req.formData();
  const bucket = String(fd.get("bucket") ?? "default").replace(/[^a-zA-Z0-9_\-]/g, "");
  const relPath = String(fd.get("path") ?? "").replace(/\.\./g, "").replace(/^\/+/, "");
  const file = fd.get("file") as File | null;
  if (!file || !relPath) return NextResponse.json({ error: "Missing file or path" }, { status: 400 });
  const dest = path.join(UPLOAD_ROOT, bucket, relPath);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(dest, buf);
  return NextResponse.json({ path: relPath });
}
