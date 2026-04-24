import { NextResponse } from "next/server";
import { execQuery } from "@/lib/sb-shim";
import type { SerializedQuery } from "@/lib/sb-builder";
import { getServerUser } from "@/lib/auth";

const PUBLIC_READ_TABLES = new Set(["charities"]);

export async function POST(req: Request) {
  const q = (await req.json()) as SerializedQuery;
  const user = await getServerUser();
  if (!user) {
    if (q.op === "select" && PUBLIC_READ_TABLES.has(q.table)) {
      return NextResponse.json(execQuery(q));
    }
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  const adminWriteTables = new Set(["charities", "draws"]);
  if (q.op !== "select" && adminWriteTables.has(q.table) && user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (q.table === "winners" && q.op !== "select" && user.role !== "admin") {
    if (q.op !== "update") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const allowedKeys = new Set(["proof_url"]);
    if (Object.keys(q.payload ?? {}).some(k => !allowedKeys.has(k))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  if (q.table === "profiles" && q.op === "update" && user.role !== "admin") {
    const idFilter = q.filters.find(f => f.col === "id");
    if (!idFilter || idFilter.val !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const allowedKeys = new Set(["charity_id", "charity_pct", "full_name"]);
    if (Object.keys(q.payload ?? {}).some(k => !allowedKeys.has(k))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }
  if (q.table === "scores" && q.op === "insert" && user.role !== "admin") {
    const rows = Array.isArray(q.payload) ? q.payload : [q.payload];
    for (const r of rows) r.user_id = user.id;
    q.payload = Array.isArray(q.payload) ? rows : rows[0];
  }
  return NextResponse.json(execQuery(q));
}
