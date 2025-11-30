"use client";

import {
  useEffect,
  useMemo,
  useState,
  Suspense,
  type KeyboardEvent,
  type FormEvent,
  type ComponentType,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import PostCard, { Post } from "@/components/PostCard";
import Link from "next/link";
import {
  Users as UsersIcon,
  FileText,
  Layers,
  Search as SearchIcon,
} from "lucide-react";

/* ---------------- types ---------------- */

interface UserPublic {
  id: number;
  username: string | null;
  full_name: string | null;
  reputation: number;
  bio?: string | null;
  status_text?: string | null;
  avatar_url?: string | null;
}

interface Group {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  is_public: boolean;
  created_at: string;
  created_by: {
    id: number;
    username: string | null;
    full_name: string | null;
  };
  members_count: number;
  avatar_url?: string | null;
  cover_url?: string | null;
}

type Tab = "posts" | "users" | "groups";

/* ---------- media URL helper (same pattern as home/feed/projects) ---------- */

// Prefer NEXT_PUBLIC_API_BASE_URL, fall back to NEXT_PUBLIC_API_URL
const RAW_API_BASE: string =
  (typeof process.env.NEXT_PUBLIC_API_BASE_URL === "string" &&
    process.env.NEXT_PUBLIC_API_BASE_URL.length > 0 &&
    process.env.NEXT_PUBLIC_API_BASE_URL) ||
  (typeof process.env.NEXT_PUBLIC_API_URL === "string" &&
    process.env.NEXT_PUBLIC_API_URL.length > 0 &&
    process.env.NEXT_PUBLIC_API_URL) ||
  "";

const API_BASE =
  RAW_API_BASE.endsWith("/") && RAW_API_BASE.length > 1
    ? RAW_API_BASE.slice(0, -1)
    : RAW_API_BASE;

function resolveMediaUrl(path?: string | null): string | null {
  if (!path) return null;

  // already absolute
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // if we have a base URL, always prefix
  if (API_BASE) {
    if (path.startsWith("/")) return `${API_BASE}${path}`;
    return `${API_BASE}/${path}`;
  }

  // no base configured – return as-is (will hit same-origin /media)
  return path;
}

/* ---------- helpers ---------- */

function initialsOf(name?: string | null) {
  const n = (name || "").trim();
  if (!n) return "U";
  return (
    n
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "U"
  );
}

// Normalise posts so PostCard gets correct URLs
function normalisePosts(raw: Post[]): Post[] {
  return raw.map((p) => ({
    ...p,
    thumbnail_url: resolveMediaUrl(p.thumbnail_url),
    author: {
      ...p.author,
      avatar_url: resolveMediaUrl(p.author.avatar_url),
    },
  }));
}

/* ---------------- main content component ---------------- */

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams.get("q") || "";

  const [tab, setTab] = useState<Tab>("posts");
  const [inputValue, setInputValue] = useState(initialQ);
  const [query, setQuery] = useState(initialQ);

  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasQuery = useMemo(() => !!query.trim(), [query]);

  const tabs: { key: Tab; label: string; icon: ComponentType<any> }[] = [
    { key: "posts", label: "Posts", icon: FileText },
    { key: "users", label: "Profiles", icon: UsersIcon },
    { key: "groups", label: "Groups", icon: Layers },
  ];

  const runSearch = (e?: FormEvent | KeyboardEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();

    if (trimmed) {
      router.replace(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.replace("/search");
    }

    setQuery(trimmed);
  };

  useEffect(() => {
    if (!hasQuery) {
      setPosts([]);
      setUsers([]);
      setGroups([]);
      setError(null);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (tab === "posts") {
          const res = await api.get<Post[]>("/search/posts", {
            params: { q: query },
          });

          // ✅ normalise media URLs for posts (thumb + author avatar)
          setPosts(normalisePosts(res.data));
          setUsers([]);
          setGroups([]);
        } else if (tab === "users") {
          const res = await api.get<UserPublic[]>("/search/users", {
            params: { q: query },
          });

          const patchedUsers = res.data.map((u) => ({
            ...u,
            avatar_url: resolveMediaUrl(u.avatar_url),
          }));

          setUsers(patchedUsers);
          setPosts([]);
          setGroups([]);
        } else {
          const res = await api.get<Group[]>("/search/groups", {
            params: { q: query },
          });

          // ✅ patch group avatar/cover URLs so images show like /groups page
          const patchedGroups = res.data.map((g) => ({
            ...g,
            avatar_url: resolveMediaUrl(g.avatar_url),
            cover_url: resolveMediaUrl(g.cover_url),
          }));

          setGroups(patchedGroups);
          setPosts([]);
          setUsers([]);
        }
      } catch (e: any) {
        console.error("Search error:", e);
        const detail =
          e?.response?.data?.detail ||
          e?.message ||
          "Unable to reach search API. Check backend /search routes, CORS, and NEXT_PUBLIC_API_BASE_URL.";
        setError(detail);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [query, tab, hasQuery]);

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-4">
      {/* Sticky header + search */}
      <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur border-b border-slate-800 -mx-3 sm:mx-0 px-3 sm:px-0 pt-2 pb-3 sm:pt-0 sm:pb-3">
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-100">
              Search
            </h1>
            {hasQuery && (
              <span className="text-[11px] sm:text-xs text-slate-400 truncate max-w-[55%] text-right">
                Results for{" "}
                <span className="text-slate-200 font-medium">"{query}"</span>
              </span>
            )}
          </div>

          {/* Search bar */}
          <form
            onSubmit={runSearch}
            className="
              flex w-full max-w-full items-center
              rounded-full border border-slate-800
              bg-slate-950/80 px-2 py-1
              shadow-sm
              focus-within:border-primary-500
              focus-within:ring-1 focus-within:ring-primary-500/70
              transition
            "
          >
            <SearchIcon className="mr-2 h-4 w-4 flex-shrink-0 text-slate-500" />
            <input
              type="text"
              className="
                min-w-0 flex-1
                bg-transparent
                border-0 outline-none
                px-1 py-1.5
                text-[11px] sm:text-xs text-slate-100
                placeholder:text-slate-500
              "
              placeholder="Search posts, profiles or groups…"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch(e);
              }}
            />
            <button
              type="submit"
              className="
                ml-1 inline-flex flex-shrink-0 items-center justify-center
                rounded-full
                bg-primary-500 px-3 py-1.5
                text-[11px] sm:text-xs font-medium text-white
                hover:bg-primary-400
                active:scale-95
                transition
              "
            >
              <span className="hidden sm:inline">Search</span>
              <SearchIcon className="sm:hidden h-3.5 w-3.5" />
            </button>
          </form>

          {!hasQuery && (
            <p className="text-[11px] sm:text-xs text-slate-500">
              Type something above and press{" "}
              <span className="font-medium">Enter</span> (or tap{" "}
                <span className="font-medium">Search</span>) to look across posts,
              profiles and groups.
            </p>
          )}

          {/* Tabs */}
          <div className="flex gap-1 bg-slate-900/70 border border-slate-800 rounded-full p-1 w-full sm:w-fit">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] sm:text-xs transition ${
                  tab === key
                    ? "bg-primary-500 text-white shadow-sm"
                    : "text-slate-200 hover:bg-slate-800"
                }`}
                aria-pressed={tab === key}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {tab === "posts" ? (
            <>
              <div className="h-24 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              <div className="h-24 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              <div className="h-24 rounded-2xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            </>
          ) : (
            <>
              <div className="h-16 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              <div className="h-16 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
              <div className="h-16 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
            </>
          )}
          <p className="text-[11px] text-slate-400">Loading search results…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="text-[11px] sm:text-xs text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      {/* Empty query */}
      {!loading && !error && !hasQuery && (
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-6 text-center">
          <p className="text-sm text-slate-200 font-medium">
            Nothing to show yet.
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Start by typing a term in the search box above.
          </p>
        </div>
      )}

      {/* POSTS */}
      {!loading && !error && hasQuery && tab === "posts" && (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}

          {posts.length === 0 && (
            <div className="text-center py-8 sm:py-10 border border-slate-800 bg-slate-900/40 rounded-2xl">
              <p className="text-sm text-slate-200 font-medium">
                No matching posts
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Try different keywords or check other tabs.
              </p>
            </div>
          )}
        </div>
      )}

      {/* USERS */}
      {!loading && !error && hasQuery && tab === "users" && (
        <div className="space-y-2">
          {users.map((u) => {
            const name = u.full_name || u.username || "User";
            const handle = u.username ? `@${u.username}` : null;
            return (
              <Link
                key={u.id}
                href={u.username ? `/${u.username}` : "#"}
                className="block border border-slate-800 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 hover:border-primary-500/60 transition p-3"
              >
                <div className="flex items-center gap-3">
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 shrink-0">
                      {initialsOf(name)}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-semibold text-slate-100 truncate">
                        {name}
                      </p>
                      {handle && (
                        <p className="text-[11px] text-slate-400 truncate">
                          {handle}
                        </p>
                      )}
                    </div>

                    {(u.status_text || u.bio) && (
                      <p className="text-[11px] text-slate-300 line-clamp-2 mt-0.5">
                        {u.status_text || u.bio}
                      </p>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="px-2 py-1 rounded-full bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                      Rep ·{" "}
                      <span className="text-slate-100 font-semibold">
                        {u.reputation}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {users.length === 0 && (
            <div className="text-center py-8 sm:py-10 border border-slate-800 bg-slate-900/40 rounded-2xl">
              <p className="text-sm text-slate-200 font-medium">
                No matching profiles
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Check spelling or try another name.
              </p>
            </div>
          )}
        </div>
      )}

      {/* GROUPS (group "profile" = avatar + cover) */}
      {!loading && !error && hasQuery && tab === "groups" && (
        <div className="space-y-2">
          {groups.map((g) => {
            const initial = initialsOf(g.name);

            return (
              <Link
                key={g.id}
                href={`/groups/${g.slug}`}
                className="group block border border-slate-800 rounded-2xl bg-slate-900/60 hover:bg-slate-900/80 hover:border-primary-500/60 transition overflow-hidden"
              >
                {/* Cover strip if present */}
                {g.cover_url && (
                  <div className="h-14 sm:h-16 w-full bg-slate-950">
                    <img
                      src={g.cover_url}
                      alt={`${g.name} cover`}
                      className="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition"
                    />
                  </div>
                )}

                <div className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Avatar (group profile image) */}
                    {g.avatar_url ? (
                      <img
                        src={g.avatar_url}
                        alt={g.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-700 shrink-0 bg-slate-900"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[11px] font-semibold text-slate-100 shrink-0">
                        {initial}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-semibold text-slate-100 truncate">
                              {g.name}
                            </h2>
                            <span
                              className={`text-[10px] px-2 py-[2px] rounded-full border ${
                                g.is_public
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                                  : "bg-slate-950 text-slate-300 border-slate-700"
                              }`}
                            >
                              {g.is_public ? "Public" : "Private"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            /groups/{g.slug}
                          </p>
                        </div>

                        <div className="shrink-0 text-[11px] text-slate-400 text-right">
                          {g.members_count} members
                        </div>
                      </div>

                      {g.description && (
                        <p className="text-[11px] text-slate-300 mt-2 line-clamp-2">
                          {g.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {groups.length === 0 && (
            <div className="text-center py-8 sm:py-10 border border-slate-800 bg-slate-900/40 rounded-2xl">
              <p className="text-sm text-slate-200 font-medium">
                No matching groups
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Try broader terms or check other tabs.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- default export with Suspense ---------------- */

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 py-4 text-[11px] text-slate-400">
          Loading search…
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  );
}
