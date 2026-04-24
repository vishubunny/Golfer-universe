"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Charity } from "@/types/db";

export default function AdminCharities() {
  const supabase = createClient();
  const [list, setList] = useState<Charity[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", description: "", image_url: "", website: "", is_featured: false });

  async function load() {
    const { data } = await supabase.from("charities").select("*").order("created_at", { ascending: false });
    setList((data ?? []) as Charity[]);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("charities").insert(form);
    if (error) return alert(error.message);
    setForm({ name: "", slug: "", description: "", image_url: "", website: "", is_featured: false });
    load();
  }
  async function del(id: string) { await supabase.from("charities").delete().eq("id", id); load(); }
  async function toggle(c: Charity) { await supabase.from("charities").update({ is_active: !c.is_active }).eq("id", c.id); load(); }

  return (
    <div className="space-y-6">
      <form onSubmit={add} className="glass p-6 grid md:grid-cols-2 gap-3">
        <input className="input" required placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="input" required placeholder="slug-url" value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} />
        <input className="input md:col-span-2" placeholder="Image URL" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
        <input className="input md:col-span-2" placeholder="Website" value={form.website} onChange={e => setForm({ ...form, website: e.target.value })} />
        <textarea className="input md:col-span-2" placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({ ...form, is_featured: e.target.checked })} /> Feature on homepage</label>
        <button className="btn-primary md:col-span-2">Add charity</button>
      </form>
      <div className="glass p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-muted"><tr><th className="text-left p-2">Name</th><th className="text-left p-2">Featured</th><th className="text-left p-2">Active</th><th className="p-2"></th></tr></thead>
          <tbody>
            {list.map(c => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="p-2">{c.name}</td><td className="p-2">{c.is_featured ? "★" : ""}</td><td className="p-2">{c.is_active ? "Yes" : "No"}</td>
                <td className="p-2 text-right space-x-2">
                  <button className="text-xs text-brand-100" onClick={() => toggle(c)}>{c.is_active ? "Disable" : "Enable"}</button>
                  <button className="text-xs text-red-400" onClick={() => del(c.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
