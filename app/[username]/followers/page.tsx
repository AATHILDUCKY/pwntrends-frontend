"use client";

import { useEffect, useMemo, useState, FormEvent, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  ArrowLeft,
  Search,
  Loader2,
  Users,
  X,
  ChevronDown,
} from "lucide-react";

interface UserPublic {
  id: number;
  username: string | null;
  full_name: string | null;
  reputation: number;
  bio?: string | null;
  status_text?: string | null;
  avatar_url?: string | null;
}

function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (!base) return path;

  if (path.startsWith("/")) return `${base}${path}`;
  return `${base}/${path}`;
}

const PAGE_SIZE = 10;

export default function FollowersPage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = params?.username;

  const [followers, setFollowers] = useState<UserPublic[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [committedSearch, setCommittedSearch] = useState(""); // what we actually query
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFollowers = useCallback(
    async (opts: { replace: boolean; q?: string }) => {
      if (!username) return;

      const skip = opts.replace ? 0 : followers.length;

      if (opts.replace) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      try {
        const res = await api.get<UserPublic[]>(
          `/users/${username}/followers`,
          {
            params: {
              q: opts.q || undefined,
              skip,
              limit: PAGE_SIZE,
            },
          }
        );

        const data = res.data;

        if (opts.replace) setFollowers(data);
        else setFollowers((prev) => [...prev, ...data]);

        setHasMore(data.length === PAGE_SIZE);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.response?.data?.detail || "Failed to load followers."
        );
        if (opts.replace) setFollowers([]);
        setHasMore(false);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [username, followers.length]
  );

  // initial load + reload on username change
  useEffect(() => {
    if (!username) return;
    loadFollowers({ replace: true, q: committedSearch });
  }, [username, committedSearch, loadFollowers]);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (!username) return;
    setCommittedSearch(searchTerm.trim());
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCommittedSearch("");
  };

  const headerSubtitle = useMemo(() => {
    if (committedSearch)
      return `Results for “${committedSearch}”`;
    return "Discover who follows this profile";
  }, [committedSearch]);

  if (!username) {
    return (
      <p className="text-xs text-slate-400">No username provided.</p>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top / Hero */}
      <header className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950 to-slate-900/50 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => router.push(`/${username}`)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </button>

          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <Users className="w-3.5 h-3.5" />
            Followers
          </div>
        </div>

        <div className="mt-3 sm:mt-4">
          <h1 className="text-base sm:text-lg font-semibold text-white">
            Followers of{" "}
            <span className="text-primary-300">@{username}</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {headerSubtitle}
          </p>
        </div>

        {/* Search bar (sticky-ish on mobile feel) */}
        <form
          onSubmit={handleSearch}
          className="mt-3 sm:mt-4 flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search followers by name or username…"
              className="w-full pl-9 pr-9 py-2.5 rounded-full border border-slate-800 bg-slate-950 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search followers"
            />
            {!!searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-800/60 text-slate-300"
                aria-label="Clear search input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="shrink-0 text-xs sm:text-sm px-4 py-2.5 rounded-full bg-primary-500 text-white hover:bg-primary-400 active:scale-[0.98] transition inline-flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            Search
          </button>

          {!!committedSearch && (
            <button
              type="button"
              onClick={clearSearch}
              className="shrink-0 text-xs sm:text-sm px-3 py-2.5 rounded-full border border-slate-700 text-slate-100 hover:bg-slate-900 transition"
            >
              Reset
            </button>
          )}
        </form>
      </header>

      {/* Content */}
      <section className="space-y-3">
        {/* Loading */}
        {loading && followers.length === 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400 px-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading followers…
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-900/40 bg-rose-950/30 p-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* Empty */}
        {!loading && followers.length === 0 && !error && (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center">
            <div className="mx-auto w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center">
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            <p className="mt-2 text-sm text-slate-200 font-medium">
              No followers found
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {committedSearch
                ? "Try a different search term."
                : "This profile has no followers yet."}
            </p>
          </div>
        )}

        {/* Grid list */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {followers.map((u) => {
            const avatar = resolveImageUrl(u.avatar_url);
            const initial =
              (u.username || u.full_name || "U")[0]?.toUpperCase() || "U";

            return (
              <li
                key={u.id}
                className="group rounded-2xl border border-slate-800 bg-slate-950/70 p-3 hover:bg-slate-900/70 hover:border-slate-700 transition"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={u.username || u.full_name || "User"}
                      className="w-11 h-11 rounded-full object-cover border border-slate-700 group-hover:border-primary-500/60 transition"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-slate-800 flex items-center justify-center text-sm font-semibold text-white border border-slate-700">
                      {initial}
                    </div>
                  )}

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/${u.username || ""}`}
                      className="block text-sm font-semibold text-white group-hover:text-primary-300 truncate transition"
                    >
                      {u.full_name || u.username || "User"}
                    </Link>

                    {u.username && (
                      <p className="text-xs text-slate-400 truncate">
                        @{u.username}
                      </p>
                    )}

                    {u.status_text && (
                      <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                        {u.status_text}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer row */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    Rep{" "}
                    <span className="text-slate-200 font-semibold">
                      {u.reputation}
                    </span>
                  </span>

                  <Link
                    href={`/${u.username || ""}`}
                    className="text-primary-300 hover:text-primary-200 inline-flex items-center gap-1"
                  >
                    View profile
                    <ArrowLeft className="w-3 h-3 rotate-180" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Show more */}
        {hasMore && followers.length > 0 && (
          <div className="pt-1 sm:pt-2 flex justify-center">
            <button
              type="button"
              onClick={() =>
                loadFollowers({ replace: false, q: committedSearch })
              }
              disabled={loadingMore}
              className="text-xs sm:text-sm px-5 py-2.5 rounded-full border border-slate-700 text-white hover:bg-slate-900 disabled:opacity-60 active:scale-[0.98] transition inline-flex items-center gap-1.5"
            >
              {loadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading more…
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Show more
                </>
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
