"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCents } from "@/lib/utils";
import type { Winner } from "@/types/db";

export default function WinningsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<(Winner & { draws: { period: string } })[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("winners")
      .select("*, draws(period)")
      .order("created_at", { ascending: false });
    setRows((data ?? []) as any);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function upload(winnerId: string, file: File) {
    setUploading(winnerId);
    const path = `${winnerId}/${Date.now()}-${file.name}`;
    const { error: up } = await supabase.storage.from("winner-proofs").upload(path, file);
    if (up) { setUploading(null); return alert(up.message); }
    await supabase.from("winners").update({ proof_url: path }).eq("id", winnerId);
    setUploading(null); load();
  }

  return (
    <div className="glass p-6">
      <h3 className="font-semibold mb-4">Your winnings</h3>
      <table className="w-full text-sm">
        <thead className="text-muted"><tr><th className="text-left p-2">Period</th><th className="text-left p-2">Match</th><th className="text-left p-2">Prize</th><th className="text-left p-2">Status</th><th className="text-left p-2">Proof</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id} className="border-t border-white/5">
              <td className="p-2">{(r as any).draws?.period}</td>
              <td className="p-2">{r.match_count}-match</td>
              <td className="p-2 font-semibold">{formatCents(r.prize_cents)}</td>
              <td className="p-2 capitalize">{r.status}</td>
              <td className="p-2">
                {r.proof_url ? <span className="text-muted text-xs">Uploaded</span> :
                  <input type="file" accept="image/*" disabled={uploading === r.id}
                    onChange={e => e.target.files?.[0] && upload(r.id, e.target.files[0])}
                    className="text-xs" />}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="p-4 text-center text-muted">No winnings yet — keep playing!</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
