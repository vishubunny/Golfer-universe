export function Footer() {
  return (
    <footer className="border-t border-white/10 mt-20">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-white/50">
        <span>© {new Date().getFullYear()} Digital Heroes. Play with purpose.</span>
        <span>Built with Next.js, Supabase &amp; Stripe.</span>
      </div>
    </footer>
  );
}
