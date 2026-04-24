"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { validateScore, applyRollingFive, type ScoreEntry } from "@/lib/scores";
import { Trash2 } from "lucide-react";

export default function ScoresPage() {
  const supabase = createClient();
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [score, setScore] = useState(20); const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null); const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("scores").select("*").order("played_on", { ascending: false });
    setScores((data ?? []) as ScoreEntry[]);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try {
      validateScore({ score, played_on: date }, scores);
    } catch (ex: any) { return setErr(ex.message); }
    setBusy(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("scores").insert({ score, played_on: date, user_id: user!.id });
    setBusy(false);
    if (error) return setErr(error.message);
    await load();
  }

  async function remove(id?: string) {
    if (!id) return;
    await supabase.from("scores").delete().eq("id", id);
    await load();
  }

  const preview = applyRollingFive(scores);

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <form onSubmit={add} className="glass p-6 space-y-4">
        <h3 className="font-semibold">Add a score</h3>
        <div><label className="label">Score (1–45)</label><input type="number" min={1} max={45} className="input" value={score} onChange={e => setScore(+e.target.value)} required /></div>
        <div><label className="label">Date played</label><input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required /></div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Add score"}</button>
        <p className="text-xs text-muted">Only your last 5 scores are kept. One entry per date.</p>
      </form>
      <div className="glass p-6">
        <h3 className="font-semibold mb-4">Last 5 scores</h3>
        <ul className="space-y-2">
          {preview.map(s => (
            <li key={s.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2">
              <div><span className="text-2xl font-bold mr-3">{s.score}</span><span className="text-muted text-sm">{s.played_on}</span></div>
              <button onClick={() => remove(s.id)} className="text-white/40 hover:text-red-400"><Trash2 className="size-4" /></button>
            </li>
          ))}
          {!preview.length && <p className="text-muted text-sm">No scores yet.</p>}
        </ul>
      </div>
    </div>
  );
}
