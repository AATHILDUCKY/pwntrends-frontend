"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import api, { getAccessToken } from "@/lib/api";
import PostCard, { Post } from "@/components/PostCard";
import { HelpCircle, Megaphone, Boxes } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import TopGroupsWidget from "@/components/TopGroupsWidget";

/* ---------- helpers for media URLs ---------- */

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

type Role = "user" | "moderator" | "admin";

interface MeResponse {
  id: number;
  email: string;
  username: string | null;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
}

type FeedPostType = Post & {
  comments_count?: number;
};

// How many posts per "page" on home
const PAGE_SIZE = 10;

// sessionStorage key
const HOME_STATE_KEY = "pwntrends_home_state_v1";

interface HomeStateSnapshot {
  posts: FeedPostType[];
  hasMore: boolean;
  scrollY: number;
}

/* ---------------- Left sidebar (ads / promos) – desktop only ---------------- */

function LeftAdSidebar() {
  return (
    <aside
      className="
        hidden lg:block h-full
        overflow-y-auto
        pr-1
        [scrollbar-width:none]
        [&::-webkit-scrollbar]:w-0
        [&::-webkit-scrollbar]:h-0
      "
    >
      <div className="space-y-4 py-1">
        {/* Promo / ad card 1 */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 text-xs text-slate-300 shadow-[0_18px_40px_rgba(15,23,42,0.9)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-1">
            Community spotlight
          </p>
          <p className="text-sm font-semibold text-slate-50">
            Feature your CTF writeup
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Soon you&apos;ll be able to pin banners or announcements here for
            your projects and groups.
          </p>
        </div>

        {/* Promo / ad card 2 */}
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-4 text-xs text-slate-300">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400 mb-1">
            Coming soon
          </p>
          <p className="text-sm font-semibold text-slate-50">
            PwnTrends live events
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Live streams, AMAs, and collaborative hacking sessions will appear
            here as they launch.
          </p>
        </div>
      </div>
    </aside>
  );
}

/* ---------------- Right sidebar (widgets) – desktop only ---------------- */

function RightSidebar() {
  return (
    <aside
      className="
        hidden lg:block h-full
        overflow-y-auto
        pl-1
        [scrollbar-width:none]
        [&::-webkit-scrollbar]:w-0
        [&::-webkit-scrollbar]:h-0
      "
    >
      <div className="flex flex-col gap-4 py-1">
        {/* Search widget */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.7)]">
          <h3 className="text-sm font-semibold mb-2 text-slate-100">Search</h3>
          <Suspense
            fallback={
              <div className="text-[11px] text-slate-500">
                Loading search…
              </div>
            }
          >
            <SearchBar />
          </Suspense>
        </div>

        {/* Top groups */}
        <TopGroupsWidget />

        {/* What you can do here */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-4 text-xs text-slate-300 space-y-1">
          <h3 className="font-semibold mb-1 text-sm text-slate-100">
            What can you do here?
          </h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Share CTF writeups, cheat sheets and tooling.</li>
            <li>Publish and rate open source projects.</li>
            <li>Join focused groups for OSINT, web, pwn and more.</li>
            <li>Follow people and build your infosec reputation.</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}

/* ---------------- Home Page ---------------- */

export default function HomePage() {
  const router = useRouter();

  const [latest, setLatest] = useState<FeedPostType[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Sentinel element for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Scroll container (center column only)
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Refs so we can save state on unmount without re-creating listeners
  const latestRef = useRef<FeedPostType[]>([]);
  const hasMoreRef = useRef<boolean>(true);
  const scrollYRef = useRef<number>(0);

  useEffect(() => {
    latestRef.current = latest;
  }, [latest]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  // ---------- load latest posts with skip/limit ----------
  async function fetchPosts(skip: number, replace: boolean) {
    const res = await api.get<FeedPostType[]>("/posts", {
      params: {
        limit: PAGE_SIZE,
        skip,
      },
    });

    const fixed = res.data.map((p) => ({
      ...p,
      thumbnail_url: resolveMediaUrl(p.thumbnail_url),
      author: {
        ...p.author,
        avatar_url: resolveMediaUrl(p.author.avatar_url),
      },
    }));

    // If we got fewer than PAGE_SIZE, there is no more data
    setHasMore(res.data.length === PAGE_SIZE);

    if (replace) {
      setLatest(fixed);
    } else {
      setLatest((prev) => [...prev, ...fixed]);
    }
  }

  // ---------- initial load with sessionStorage restore ----------
  useEffect(() => {
    if (initialLoaded) return;

    async function load() {
      // Try to restore from sessionStorage
      if (typeof window !== "undefined") {
        const raw = window.sessionStorage.getItem(HOME_STATE_KEY);
        if (raw) {
          try {
            const parsed: HomeStateSnapshot = JSON.parse(raw);
            setLatest(parsed.posts || []);
            setHasMore(parsed.hasMore ?? true);
            setInitialLoaded(true);
            setLoadingInitial(false);

            // Restore scroll after paint, in the center scroll container
            requestAnimationFrame(() => {
              const container = scrollContainerRef.current;
              if (container) {
                container.scrollTop = parsed.scrollY || 0;
              }
            });
            return;
          } catch {
            // If parse fails, fall through to fresh fetch
          }
        }
      }

      // No cached state → fresh load
      try {
        setLoadingInitial(true);
        await fetchPosts(0, true);
      } finally {
        setLoadingInitial(false);
        setInitialLoaded(true);
      }
    }

    load();
  }, [initialLoaded]);

  // ---------- infinite scroll observer (on center scroll container) ----------
  useEffect(() => {
    if (!hasMore) return;

    const sentinel = loadMoreRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (!first?.isIntersecting) return;

        if (loadingMore || loadingInitial) return;

        setLoadingMore(true);
        fetchPosts(latestRef.current.length, false)
          .catch(() => {
            // optional: toast/log
          })
          .finally(() => {
            setLoadingMore(false);
          });
      },
      {
        root: container,
        rootMargin: "400px", // preload a bit earlier for smoother feel
        threshold: 0,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loadingInitial]);

  // ---------- capture scroll + save state on unmount ----------
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const handleScroll = () => {
      const current = scrollContainerRef.current;
      if (!current) return;
      scrollYRef.current = current.scrollTop;
    };

    el.addEventListener("scroll", handleScroll);

    return () => {
      el.removeEventListener("scroll", handleScroll);

      // Save snapshot for when user comes back
      try {
        const snapshot: HomeStateSnapshot = {
          posts: latestRef.current,
          hasMore: hasMoreRef.current,
          scrollY: scrollYRef.current,
        };
        if (typeof window !== "undefined") {
          window.sessionStorage.setItem(
            HOME_STATE_KEY,
            JSON.stringify(snapshot)
          );
        }
      } catch {
        // ignore storage errors
      }
    };
  }, []);

  // ---------- check current session ----------
  useEffect(() => {
    async function checkAuth() {
      const token = getAccessToken();
      if (!token) {
        setMe(null);
        setSessionChecked(true);
        return;
      }

      try {
        const res = await api.get<MeResponse>("/auth/me");
        setMe({
          ...res.data,
          avatar_url: resolveMediaUrl(res.data.avatar_url),
        });
      } catch {
        setMe(null);
      } finally {
        setSessionChecked(true);
      }
    }

    checkAuth();
  }, []);

  const displayName = me?.full_name || me?.username || "You";
  const avatarInitial =
    (me?.username || me?.full_name || "U")[0]?.toUpperCase() || "U";

  const goAsk = () =>
    me ? router.push("/post/new?type=question") : router.push("/auth/login");
  const goPost = () =>
    me ? router.push("/post/new?type=discussion") : router.push("/auth/login");
  const goProject = () =>
    me ? router.push("/projects/new") : router.push("/auth/login");

  return (
    <div className="w-full relative">
      {/* subtle global background glows */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-slate-950" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-50 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.12),_transparent_60%)]" />

      {/* Desktop: left ads + main feed + right widgets */}
      <div
        className="
          grid grid-cols-1
          lg:grid-cols-[minmax(0,1.05fr)_minmax(0,2.7fr)_minmax(0,1.1fr)]
          gap-4 lg:gap-6 items-stretch
          h-[calc(91vh-4.5rem)]
          overflow-hidden
          w-full max-w-full lg:max-w-7xl mx-auto
          px-1 sm:px-3 lg:px-4
        "
      >
        {/* Left sidebar */}
        <LeftAdSidebar />

        {/* Main column: ONLY this drives feed scroll state */}
        <div
          ref={scrollContainerRef}
          className="
            min-w-0 space-y-5 h-full
            overflow-y-auto
            pr-1
            scroll-smooth
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:w-0
            [&::-webkit-scrollbar]:h-0
          "
        >
          {/* Create box / hero */}
          <section className="rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 shadow-[0_18px_45px_rgba(15,23,42,0.85)] px-3.5 py-3.5 sm:px-4 sm:py-4 relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-60 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.12),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(129,140,248,0.16),_transparent_55%)]" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-[0.16em] text-emerald-200">
                      Offensive sec community
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-semibold text-slate-50">
                    Welcome to PwnTrends
                  </h1>
                  <p className="text-[11px] sm:text-xs text-slate-300 mt-1">
                    Ask questions, drop CTF write-ups, and share your
                    offensive-sec projects with a focused technical community.
                  </p>
                </div>
              </div>

              {/* top row: avatar + fake input */}
              <div
                className="flex items-center gap-3 cursor-pointer active:scale-[0.99] transition-transform"
                onClick={goAsk}
              >
                {me?.avatar_url ? (
                  <img
                    src={me.avatar_url}
                    alt={displayName}
                    className="w-9 h-9 rounded-full border border-slate-700 object-cover bg-slate-900"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
                    {avatarInitial}
                  </div>
                )}

                <div className="flex-1">
                  <div className="w-full rounded-full bg-slate-950/90 px-4 py-2 text-[13px] text-slate-400 border border-slate-700 text-left">
                    What do you want to ask or share?
                  </div>
                </div>
              </div>

              {/* bottom row: actions */}
              <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goAsk();
                    }}
                    className="inline-flex items-center gap-1 hover:text-slate-100"
                  >
                    <HelpCircle className="w-4 h-4" />
                    <span className="hidden xs:inline">Ask</span>
                  </button>

                  <span className="h-4 w-px bg-slate-700" />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goPost();
                    }}
                    className="inline-flex items-center gap-1 hover:text-slate-100"
                  >
                    <Megaphone className="w-4 h-4" />
                    <span className="hidden xs:inline">Post</span>
                  </button>

                  <span className="h-4 w-px bg-slate-700" />

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      goProject();
                    }}
                    className="inline-flex items-center gap-1 hover:text-slate-100"
                  >
                    <Boxes className="w-4 h-4" />
                    <span className="hidden xs:inline">Project</span>
                  </button>
                </div>

                {!sessionChecked ? (
                  <span className="text-slate-400/80 text-[10px]">
                    Checking session…
                  </span>
                ) : me ? (
                  <span className="text-slate-400 hidden sm:inline text-[11px]">
                    Posting as{" "}
                    <span className="text-slate-100 font-medium">
                      {displayName}
                    </span>
                  </span>
                ) : (
                  <span className="text-slate-400 hidden sm:inline text-[11px]">
                    <span className="text-slate-100 font-medium">Log in</span>{" "}
                    to ask or share.
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Latest posts (global, no feed algo) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-semibold text-slate-100">
                Latest from the community
              </h2>
              <button
                type="button"
                onClick={() => router.push("/feed")}
                className="text-[11px] sm:text-xs text-primary-300 hover:text-primary-200 underline-offset-2 hover:underline"
              >
                View your feed
              </button>
            </div>

            {loadingInitial && (
              <p className="text-xs text-slate-400">Loading latest posts…</p>
            )}

            {!loadingInitial && latest.length === 0 && (
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800 px-4 py-6 text-center">
                <p className="text-sm text-slate-200 mb-1">No posts yet.</p>
                <p className="text-xs text-slate-500">
                  Be the first to ask a question or share a write-up.
                </p>
              </div>
            )}

            {!loadingInitial &&
              latest.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl bg-slate-900/85 border border-slate-800 shadow-[0_14px_35px_rgba(15,23,42,0.75)] overflow-hidden"
                >
                  <PostCard post={post} />
                </div>
              ))}

            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="h-8 w-full" />

            {loadingMore && latest.length > 0 && (
              <p className="text-[11px] text-slate-500 text-center pb-4">
                Loading more posts…
              </p>
            )}

            {!hasMore && latest.length > 0 && (
              <p className="text-[11px] text-slate-500 text-center pb-4">
                You&apos;re all caught up.
              </p>
            )}
          </section>
        </div>

        {/* Right sidebar */}
        <RightSidebar />
      </div>
    </div>
  );
}
