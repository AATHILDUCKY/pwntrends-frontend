"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Users, Crown } from "lucide-react";

/* ---------- media URL helper (same style as rest of app) ---------- */
const RAW_API_BASE =
  typeof process.env.NEXT_PUBLIC_API_BASE_URL === "string"
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : "";

const API_BASE =
  RAW_API_BASE.endsWith("/") && RAW_API_BASE.length > 1
    ? RAW_API_BASE.slice(0, -1)
    : RAW_API_BASE;

function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!API_BASE) return path;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}

/* ---------------- types ---------------- */
interface Group {
  id: number;
  name: string;
  slug: string;
  members_count: number;
  created_by: { username: string | null };
  avatar_url?: string | null;
}

export default function TopGroupsWidget() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<Group[]>("/groups/top", {
          params: { limit: 5 },
        });

        const fixed = res.data.map((g) => ({
          ...g,
          avatar_url: resolveMediaUrl(g.avatar_url),
        }));

        setGroups(fixed);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/90 via-slate-900/80 to-slate-950/95 shadow-[0_18px_40px_rgba(15,23,42,0.55)] p-4 sm:p-5 space-y-3">
      {/* Header strip */}
      <div className="flex items-center justify-between mb-1">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700/80">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-amber-400/30 blur-sm opacity-60" />
            <Crown className="relative w-4 h-4 text-amber-300" />
          </div>
          <h3 className="text-xs font-semibold tracking-[0.14em] uppercase text-slate-200">
            Top groups
          </h3>
        </div>

        <Link
          href="/groups"
          className="text-[11px] text-primary-300 hover:text-primary-200 underline-offset-2 hover:underline"
        >
          See all →
        </Link>
      </div>

      <p className="text-[11px] text-slate-500">
        High-signal communities for CTFs, tools, OSINT, pwn and more.
      </p>

      {/* Body */}
      <div className="mt-2 space-y-2">
        {/* Loading skeletons (no rank) */}
        {loading && (
          <>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 animate-pulse"
              >
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="h-3 w-3/4 rounded-full bg-slate-800" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-900" />
                </div>
              </div>
            ))}
          </>
        )}

        {/* Groups list (no #rank badge) */}
        {!loading &&
          groups.map((g) => {
            const initial = (g.name?.[0] || "G").toUpperCase();

            return (
              <Link
                key={g.id}
                href={`/groups/${g.slug}`}
                className="group flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2.5 hover:border-primary-500/70 hover:bg-slate-950 transition-colors"
              >
                {/* Avatar */}
                {g.avatar_url ? (
                  <img
                    src={g.avatar_url}
                    alt={g.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0 bg-slate-950"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                    {initial}
                  </div>
                )}

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-slate-100 truncate group-hover:text-primary-200">
                        {g.name}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {g.members_count} members
                        </span>
                        {g.created_by?.username && (
                          <>
                            <span className="w-[2px] h-[2px] rounded-full bg-slate-600" />
                            <span className="truncate">
                              @{g.created_by.username}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

        {!loading && groups.length === 0 && (
          <p className="text-xs text-slate-500">
            No groups yet. Start one and own this space.
          </p>
        )}
      </div>
    </div>
  );
}
