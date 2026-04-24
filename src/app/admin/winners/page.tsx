"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCents } from "@/lib/utils";

export default function AdminWinners() {
  const supabase = createClient();
  const [rows, setRows] = useState<any[]>([]);
  const load = useCallback(async () => {
    const { data } = await supabase
      .from("winners")
      .select("*, profiles(email, full_name), draws(period)")
      .order("created_at", { ascending: false });
    setRows(data ?? []);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function review(id: string, status: "approved" | "rejected" | "paid") {
    await fetch("/api/winners/verify", { method: "POST", body: JSON.stringify({ id, status }) });
    load();
  }

  return (
    <div className="glass p-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted"><tr><th className="text-left p-2">Period</th><th className="text-left p-2">User</th><th className="text-left p-2">Match</th><th className="text-left p-2">Prize</th><th className="text-left p-2">Proof</th><th className="text-left p-2">Status</th><th className="p-2"></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-white/5">
              <td className="p-2">{r.draws?.period}</td>
              <td className="p-2">{r.profiles?.email}</td>
              <td className="p-2">{r.match_count}</td>
              <td className="p-2">{formatCents(r.prize_cents)}</td>
              <td className="p-2">{r.proof_url ? "✓" : "—"}</td>
              <td className="p-2 capitalize">{r.status}</td>
              <td className="p-2 space-x-2 text-xs">
                {r.status === "pending" && <>
                  <button className="text-green-400" onClick={() => review(r.id, "approved")}>Approve</button>
                  <button className="text-red-400" onClick={() => review(r.id, "rejected")}>Reject</button>
                </>}
                {r.status === "approved" && <button className="text-brand-100" onClick={() => review(r.id, "paid")}>Mark paid</button>}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className="p-4 text-center text-muted">No winners yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
