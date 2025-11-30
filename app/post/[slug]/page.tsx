"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import CommentThread, { Comment } from "@/components/CommentThread";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageCircle,
  Eye,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

/* ---------------- media URL helper ---------------- */

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
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (API_BASE) {
    if (path.startsWith("/")) return `${API_BASE}${path}`;
    return `${API_BASE}/${path}`;
  }
  return path;
}

/* ---------------- types ---------------- */

interface PostDetail {
  id: number;
  slug: string;
  title: string;
  body: string;
  post_type: string;
  is_ctf: boolean;
  difficulty?: string | null;
  thumbnail_url?: string | null;
  group_id?: number | null;
  author: {
    id: number;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  tags: { id: number; name: string; slug: string }[];
  images: { url: string; position: number }[];
  view_count: number;
  created_at: string;
  updated_at: string;
  score: number;
  my_vote?: number | null;
  repo_url?: string | null;
  tech_stack?: string | null;
}

export default function PostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [post, setPost] = useState<PostDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState("");

  const [score, setScore] = useState(0);
  const [myVote, setMyVote] = useState<number>(0);

  // 🖼️ active image index for detail view
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const loadComments = async (postId: number) => {
    const res = await api.get<Comment[]>(`/posts/${postId}/comments`);

    const fixed = res.data.map((c) => ({
      ...c,
      author: {
        ...c.author,
        avatar_url: resolveMediaUrl(c.author?.avatar_url),
      },
    }));

    setComments(fixed);
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get<PostDetail>(`/posts/slug/${slug}`);
        const data = res.data;

        const fixedPost: PostDetail = {
          ...data,
          thumbnail_url: resolveMediaUrl(data.thumbnail_url),
          author: {
            ...data.author,
            avatar_url: resolveMediaUrl(data.author?.avatar_url),
          },
          images: Array.isArray(data.images)
            ? data.images
                .map((img) => ({
                  ...img,
                  url: resolveMediaUrl(img.url) || img.url,
                }))
                .sort((a, b) => a.position - b.position)
            : [],
        };

        setPost(fixedPost);
        setScore(fixedPost.score);
        setMyVote(fixedPost.my_vote ?? 0);
        setActiveImageIndex(0);

        await loadComments(fixedPost.id);
      } catch (e) {
        console.error(e);
        setPost(null);
      } finally {
        setLoading(false);
      }
    }

    if (slug) load();
  }, [slug]);

  const handleVote = async (value: 1 | -1 | 0) => {
    if (!post) return;
    try {
      if (myVote === value) {
        setScore((prev) => prev - value);
        setMyVote(0);
        await api.post(`/posts/${post.id}/vote`, { value: 0 });
      } else {
        setScore((prev) => prev - myVote + value);
        setMyVote(value);
        await api.post(`/posts/${post.id}/vote`, { value });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleComment = async () => {
    if (!post || !commentText.trim()) return;
    await api.post(`/posts/${post.id}/comments`, {
      body: commentText,
      parent_id: null,
    });
    setCommentText("");
    await loadComments(post.id);
  };

  if (loading) {
    return (
      <div className="max-w-full sm:max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-5">
        <p className="text-xs text-slate-400">Loading post…</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-full sm:max-w-2xl mx-auto px-2 sm:px-4 py-4 sm:py-5">
        <p className="text-xs text-slate-400">Post not found.</p>
      </div>
    );
  }

  const created = new Date(post.created_at).toLocaleString();
  const displayName = post.author.full_name || post.author.username || "User";
  const initial =
    (post.author.username || post.author.full_name || "U")[0]?.toUpperCase() ||
    "U";
  const commentsCount = comments.length;

  const typeLabel =
    post.post_type === "question"
      ? "Question"
      : post.post_type === "discussion"
      ? "Discussion"
      : post.post_type === "blog"
      ? "Blog"
      : "Project";

  const images = post.images || [];
  const hasImages = images.length > 0;
  const activeImage = hasImages ? images[activeImageIndex] : null;

  const goPrevImage = () => {
    if (!hasImages) return;
    setActiveImageIndex((idx) =>
      idx === 0 ? images.length - 1 : idx - 1
    );
  };

  const goNextImage = () => {
    if (!hasImages) return;
    setActiveImageIndex((idx) =>
      idx === images.length - 1 ? 0 : idx + 1
    );
  };

  const isActive = (idx: number) => idx === activeImageIndex;

  return (
    // ✅ mobile: max-w-full + smaller side padding (wider look)
    <div className="max-w-full sm:max-w-2xl mx-auto px-2 sm:px-4 py-3 sm:py-5">
      <article className="rounded-2xl border border-slate-800 bg-slate-950/85 shadow-lg shadow-black/40 overflow-hidden">
        {/* HEADER */}
        <div className="px-3 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3 border-b border-slate-800">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {post.author.avatar_url ? (
                <img
                  src={post.author.avatar_url}
                  alt={displayName}
                  className="w-9 h-9 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold">
                  {initial}
                </div>
              )}

              <div className="flex flex-col min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                  {post.author.username ? (
                    <Link
                      href={`/${post.author.username}`}
                      className="text-slate-100 hover:text-primary-300 truncate max-w-[160px]"
                    >
                      @{post.author.username}
                    </Link>
                  ) : (
                    <span className="text-slate-100 truncate max-w-[160px]">
                      {displayName}
                    </span>
                  )}
                  <span className="text-slate-600">•</span>
                  <span className="truncate max-w-[160px]">{created}</span>
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="px-2 py-[2px] rounded-full bg-slate-900 border border-slate-700 text-slate-200 uppercase tracking-wide">
                    {typeLabel}
                  </span>
                  {post.is_ctf && (
                    <span className="px-2 py-[2px] rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                      CTF
                      {post.difficulty && (
                        <span className="capitalize">
                          · {String(post.difficulty).replace("_", " ")}
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center">
              <span className="px-3 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold">
                Score · {score}
              </span>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="px-3 sm:px-5 py-3 sm:py-4 space-y-3">
          <h1 className="text-lg sm:text-xl font-semibold leading-snug text-slate-50">
            {post.title}
          </h1>

          {/* Image carousel */}
          {hasImages && activeImage && (
            <div className="mt-2 space-y-2">
              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <img
                  src={activeImage.url}
                  alt={post.title}
                  className="w-full max-h-[420px] object-contain bg-black/40"
                />

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goPrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/80 border border-slate-800 p-1.5 text-slate-200 hover:bg-slate-900/90"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={goNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/80 border border-slate-800 p-1.5 text-slate-200 hover:bg-slate-900/90"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                      {images.map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 rounded-full transition-all ${
                            isActive(idx)
                              ? "w-5 bg-primary-400"
                              : "w-2 bg-slate-600/70"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {images.length > 1 && (
                <div className="flex gap-2 overflow-x-auto py-1">
                  {images.map((img, idx) => (
                    <button
                      key={img.url + idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`rounded-lg border overflow-hidden flex-shrink-0 ${
                        isActive(idx)
                          ? "border-primary-500"
                          : "border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <img
                        src={img.url}
                        alt={`${post.title} thumbnail ${idx + 1}`}
                        className="h-16 w-20 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Content text */}
          <div className="mt-1 text-[13px] sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {post.body}
          </div>

          {/* Tags + meta */}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10.5px]">
            {post.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-2 py-[2px] rounded-full bg-slate-950 border border-slate-800 text-slate-200"
              >
                #{tag.slug}
              </span>
            ))}

            <span className="ml-auto inline-flex items-center gap-2 text-slate-500 text-[11px]">
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3.5 h-3.5" />
                {commentsCount}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {post.view_count}
              </span>
            </span>
          </div>
        </div>

        {/* VOTES + COMMENT INPUT + THREAD */}
        <div className="px-3 sm:px-5 pb-3 sm:pb-4 pt-2 sm:pt-3 border-t border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-3 text-[11px]">
            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleVote(1)}
                aria-label="Upvote"
                className={`flex items-center justify-center w-8 h-8 rounded-full border transition ${
                  myVote === 1
                    ? "border-primary-500 bg-primary-500/20 text-primary-300"
                    : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-900"
                }`}
              >
                <ArrowBigUp className="w-4 h-4" />
              </button>

              <span className="min-w-[32px] text-center text-slate-100 text-xs font-semibold">
                {score}
              </span>

              <button
                type="button"
                onClick={() => handleVote(-1)}
                aria-label="Downvote"
                className={`flex items-center justify-center w-8 h-8 rounded-full border transition ${
                  myVote === -1
                    ? "border-rose-400 bg-rose-500/15 text-rose-300"
                    : "border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-900"
                }`}
              >
                <ArrowBigDown className="w-4 h-4" />
              </button>
            </div>

            <div className="hidden sm:flex items-center text-[11px] text-slate-500">
              Be constructive. No flags, secrets or sensitive data.
            </div>
          </div>

          {/* COMMENT BOX */}
          <div className="mt-1 rounded-xl bg-slate-950/90 border border-slate-800 px-2 sm:px-3 py-2 sm:py-2.5 space-y-2">
            <textarea
              className="w-full text-xs sm:text-[13px] rounded-md border border-slate-800 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={3}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment…"
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                Keep it friendly and on-topic.
              </span>
              <button
                onClick={handleComment}
                disabled={!commentText.trim()}
                className="px-4 py-1.5 rounded-full bg-primary-500 text-[11px] sm:text-xs text-white hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Comment
              </button>
            </div>
          </div>

          <div className="mt-1">
            <CommentThread
              comments={comments}
              postId={post.id}
              onRefresh={() => loadComments(post.id)}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
