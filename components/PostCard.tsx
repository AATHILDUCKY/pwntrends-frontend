"use client";

import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
} from "react";
import { useRouter } from "next/navigation";
import api, { getAccessToken } from "@/lib/api";
import CommentThread, { Comment } from "@/components/CommentThread";
import Link from "next/link";
import {
  Eye,
  GitBranch,
  FolderGit2,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  SendHorizontal,
  ArrowBigUp,
  ArrowBigDown,
  LogIn,
  X,
  UserPlus,
  UserCheck,
} from "lucide-react";
import {
  FacebookShareButton,
  LinkedinShareButton,
  RedditShareButton,
} from "react-share";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaRedditAlien,
  FaQuora,
} from "react-icons/fa";

export type PostType = "question" | "discussion" | "blog" | "project";

export interface Post {
  id: number;
  slug: string;
  title: string;
  body: string;
  post_type: PostType;
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
  view_count: number;
  created_at: string;
  updated_at: string;
  score: number;
  my_vote?: number | null;
  repo_url?: string | null;
  tech_stack?: string | null;
  comments_count?: number;
  images?: { url: string; position: number }[];
  is_author_followed?: boolean | null;
}

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

export default function PostCard({ post }: { post: Post }) {
  const router = useRouter();

  const [score, setScore] = useState<number>(post.score ?? 0);
  const [myVote, setMyVote] = useState<number>(post.my_vote ?? 0);

  // comments
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);

  // add comment
  const [newComment, setNewComment] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  // show more
  const [bodyExpanded, setBodyExpanded] = useState(false);

  // login modal
  const [showLoginModal, setShowLoginModal] = useState(false);

  // copy link state
  const [copied, setCopied] = useState(false);

  // author follow state
  const [isAuthorFollowed, setIsAuthorFollowed] =
    useState<boolean | null | undefined>(post.is_author_followed);
  const [authorFollowBusy, setAuthorFollowBusy] = useState(false);

  // gallery
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const created = new Date(post.created_at).toLocaleString();
  const displayName = post.author.full_name || post.author.username || "User";
  const initial =
    (post.author.username || post.author.full_name || "U")[0]?.toUpperCase() ||
    "U";

  const typeLabel =
    post.post_type === "question"
      ? "Question"
      : post.post_type === "discussion"
      ? "Discussion"
      : post.post_type === "blog"
      ? "Blog"
      : "Project";

  const isProject = post.post_type === "project";

  const commentsCount =
    typeof post.comments_count === "number"
      ? post.comments_count
      : comments.length;

  // body truncation
  const BODY_LIMIT = 320;
  const { previewBody, isLongBody } = useMemo(() => {
    const txt = post.body || "";
    if (txt.length <= BODY_LIMIT) {
      return { previewBody: txt, isLongBody: false };
    }
    return {
      previewBody: txt.slice(0, BODY_LIMIT).trimEnd() + "…",
      isLongBody: true,
    };
  }, [post.body]);

  const thumbUrl = resolveMediaUrl(post.thumbnail_url);
  const authorAvatar = resolveMediaUrl(post.author.avatar_url);

  // gallery images
  const galleryImages = useMemo(() => {
    if (!Array.isArray(post.images) || post.images.length === 0) {
      return [] as string[];
    }

    return [...post.images]
      .sort((a, b) => a.position - b.position)
      .map((img) => resolveMediaUrl(img.url))
      .filter((u): u is string => !!u);
  }, [post.images]);

  const mainImageUrl =
    galleryImages[activeImageIndex] ?? galleryImages[0] ?? thumbUrl ?? null;

  useEffect(() => {
    if (galleryImages.length === 0 && activeImageIndex !== 0) {
      setActiveImageIndex(0);
    } else if (activeImageIndex >= galleryImages.length) {
      setActiveImageIndex(0);
    }
  }, [galleryImages.length, activeImageIndex]);

  // share URL
  const shareUrl =
    (typeof window !== "undefined" &&
      `${process.env.NEXT_PUBLIC_SITE_URL || window.location.origin}/post/${
        post.slug
      }`) ||
    "";
  const shareTitle = post.title || "Check this post on PwnTrends";

  const quoraShareUrl = `https://www.quora.com/share?url=${encodeURIComponent(
    shareUrl
  )}&title=${encodeURIComponent(shareTitle)}`;

  const openLoginModal = () => setShowLoginModal(true);
  const closeLoginModal = () => setShowLoginModal(false);

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy link", e);
    }
  };

  /**
   * 🔼 / 🔽 VOTING
   *  - Same behaviour as the working post detail page
   *  - Sends { value: -1 | 0 | 1 } to /posts/{id}/vote
   *  - Optimistic UI with rollback on error
   */
  const handleVote = async (value: 1 | -1) => {
    const token = getAccessToken();
    if (!token) {
      // not logged in → show modal and do NOT change UI
      openLoginModal();
      return;
    }

    const previousVote = myVote;
    const previousScore = score;

    let nextVote: -1 | 0 | 1;
    let nextScore: number;

    if (myVote === value) {
      // undo existing vote
      nextVote = 0;
      nextScore = score - value;
    } else {
      // new or changed vote
      nextVote = value;
      nextScore = score - myVote + value;
    }

    // optimistic UI update
    setMyVote(nextVote);
    setScore(nextScore);

    try {
      await api.post(`/posts/${post.id}/vote`, { value: nextVote });
    } catch (e: any) {
      console.error("Vote error:", e?.response?.data || e);

      // rollback UI
      setMyVote(previousVote);
      setScore(previousScore);

      if (e?.response?.status === 401) {
        openLoginModal();
      }
    }
  };

  async function loadComments() {
    if (commentsLoading) return;
    setCommentsLoading(true);
    setCommentsError(null);

    try {
      const res = await api.get<Comment[]>(`/posts/${post.id}/comments`);
      const fixed = res.data.map((c: any) => ({
        ...c,
        author: {
          ...c.author,
          avatar_url: resolveMediaUrl(c.author?.avatar_url),
        },
      }));
      setComments(fixed);
    } catch (err: any) {
      console.error(err);
      setCommentsError(
        err?.response?.data?.detail || "Failed to load comments."
      );
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }

  async function submitNewComment() {
    if (!newComment.trim() || sendingComment) return;
    setSendingComment(true);
    setSendError(null);

    try {
      await api.post(`/posts/${post.id}/comments`, {
        body: newComment.trim(),
        parent_id: null,
      });

      setNewComment("");
      await loadComments();
    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 401) {
        openLoginModal();
        return;
      }
      setSendError(err?.response?.data?.detail || "Failed to post comment.");
    } finally {
      setSendingComment(false);
    }
  }

  useEffect(() => {
    if (showComments && comments.length === 0 && !commentsLoading) {
      loadComments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments]);

  const handleGoLogin = () => {
    closeLoginModal();
    router.push("/auth/login");
  };

  const showAuthorFollowButton =
    typeof isAuthorFollowed === "boolean" && !!post.author.username;

  async function handleToggleFollowAuthor() {
    const username = post.author.username;
    if (!username) return;

    const token = getAccessToken();
    if (!token) {
      openLoginModal();
      return;
    }

    setAuthorFollowBusy(true);
    try {
      if (isAuthorFollowed) {
        await api.post(`/users/${username}/unfollow`);
        setIsAuthorFollowed(false);
      } else {
        await api.post(`/users/${username}/follow`);
        setIsAuthorFollowed(true);
      }
    } catch (e: any) {
      console.error(e);
      if (e?.response?.status === 401) {
        openLoginModal();
      }
    } finally {
      setAuthorFollowBusy(false);
    }
  }

  const hasSlider = galleryImages.length > 1;

  const goPrevImage = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasSlider) return;
    setActiveImageIndex((idx) =>
      idx === 0 ? galleryImages.length - 1 : idx - 1
    );
  };

  const goNextImage = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasSlider) return;
    setActiveImageIndex((idx) =>
      idx === galleryImages.length - 1 ? 0 : idx + 1
    );
  };

  return (
    <>
      {/* Card */}
      <div className="w-full px-2.5 py-2.5 sm:px-3 sm:py-3 rounded-xl bg-slate-950/60 hover:bg-slate-900/70 border border-slate-800 shadow-[0_18px_40px_rgba(15,23,42,0.85)] transition-colors duration-200">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mb-1">
          {authorAvatar ? (
            <img
              src={authorAvatar}
              alt={displayName}
              className="w-6 h-6 rounded-full border border-slate-700 object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-semibold flex-shrink-0">
              {initial}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-1.5 min-w-0 flex-1">
            {post.author.username ? (
              <Link
                href={`/${post.author.username}`}
                className="text-slate-200 hover:text-primary-300 truncate max-w-[55vw] sm:max-w-[160px]"
              >
                @{post.author.username}
              </Link>
            ) : (
              <span className="text-slate-300 truncate max-w-[55vw] sm:max-w-[160px]">
                {displayName}
              </span>
            )}

            <span className="hidden xs:inline text-slate-600">•</span>

            <span className="truncate text-[10px] xs:text-[11px] text-slate-500 max-w-[60vw] sm:max-w-[200px]">
              {created}
            </span>

            <span className="hidden xs:inline text-slate-600">•</span>

            <span className="px-2 py-[1px] rounded-full bg-slate-800 text-[10px] uppercase tracking-wide text-slate-200">
              {typeLabel}
            </span>

            {post.is_ctf && (
              <span className="px-2 py-[1px] rounded-full bg-amber-500/15 text-amber-300 text-[10px] flex items-center gap-1">
                CTF
                {post.difficulty && (
                  <span className="capitalize">
                    · {String(post.difficulty).replace("_", " ")}
                  </span>
                )}
              </span>
            )}
          </div>

          {showAuthorFollowButton && (
            <button
              type="button"
              disabled={authorFollowBusy}
              onClick={handleToggleFollowAuthor}
              className={`group mt-1 xs:mt-0 ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition
                ${
                  isAuthorFollowed
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                    : "border-primary-500 bg-primary-500/10 text-primary-200 hover:bg-primary-500/20"
                }
                disabled:opacity-60 disabled:cursor-not-allowed
              `}
            >
              {authorFollowBusy ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 animate-pulse" />
                  <span>Updating…</span>
                </>
              ) : isAuthorFollowed ? (
                <>
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="group-hover:hidden">Following</span>
                  <span className="hidden group-hover:inline text-rose-300">
                    Unfollow
                  </span>
                </>
              ) : (
                <>
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Follow</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Title */}
        <Link href={`/post/${post.slug}`}>
          <h2 className="text-[14px] sm:text-[15px] font-semibold text-slate-50 hover:text-primary-300 transition-colors line-clamp-3 sm:line-clamp-2">
            {post.title}
          </h2>
        </Link>

        {/* Media */}
        {mainImageUrl && (
          <div className="mt-2">
            <Link
              href={`/post/${post.slug}`}
              className="block rounded-xl overflow-hidden border border-slate-800 bg-slate-950 hover:border-primary-500/60 transition-colors"
            >
              <div className="relative group bg-black/60">
                <img
                  src={mainImageUrl}
                  alt={post.title}
                  className="w-full h-auto object-contain max-h-[65vh]"
                  loading="lazy"
                />

                {hasSlider && (
                  <>
                    <button
                      type="button"
                      onClick={goPrevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/90 border border-slate-800 p-1.5 text-slate-200 hover:bg-slate-900 transition-opacity opacity-0 group-hover:opacity-100"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={goNextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-slate-950/90 border border-slate-800 p-1.5 text-slate-200 hover:bg-slate-900 transition-opacity opacity-0 group-hover:opacity-100"
                      aria-label="Next image"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <div className="pointer-events-none absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                      {galleryImages.map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 rounded-full transition-all ${
                            idx === activeImageIndex
                              ? "w-5 bg-primary-400"
                              : "w-2 bg-slate-600/70"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Link>
          </div>
        )}

        {/* Body */}
        <p className="mt-2 text-[12px] sm:text-[12.5px] text-slate-300 leading-relaxed whitespace-pre-line">
          {bodyExpanded ? post.body : previewBody}
        </p>

        {isLongBody && (
          <button
            type="button"
            onClick={() => setBodyExpanded((v) => !v)}
            className="mt-1 text-[11px] text-primary-300 hover:text-primary-200 inline-flex items-center gap-1"
          >
            {bodyExpanded ? "Show less" : "Show more"}
            {bodyExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        )}

        {/* Project meta */}
        {isProject && (post.repo_url || post.tech_stack) && (
          <div className="mt-2 text-[11px] text-slate-300 flex flex-wrap gap-3">
            {post.repo_url && (
              <a
                href={post.repo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items(center) gap-1 hover:text-primary-300"
              >
                <FolderGit2 className="w-3.5 h-3.5" />
                Repo
              </a>
            )}
            {post.tech_stack && (
              <span className="inline-flex items-center gap-1">
                <GitBranch className="w-3.5 h-3.5" />
                {post.tech_stack}
              </span>
            )}
          </div>
        )}

        {/* Social share */}
        {shareUrl && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
            <span className="mr-1 text-slate-500">Share:</span>

            <FacebookShareButton
              url={shareUrl}
              hashtag="#PwnTrends"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/60 hover:bg-blue-500/25 hover:border-blue-400 transition"
            >
              <FaFacebookF className="w-3.5 h-3.5 text-blue-300" />
            </FacebookShareButton>

            <LinkedinShareButton
              url={shareUrl}
              title={shareTitle}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-sky-500/15 border border-sky-500/60 hover:bg-sky-500/25 hover:border-sky-400 transition"
            >
              <FaLinkedinIn className="w-3.5 h-3.5 text-sky-300" />
            </LinkedinShareButton>

            <RedditShareButton
              url={shareUrl}
              title={shareTitle}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/15 border border-orange-500/60 hover:bg-orange-500/25 hover:border-orange-400 transition"
            >
              <FaRedditAlien className="w-3.5 h-3.5 text-orange-300" />
            </RedditShareButton>

            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-pink-500/15 border border-pink-500/60 hover:bg-pink-500/25 hover:border-pink-400 transition"
              title="Copy link (share on Instagram)"
            >
              <FaInstagram className="w-3.5 h-3.5 text-pink-300" />
            </button>

            <a
              href={quoraShareUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-500/15 border border-red-500/60 hover:bg-red-500/25 hover:border-red-400 transition"
              title="Share on Quora"
            >
              <FaQuora className="w-3.5 h-3.5 text-red-300" />
            </a>

            {copied && (
              <span className="ml-1 text-[10px] text-emerald-400">
                Link copied
              </span>
            )}
          </div>
        )}

        {/* Footer actions incl. live-updating vote counter */}
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
          <div className="inline-flex items-center rounded-full border border-slate-800 bg-slate-950/60 overflow-hidden">
            <button
              type="button"
              onClick={() => handleVote(1)}
              className={`inline-flex items-center justify-center px-3 py-1.5 text-xs transition ${
                myVote === 1
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "hover:bg-slate-900 text-slate-300"
              }`}
              aria-label="Upvote"
            >
              <ArrowBigUp className="w-4 h-4" />
            </button>

            <span className="px-3 py-1.5 text-xs font-semibold text-slate-100 border-x border-slate-800 min-w-[2.5rem] text-center">
              {score}
            </span>

            <button
              type="button"
              onClick={() => handleVote(-1)}
              className={`inline-flex items-center justify-center px-3 py-1.5 text-xs transition ${
                myVote === -1
                  ? "bg-rose-500/15 text-rose-300"
                  : "hover:bg-slate-900 text-slate-300"
              }`}
              aria-label="Downvote"
            >
              <ArrowBigDown className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowComments((v) => !v)}
            className="inline-flex items-center gap-1.5 hover:text-primary-300 transition"
          >
            <MessageCircle className="w-4 h-4" />
            {commentsCount} comments
            {showComments ? (
              <ChevronUp className="w-3.5 h-3.5 ml-0.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
            )}
          </button>

          <span className="inline-flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {post.view_count} views
          </span>

          <Link
            href={`/post/${post.slug}`}
            className="ml-auto text-primary-300 hover:text-primary-200"
          >
            Open →
          </Link>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-slate-800 space-y-3">
            <div className="space-y-2">
              <textarea
                className="w-full text-[12px] rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment…"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                {sendError ? (
                  <p className="text-[11px] text-amber-400">{sendError}</p>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    Be respectful and stay on topic.
                  </span>
                )}
                <button
                  type="button"
                  onClick={submitNewComment}
                  disabled={sendingComment || !newComment.trim()}
                  className="inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full bg-primary-500 text-white hover:bg-primary-400 disabled:opacity-60"
                >
                  <SendHorizontal className="w-4 h-4" />
                  {sendingComment ? "Posting…" : "Post"}
                </button>
              </div>
            </div>

            {commentsLoading && (
              <p className="text-[12px] text-slate-500">Loading comments…</p>
            )}
            {commentsError && (
              <p className="text-[12px] text-amber-400">{commentsError}</p>
            )}
            {!commentsLoading && !commentsError && (
              <CommentThread
                comments={comments}
                postId={post.id}
                onRefresh={loadComments}
              />
            )}
          </div>
        )}
      </div>

      {/* Login modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 py-6 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl p-5 relative">
            <button
              type="button"
              onClick={closeLoginModal}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                <LogIn className="w-4 h-4 text-primary-300" />
              </div>
              <h2 className="text-sm font-semibold text-slate-50">
                Log in to vote & comment
              </h2>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Voting and commenting help surface the best content. Log in or
              create an account to participate and build your reputation on
              PwnTrends.
            </p>

            <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={closeLoginModal}
                className="w-full sm:w-auto text-[11px] px-3 py-2 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-900"
              >
                Maybe later
              </button>
              <button
                type="button"
                onClick={handleGoLogin}
                className="w-full sm:w-auto text-[11px] px-3 py-2 rounded-full bg-primary-500 text-white hover:bg-primary-400 inline-flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Log in / Sign up
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
