import { createClient } from "@/lib/supabase/server";

export default async function AdminUsers() {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("id, email, full_name, role, charity_pct, created_at").order("created_at", { ascending: false }).limit(200);
  return (
    <div className="glass p-6 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted"><tr><th className="text-left p-2">Email</th><th className="text-left p-2">Name</th><th className="text-left p-2">Role</th><th className="text-left p-2">Charity %</th><th className="text-left p-2">Joined</th></tr></thead>
        <tbody>
          {(data ?? []).map(u => (
            <tr key={u.id} className="border-t border-white/5">
              <td className="p-2">{u.email}</td><td className="p-2">{u.full_name}</td><td className="p-2">{u.role}</td><td className="p-2">{u.charity_pct}%</td><td className="p-2">{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
