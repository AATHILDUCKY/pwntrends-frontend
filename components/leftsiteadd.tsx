"use client";

export default function LeftSiteAdd() {
  return (
    <aside className="hidden lg:block w-56 xl:w-64">
      <div className="sticky top-20 space-y-3">
        {/* Main ad / promo card */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 shadow-lg shadow-slate-900/60">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-1 font-medium">
            Featured
          </p>
          <h3 className="text-sm font-semibold text-slate-50">
            Sponsor your CTF or tool
          </h3>
          <p className="mt-1 text-[11px] text-slate-400">
            Get your event or open source project in front of offensive security
            engineers on PwnTrends.
          </p>
          <button className="mt-3 w-full rounded-full bg-primary-500/90 text-[11px] font-semibold text-slate-950 py-1.5 hover:bg-primary-400 transition">
            Promote now
          </button>
        </div>

        {/* Small badge card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3 text-[11px] text-slate-300">
          <p className="font-semibold text-slate-100 mb-1">
            Want your logo here?
          </p>
          <p className="text-slate-400">
            Reach focused red teams, CTF players & researchers.
          </p>
        </div>
      </div>
    </aside>
  );
}
