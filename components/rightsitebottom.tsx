"use client";

export default function RightSiteBottom() {
  return (
    <aside className="hidden xl:block w-64">
      <div className="sticky top-20 space-y-3">
        {/* Mini stats */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
          <h3 className="text-sm font-semibold text-slate-100 mb-2">
            Today on PwnTrends
          </h3>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span>New posts</span>
              <span className="text-slate-100 font-semibold">∞</span>
            </div>
            <div className="flex items-center justify-between">
              <span>CTF write-ups</span>
              <span className="text-slate-100 font-semibold">42</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Active groups</span>
              <span className="text-slate-100 font-semibold">OSINT · Web · Pwn</span>
            </div>
          </div>
        </div>

        {/* Bottom promo / info */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-4 text-[11px] text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-1 font-medium">
            For maintainers
          </p>
          <p className="text-slate-100 font-semibold mb-1">
            Ship your open source to hackers.
          </p>
          <p className="text-slate-400">
            Share tools, libraries and labs, get real-world feedback from
            practitioners.
          </p>
        </div>
      </div>
    </aside>
  );
}
