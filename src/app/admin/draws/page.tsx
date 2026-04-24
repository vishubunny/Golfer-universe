"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCents, currentPeriod } from "@/lib/utils";
import type { Draw } from "@/types/db";

export default function AdminDraws() {
  const supabase = createClient();
  const [draws, setDraws] = useState<Draw[]>([]);
  const [period, setPeriod] = useState(currentPeriod());
  const [logic, setLogic] = useState<"random" | "algorithmic">("random");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("draws").select("*").order("period", { ascending: false });
    setDraws((data ?? []) as Draw[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function call(action: "simulate" | "publish", drawId?: string) {
    setBusy(true); setMsg(null);
    const url = action === "simulate" ? "/api/draws/simulate" : "/api/draws/publish";
    const body = action === "simulate" ? { period, logic } : { drawId };
    const res = await fetch(url, { method: "POST", body: JSON.stringify(body) });
    const json = await res.json();
    setBusy(false); setMsg(json.error ?? `${action} OK`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="glass p-6 grid md:grid-cols-3 gap-3 items-end">
        <div><label className="label">Period</label><input className="input" value={period} onChange={e => setPeriod(e.target.value)} placeholder="2026-04" /></div>
        <div><label className="label">Logic</label>
          <select className="input" value={logic} onChange={e => setLogic(e.target.value as any)}>
            <option value="random">Random</option><option value="algorithmic">Algorithmic (most-frequent)</option>
          </select>
        </div>
        <button className="btn-primary" disabled={busy} onClick={() => call("simulate")}>Run simulation</button>
      </div>
      {msg && <p className="text-accent text-sm">{msg}</p>}

      <div className="glass p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted"><tr><th className="text-left p-2">Period</th><th className="text-left p-2">Logic</th><th className="text-left p-2">Status</th><th className="text-left p-2">Numbers</th><th className="text-left p-2">Pool</th><th className="text-left p-2">Action</th></tr></thead>
          <tbody>
            {draws.map(d => (
              <tr key={d.id} className="border-t border-white/5">
                <td className="p-2">{d.period}</td><td className="p-2">{d.logic}</td><td className="p-2 capitalize">{d.status}</td>
                <td className="p-2 font-mono">{d.winning_numbers?.join(", ") || "—"}</td>
                <td className="p-2">{formatCents(d.pool_total_cents)}</td>
                <td className="p-2">
                  {d.status !== "published" && <button className="btn-ghost !py-1 !px-3 text-xs" disabled={busy} onClick={() => call("publish", d.id)}>Publish</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
