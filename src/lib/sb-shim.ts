/**
 * Server-only SQLite executor for the Supabase-compatible builder.
 * Browser-safe types and the builder factory live in `./sb-builder` to avoid
 * webpack pulling fs/crypto into the client bundle.
 */
import { getDb, uuid } from "./db";
import type { SerializedQuery, Result } from "./sb-builder";
export type { SerializedQuery, Result } from "./sb-builder";
export { createBuilderFactory } from "./sb-builder";

// FK relations used by the codebase (relation_name -> fk col on source table)
const RELATIONS: Record<string, Record<string, { fkCol: string; refTable: string }>> = {
  profiles: { charities: { fkCol: "charity_id", refTable: "charities" } },
  winners: {
    profiles: { fkCol: "user_id", refTable: "profiles" },
    draws: { fkCol: "draw_id", refTable: "draws" }
  }
};

const TABLES_WITH_UUID = new Set(["profiles", "charities", "subscriptions", "scores", "draws", "winners", "donations"]);

// Columns we serialize as JSON in SQLite (arrays in app land)
const JSON_COLS: Record<string, Set<string>> = {
  draws: new Set(["winning_numbers"])
};

function parseCols(table: string, raw: string): {
  plain: string[]; // column names (with optional "alias:" prefix)
  aliases: Record<string, string>; // sqlAlias -> appAlias
  relations: Array<{ name: string; cols: string[] }>;
  star: boolean;
} {
  const aliases: Record<string, string> = {};
  const relations: Array<{ name: string; cols: string[] }> = [];
  // Extract relations first: name(col1, col2, ...)
  const relRe = /(\w+)\(([^)]+)\)/g;
  let s = raw;
  let m: RegExpExecArray | null;
  while ((m = relRe.exec(raw)) !== null) {
    relations.push({ name: m[1], cols: m[2].split(",").map(x => x.trim()) });
  }
  s = s.replace(relRe, "").replace(/,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "");
  const plain = s.split(",").map(x => x.trim()).filter(Boolean);
  let star = false;
  const finalPlain: string[] = [];
  for (const c of plain) {
    if (c === "*") { star = true; continue; }
    const aliasMatch = c.match(/^(\w+):(\w+)$/);
    if (aliasMatch) {
      aliases[aliasMatch[2]] = aliasMatch[1]; // dbCol -> outputName
      finalPlain.push(aliasMatch[2]);
    } else {
      finalPlain.push(c);
    }
  }
  return { plain: finalPlain, aliases, relations, star };
}

function rowOut(row: any, jsonCols: Set<string> | undefined, aliases: Record<string, string>) {
  if (!row) return row;
  const out: any = {};
  for (const k of Object.keys(row)) {
    const outKey = aliases[k] ?? k;
    let v = row[k];
    if (jsonCols?.has(k) && typeof v === "string") {
      try { v = JSON.parse(v); } catch { /* keep */ }
    }
    out[outKey] = v;
  }
  return out;
}

function rowIn(table: string, row: any): any {
  const out: any = { ...row };
  const jc = JSON_COLS[table];
  if (jc) for (const k of jc) if (k in out && Array.isArray(out[k])) out[k] = JSON.stringify(out[k]);
  return out;
}

function attachRelations(table: string, rows: any[], relations: Array<{ name: string; cols: string[] }>) {
  if (!rows.length || !relations.length) return;
  const tableRels = RELATIONS[table];
  if (!tableRels) return;
  const db = getDb();
  for (const rel of relations) {
    const meta = tableRels[rel.name];
    if (!meta) continue;
    const fks = Array.from(new Set(rows.map(r => r[meta.fkCol]).filter(v => v != null)));
    if (!fks.length) { for (const r of rows) r[rel.name] = null; continue; }
    const placeholders = fks.map(() => "?").join(",");
    const stmt = db.prepare(`SELECT * FROM ${meta.refTable} WHERE id IN (${placeholders})`);
    const found = stmt.all(...fks) as any[];
    const map = new Map(found.map(f => [f.id, f]));
    const refJsonCols = JSON_COLS[meta.refTable];
    for (const r of rows) {
      const fkVal = r[meta.fkCol];
      const linked = fkVal != null ? map.get(fkVal) : null;
      if (!linked) { r[rel.name] = null; continue; }
      const projected: any = {};
      for (const c of rel.cols) {
        let v = linked[c];
        if (refJsonCols?.has(c) && typeof v === "string") { try { v = JSON.parse(v); } catch {} }
        projected[c] = v;
      }
      r[rel.name] = projected;
    }
  }
}

export function execQuery(q: SerializedQuery): Result {
  const db = getDb();
  try {
    if (q.op === "select") return execSelect(q);
    if (q.op === "insert") return execInsert(q);
    if (q.op === "update") return execUpdate(q);
    if (q.op === "delete") return execDelete(q);
    if (q.op === "upsert") return execUpsert(q);
    return { data: null, error: { message: `Unsupported op ${q.op}` } };
  } catch (e: any) {
    return { data: null, error: { message: e.message ?? String(e) } };
  }
}

function buildWhere(filters: Filter[]): { sql: string; params: any[] } {
  if (!filters.length) return { sql: "", params: [] };
  const parts: string[] = [];
  const params: any[] = [];
  for (const f of filters) {
    parts.push(`${f.col} = ?`);
    params.push(f.val === true ? 1 : f.val === false ? 0 : f.val);
  }
  return { sql: ` WHERE ${parts.join(" AND ")}`, params };
}

function execSelect(q: SerializedQuery): Result {
  const db = getDb();
  const { plain, aliases, relations, star } = parseCols(q.table, q.cols ?? "*");
  let selectClause = "*";
  if (!star && plain.length) selectClause = plain.join(", ");
  else if (star && plain.length) selectClause = `*, ${plain.join(", ")}`;

  const where = buildWhere(q.filters);
  let countResult: number | undefined;

  if (q.countMode === "exact") {
    const row = db.prepare(`SELECT COUNT(*) AS c FROM ${q.table}${where.sql}`).get(...where.params) as { c: number };
    countResult = row.c;
    if (q.head) return { data: null, error: null, count: countResult };
  }

  let sql = `SELECT ${selectClause} FROM ${q.table}${where.sql}`;
  if (q.orders.length) sql += " ORDER BY " + q.orders.map(o => `${o.col} ${o.ascending ? "ASC" : "DESC"}`).join(", ");
  if (q.limitN != null) sql += ` LIMIT ${q.limitN}`;

  const rows = db.prepare(sql).all(...where.params) as any[];
  attachRelations(q.table, rows, relations);
  const jc = JSON_COLS[q.table];
  const mapped = rows.map(r => rowOut(r, jc, aliases));

  if (q.single) {
    if (mapped.length !== 1) return { data: null, error: { message: `Expected single row, got ${mapped.length}` } };
    return { data: mapped[0], error: null, count: countResult };
  }
  if (q.maybeSingle) return { data: mapped[0] ?? null, error: null, count: countResult };
  return { data: mapped, error: null, count: countResult };
}

function execInsert(q: SerializedQuery): Result {
  const db = getDb();
  const rows = Array.isArray(q.payload) ? q.payload : [q.payload];
  const inserted: any[] = [];
  for (const raw of rows) {
    const row = rowIn(q.table, raw);
    if (TABLES_WITH_UUID.has(q.table) && !row.id) row.id = uuid();
    const cols = Object.keys(row);
    const placeholders = cols.map(() => "?").join(",");
    const vals = cols.map(c => row[c] === true ? 1 : row[c] === false ? 0 : row[c]);
    db.prepare(`INSERT INTO ${q.table} (${cols.join(",")}) VALUES (${placeholders})`).run(...vals);
    inserted.push(row);
  }
  if (q.postSelectCols) {
    const ids = inserted.map(r => r.id);
    if (!ids.length) return { data: q.postSelectSingle ? null : [], error: null };
    const placeholders = ids.map(() => "?").join(",");
    const found = db.prepare(`SELECT * FROM ${q.table} WHERE id IN (${placeholders})`).all(...ids) as any[];
    const jc = JSON_COLS[q.table];
    const mapped = found.map(r => rowOut(r, jc, {}));
    return { data: q.postSelectSingle ? (mapped[0] ?? null) : mapped, error: null };
  }
  return { data: null, error: null };
}

function execUpdate(q: SerializedQuery): Result {
  const db = getDb();
  const patch = rowIn(q.table, q.payload);
  const setCols = Object.keys(patch);
  if (!setCols.length) return { data: null, error: null };
  const setSql = setCols.map(c => `${c} = ?`).join(", ");
  const setVals = setCols.map(c => patch[c] === true ? 1 : patch[c] === false ? 0 : patch[c]);
  const where = buildWhere(q.filters);
  db.prepare(`UPDATE ${q.table} SET ${setSql}${where.sql}`).run(...setVals, ...where.params);
  return { data: null, error: null };
}

function execDelete(q: SerializedQuery): Result {
  const db = getDb();
  const where = buildWhere(q.filters);
  db.prepare(`DELETE FROM ${q.table}${where.sql}`).run(...where.params);
  return { data: null, error: null };
}

function execUpsert(q: SerializedQuery): Result {
  const db = getDb();
  const conflictCol = q.upsertOpts?.onConflict ?? "id";
  const rows = Array.isArray(q.payload) ? q.payload : [q.payload];
  const inserted: any[] = [];
  for (const raw of rows) {
    const row = rowIn(q.table, raw);
    if (TABLES_WITH_UUID.has(q.table) && !row.id && conflictCol !== "id") {
      // For UPSERT BY non-id: only generate id if no existing row found
      const existing = db.prepare(`SELECT id FROM ${q.table} WHERE ${conflictCol} = ?`).get(row[conflictCol]) as any;
      if (existing) row.id = existing.id;
      else row.id = uuid();
    } else if (TABLES_WITH_UUID.has(q.table) && !row.id) {
      row.id = uuid();
    }
    const cols = Object.keys(row);
    const placeholders = cols.map(() => "?").join(",");
    const vals = cols.map(c => row[c] === true ? 1 : row[c] === false ? 0 : row[c]);
    const updateClause = cols.filter(c => c !== conflictCol && c !== "id").map(c => `${c}=excluded.${c}`).join(", ");
    const sql = `INSERT INTO ${q.table} (${cols.join(",")}) VALUES (${placeholders}) ON CONFLICT(${conflictCol}) DO UPDATE SET ${updateClause || conflictCol + "=" + conflictCol}`;
    db.prepare(sql).run(...vals);
    inserted.push(row);
  }
  if (q.postSelectCols) {
    const conflictVals = inserted.map(r => r[conflictCol]);
    if (!conflictVals.length) return { data: q.postSelectSingle ? null : [], error: null };
    const placeholders = conflictVals.map(() => "?").join(",");
    const found = db.prepare(`SELECT * FROM ${q.table} WHERE ${conflictCol} IN (${placeholders})`).all(...conflictVals) as any[];
    const jc = JSON_COLS[q.table];
    const mapped = found.map(r => rowOut(r, jc, {}));
    return { data: q.postSelectSingle ? (mapped[0] ?? null) : mapped, error: null };
  }
  return { data: null, error: null };
}

