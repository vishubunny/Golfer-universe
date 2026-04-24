"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";

export function Navbar() {
  const path = usePathname();
  const links = [
    { href: "/charities", label: "Charities" },
    { href: "/how-it-works", label: "How it works" },
    { href: "/dashboard", label: "Dashboard" }
  ];
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10">
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <Heart className="size-5 text-accent" /> Digital Heroes
        </Link>
        <div className="flex items-center gap-6">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`text-sm transition ${path?.startsWith(l.href) ? "text-white" : "text-white/60 hover:text-white"}`}>
              {l.label}
            </Link>
          ))}
          <Link href="/signup" className="btn-primary !py-1.5 !px-4 text-sm">Subscribe</Link>
        </div>
      </nav>
    </header>
  );
}
