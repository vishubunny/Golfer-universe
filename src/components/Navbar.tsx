"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string; role?: "subscriber" | "admin" } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const res = await fetch("/api/auth/me");
        const data = await res.json();
        setUser(data.user ?? null);
      } catch (error) {
        console.error("Failed to get user:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const links = [
    { href: "/charities", label: "Charities" },
    { href: "/how-it-works", label: "How it works" }
  ];
  const adminLink = user?.role === "admin" ? { href: "/admin", label: "Admin" } : { href: "/admin/login", label: "Admin" };
  const dashboardLink = { href: "/dashboard", label: "Dashboard" };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Heart className="size-5 text-accent" /> Golf for good
        </Link>
        <div className="flex items-center gap-6">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`text-sm transition ${path?.startsWith(l.href) ? "text-white" : "text-white/60 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
          <Link href={adminLink.href} className={`text-sm transition ${path?.startsWith("/admin") ? "text-white" : "text-white/60 hover:text-white"}`}>
            {adminLink.label}
          </Link>
          {!loading && (
            <>
              {user ? (
                <>
                  {user.role !== "admin" && (
                    <Link href={dashboardLink.href} className="text-sm text-white/60 hover:text-white transition">
                      {dashboardLink.label}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition"
                  >
                    <LogOut className="size-4" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" className="text-sm text-white/60 hover:text-white transition">
                    Sign in
                  </Link>
                  <Link href="/signup" className="btn-primary !py-1.5 !px-4 text-sm">Subscribe</Link>
                </>
              )}
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
