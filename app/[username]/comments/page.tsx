"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { MessageCircle, ArrowLeft, Loader2 } from "lucide-react";

interface UserComment {
  id: number;
  body: string;
  created_at: string;
  updated_at: string | null;
  post_id: number;
  post_slug: string;
  post_title: string;
}

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function UserCommentsPage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = params?.username;

  const [comments, setComments] = useState<UserComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    if (!username) return;

    async function loadInitial() {
      setError(null);
      setLoading(true);
      setSkip(0);
      try {
        const res = await api.get<UserComment[]>(
          `/users/${username}/comments`,
          {
            params: { skip: 0, limit: PAGE_SIZE },
          }
        );
        setComments(res.data);
        setHasMore(res.data.length === PAGE_SIZE);
        setSkip(res.data.length);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.response?.data?.detail || "Failed to load comments."
        );
        setComments([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    }

    loadInitial();
  }, [username]);

  const loadMore = async () => {
    if (!username || loadingMore || !hasMore) return;

    setError(null);
    setLoadingMore(true);
    try {
      const res = await api.get<UserComment[]>(
        `/users/${username}/comments`,
        {
          params: { skip, limit: PAGE_SIZE },
        }
      );
      const newComments = res.data;
      setComments((prev) => [...prev, ...newComments]);
      setSkip(skip + newComments.length);
      setHasMore(newComments.length === PAGE_SIZE);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail || "Failed to load more comments."
      );
    } finally {
      setLoadingMore(false);
    }
  };

  const titleUsername = username || "user";

  return (
    <div className="max-w-5xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 space-y-4">
      {/* Header */}
      <header className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1.5 rounded-full border border-slate-800 bg-slate-950 hover:bg-slate-900 text-slate-300"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-slate-50 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary-300" />
              <span>{titleUsername}&apos;s comments</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              Latest comments this user has made across the site.
            </p>
          </div>
        </div>

        <Link
          href={`/${titleUsername}`}
          className="text-[11px] text-primary-300 hover:text-primary-200"
        >
          View profile
        </Link>
      </header>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-amber-500/40 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-200">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading comments…</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && comments.length === 0 && !error && (
        <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-6 text-center">
          <p className="text-sm text-slate-200 mb-1">
            No comments yet.
          </p>
          <p className="text-xs text-slate-500">
            When this user comments on posts, their activity will appear here.
          </p>
        </div>
      )}

      {/* Comment list */}
      {!loading && comments.length > 0 && (
        <section className="rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
          <ul className="divide-y divide-slate-800/80">
            {comments.map((c) => (
              <li key={c.id} className="px-3 sm:px-4 py-3">
                <div className="flex flex-col gap-1">
                  {/* Post info */}
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/post/${c.post_slug}`}
                      className="text-[11px] sm:text-xs text-primary-300 hover:text-primary-200 line-clamp-1"
                    >
                      {c.post_title || "(untitled post)"}
                    </Link>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {formatDate(c.created_at)}
                    </span>
                  </div>

                  {/* Comment body */}
                  <p className="mt-1 text-xs text-slate-100 whitespace-pre-wrap">
                    {c.body}
                  </p>

                  {/* Action row */}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <Link
                      href={`/post/${c.post_slug}#comment-${c.id}`}
                      className="text-[11px] text-slate-400 hover:text-primary-300"
                    >
                      View in context
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Load more */}
          <div className="px-3 sm:px-4 py-3 border-t border-slate-800">
            {hasMore ? (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-700 bg-slate-950 text-[11px] text-slate-100 py-1.5 hover:border-primary-400 hover:text-primary-200 disabled:opacity-60"
              >
                {loadingMore && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>{loadingMore ? "Loading…" : "Show more comments"}</span>
              </button>
            ) : (
              <p className="text-[10px] text-center text-slate-500">
                No more comments to load.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
