"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Users, Globe2, Lock } from "lucide-react";

interface Group {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_public: boolean;
  avatar_url?: string | null;
  cover_url?: string | null;
  created_at: string;
  created_by: {
    id: number;
    username: string | null;
    full_name: string | null;
  };
  members_count: number;
}

/* ---------- media URL helper ---------- */
const RAW_API_BASE =
  typeof process.env.NEXT_PUBLIC_API_BASE_URL === "string"
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : "";

const API_BASE =
  RAW_API_BASE.endsWith("/") && RAW_API_BASE.length > 1
    ? RAW_API_BASE.slice(0, RAW_API_BASE.length - 1)
    : RAW_API_BASE;

function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!API_BASE) return path;
  if (path.startsWith("/")) return `${API_BASE}${path}`;
  return `${API_BASE}/${path}`;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<Group[]>("/groups/top", {
          params: { limit: 20 },
        });

        const patched = res.data.map((g) => ({
          ...g,
          avatar_url: resolveMediaUrl(g.avatar_url),
          cover_url: resolveMediaUrl(g.cover_url),
        }));

        setGroups(patched);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold mb-1">
            Top groups
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 max-w-xl">
            Join focused groups for CTF, OSINT, web security, pwn, reverse
            engineering and more. Follow the right groups to shape your feed.
          </p>
        </div>

        <Link
          href="/groups/new"
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500 text-white text-xs hover:bg-primary-400 shadow-sm shadow-primary-500/30"
        >
          + Create group
        </Link>
      </div>

      {/* Mobile create CTA */}
      <Link
        href="/groups/new"
        className="sm:hidden block text-[11px] text-primary-300 hover:text-primary-200 underline underline-offset-2"
      >
        + Create a new group
      </Link>

      {/* Loading state */}
      {loading && (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-900 bg-slate-950/60 p-4 animate-pulse space-y-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-32 bg-slate-800 rounded" />
                  <div className="h-2 w-20 bg-slate-900 rounded" />
                </div>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded" />
              <div className="h-2 w-3/4 bg-slate-900 rounded" />
              <div className="flex justify-between items-center text-[10px]">
                <div className="h-2 w-16 bg-slate-900 rounded" />
                <div className="h-2 w-20 bg-slate-900 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && groups.length === 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-6 text-center">
          <p className="text-sm text-slate-200 mb-1">
            No groups found yet.
          </p>
          <p className="text-xs text-slate-500">
            Start the first community by creating a new group for your niche.
          </p>
        </div>
      )}

      {/* Groups grid */}
      {!loading && groups.length > 0 && (
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {groups.map((g) => {
            const initial = g.name[0]?.toUpperCase() || "G";
            const isPublic = g.is_public;

            return (
              <Link
                key={g.id}
                href={`/groups/${g.slug}`}
                className="group relative rounded-2xl border border-slate-900 bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950/90 p-4 overflow-hidden hover:border-primary-500/60 hover:shadow-[0_0_25px_rgba(56,189,248,0.15)] transition"
              >
                {/* subtle top gradient strip */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-sky-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />

                <div className="flex items-start gap-3 mb-3">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    {g.avatar_url ? (
                      <img
                        src={g.avatar_url}
                        alt={g.name}
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-slate-700 object-cover bg-slate-900"
                      />
                    ) : (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold text-slate-100 border border-slate-700">
                        {initial}
                      </div>
                    )}
                    <span className="absolute -bottom-1 -right-1 text-[9px] px-1.5 py-[1px] rounded-full bg-slate-950 border border-slate-700 text-slate-300 group-hover:border-primary-500/60">
                      {isPublic ? "PUB" : "PRV"}
                    </span>
                  </div>

                  {/* Title + description */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h2 className="text-sm font-semibold truncate text-slate-50">
                        {g.name}
                      </h2>
                      <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-[1px] rounded-full bg-slate-900 border border-slate-800 text-slate-300">
                        {isPublic ? (
                          <>
                            <Globe2 className="w-3 h-3" />
                            Public
                          </>
                        ) : (
                          <>
                            <Lock className="w-3 h-3" />
                            Private
                          </>
                        )}
                      </span>
                    </div>

                    {g.description && (
                      <p className="text-[11px] text-slate-300 line-clamp-3">
                        {g.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Meta row */}
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>{g.members_count} members</span>
                  </div>

                  {g.created_by?.username && (
                    <span className="truncate text-right">
                      by{" "}
                      <span className="text-slate-200">
                        @{g.created_by.username}
                      </span>
                    </span>
                  )}
                </div>

                {/* subtle bottom hint */}
                <div className="mt-2 text-[10px] text-slate-500 flex justify-end">
                  <span className="opacity-0 group-hover:opacity-100 transition">
                    Tap to view group →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
