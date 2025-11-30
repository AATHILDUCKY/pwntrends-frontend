"use client";

export default function LeftSiteBottom() {
  return (
    <aside className="hidden lg:block w-56 xl:w-64 mt-4">
      <div className="sticky top-[320px] space-y-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-[11px] text-slate-300">
          <h3 className="text-sm font-semibold text-slate-100 mb-1.5">
            Quick tips
          </h3>
          <ul className="space-y-1 list-disc list-inside">
            <li>Tag your posts with tech stack & vuln type.</li>
            <li>Mark write-ups as CTF for better discovery.</li>
            <li>Share PoCs responsibly, avoid live targets.</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
