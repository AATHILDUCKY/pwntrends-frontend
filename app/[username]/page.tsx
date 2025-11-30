"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import {
  MoreHorizontal,
  Trash2,
  Award,
  Users,
  UserCheck,
  FileText,
  MessageCircle,
} from "lucide-react";

interface PostSummary {
  id: number;
  slug: string;
  title: string;
  post_type: string;
  thumbnail_url?: string | null;
  view_count: number;
  created_at: string;
}

interface UserPublic {
  id: number;
  username: string | null;
  full_name: string | null;
  reputation: number;
  bio?: string | null;
  status_text?: string | null;
  avatar_url?: string | null;
}

interface UserProfileDetail {
  user: UserPublic;
  recent_posts: PostSummary[];
  followers_count: number;
  following_count: number;
  bookmarks_count: number;
  posts_count: number;
  comments_count: number;
  is_following?: boolean;
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

// Helper to build a full URL for images
function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (!base) return path;

  if (path.startsWith("/")) {
    return `${base}${path}`;
  }

  return `${base}/${path}`;
}

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const username = params?.username;

  const [profile, setProfile] = useState<UserProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [me, setMe] = useState<MeResponse | null>(null);
  const [meLoaded, setMeLoaded] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [statusText, setStatusText] = useState("");

  // Avatar upload
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Post menu (3-dots) state
  const [menuPostId, setMenuPostId] = useState<number | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null);

  // Load profile + current user (for ownership & follow)
  useEffect(() => {
    if (!username) return;

    async function load() {
      setError(null);
      setLoading(true);
      try {
        const [profileRes, meRes] = await Promise.allSettled([
          api.get<UserProfileDetail>(`/users/${username}/profile`),
          api.get<MeResponse>("/auth/me"),
        ]);

        if (profileRes.status === "fulfilled") {
          const p = profileRes.value.data;
          setProfile(p);
          setFullName(p.user.full_name || "");
          setBio(p.user.bio || "");
          setStatusText(p.user.status_text || "");
          if (typeof p.is_following === "boolean") {
            setIsFollowing(p.is_following);
          }
        } else {
          console.error(profileRes.reason);
        }

        if (meRes.status === "fulfilled") {
          const meData = meRes.value.data;
          setMe(meData);
          setIsOwner(
            !!meData.username &&
              !!username &&
              meData.username.toLowerCase() === username.toLowerCase()
          );
        } else {
          setMe(null);
          setIsOwner(false);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
        setMeLoaded(true);
      }
    }

    load();
  }, [username]);

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!profile || !isOwner) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await api.post<UserPublic>("/users/me/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const updatedUser = res.data;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                avatar_url: updatedUser.avatar_url,
              },
            }
          : prev
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail || "Failed to upload avatar. Try again."
      );
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !isOwner) return;

    setError(null);
    setSavingProfile(true);
    try {
      const res = await api.put<UserPublic>("/users/me", {
        full_name: fullName || null,
        bio: bio || null,
        status_text: statusText || null,
      });

      const updated = res.data;
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              user: {
                ...prev.user,
                full_name: updated.full_name,
                bio: updated.bio,
                status_text: updated.status_text,
              },
            }
          : prev
      );
      setEditMode(false);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail || "Failed to save profile changes."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!profile || !isOwner) return;

    const confirmed = window.confirm(
      "Delete this post? This action cannot be undone."
    );
    if (!confirmed) return;

    setError(null);
    setDeletingPostId(postId);

    try {
      await api.delete(`/posts/${postId}`);

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              recent_posts: prev.recent_posts.filter((p) => p.id !== postId),
              posts_count: Math.max(0, prev.posts_count - 1),
            }
          : prev
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail || "Failed to delete post. Try again."
      );
    } finally {
      setDeletingPostId(null);
      setMenuPostId(null);
    }
  };

  const handleToggleFollow = async () => {
    if (!profile) return;

    if (!me) {
      router.push("/auth/login");
      return;
    }

    if (me.id === profile.user.id) return;

    setError(null);
    setFollowBusy(true);

    try {
      if (isFollowing) {
        await api.post(`/users/${profile.user.username}/unfollow`);
        setIsFollowing(false);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followers_count: Math.max(0, prev.followers_count - 1),
              }
            : prev
        );
      } else {
        await api.post(`/users/${profile.user.username}/follow`);
        setIsFollowing(true);
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                followers_count: prev.followers_count + 1,
              }
            : prev
        );
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.detail || "Failed to update follow status."
      );
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-slate-800" />
            <div className="space-y-2 flex-1">
              <div className="h-4 w-1/3 rounded-full bg-slate-800" />
              <div className="h-3 w-1/4 rounded-full bg-slate-900" />
            </div>
          </div>
          <div className="h-3 w-2/3 rounded-full bg-slate-900" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto px-3 py-6">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4">
          <p className="text-xs text-rose-100">User not found.</p>
        </div>
      </div>
    );
  }

  const u = profile.user;
  const avatarSrc = resolveImageUrl(u.avatar_url);
  const showFollowButton = meLoaded && !isOwner && !!u.username;
  const profileUsername = u.username || username || "";

  return (
    <div className="max-w-5xl mx-auto w-full px-3 sm:px-4 lg:px-0 py-4 sm:py-6 space-y-5">
      {/* PROFILE HEADER */}
      <header className="pb-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900/80 to-slate-950 shadow-[0_22px_60px_rgba(15,23,42,0.95)] px-4 py-4 sm:px-5 sm:py-5">
          <div className="pointer-events-none absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_55%),radial-gradient(circle_at_bottom_right,_rgba(129,140,248,0.18),_transparent_55%)]" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="relative inline-block">
                <div className="rounded-full p-[2px] bg-gradient-to-br from-emerald-400/70 via-slate-700 to-sky-500/70">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={u.username || ""}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border border-slate-900 bg-slate-900"
                    />
                  ) : (
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center text-xl font-semibold text-slate-100">
                      {u.username?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                </div>
                {/* Small status dot */}
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.55)]" />
              </div>
              {isOwner && (
                <label className="absolute -bottom-2 right-0 bg-slate-950/95 border border-slate-700 rounded-full px-2 py-[3px] text-[10px] cursor-pointer hover:border-primary-400 hover:text-primary-200 shadow-[0_10px_25px_rgba(15,23,42,0.85)]">
                  {avatarUploading ? "Uploading…" : "Change"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </label>
              )}
            </div>

            {/* Main info */}
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-lg sm:text-xl font-semibold truncate text-slate-50">
                      {u.full_name || u.username}
                    </h1>
                    {isOwner && (
                      <span className="rounded-full border border-emerald-500/50 bg-emerald-500/10 text-[10px] px-2 py-[2px] text-emerald-200">
                        You
                      </span>
                    )}
                  </div>
                  {u.username && (
                    <p className="text-xs text-sky-400">@{u.username}</p>
                  )}
                </div>

                {/* Follow button */}
                {showFollowButton && (
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={followBusy}
                    className={`self-start sm:self-auto text-[11px] px-3 py-1.5 rounded-full border transition inline-flex items-center gap-2 shadow-[0_10px_30px_rgba(15,23,42,0.8)]
                      ${
                        isFollowing
                          ? "border-slate-600 bg-slate-900/90 text-slate-50 hover:bg-slate-800/90"
                          : "border-primary-500 bg-primary-500/15 text-primary-100 hover:bg-primary-500/25"
                      }
                      disabled:opacity-60`}
                  >
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>

              {/* Status & bio */}
              {editMode && isOwner ? (
                <form
                  onSubmit={handleProfileSave}
                  className="space-y-3 mt-2 max-w-xl"
                >
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Full name</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Status</label>
                    <input
                      type="text"
                      placeholder="Short one-line status shown on your profile"
                      className="w-full rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={statusText}
                      onChange={(e) => setStatusText(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-300">Bio</label>
                    <textarea
                      rows={3}
                      className="w-full rounded-md border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell people about your skills, interests, CTF teams, open source projects, etc."
                    />
                  </div>
                  {error && (
                    <p className="text-[11px] text-amber-400">{error}</p>
                  )}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditMode(false)}
                      className="text-[11px] px-3 py-1.5 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-900/80"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="text-[11px] px-3 py-1.5 rounded-full bg-primary-500 text-white hover:bg-primary-400 disabled:opacity-60"
                    >
                      {savingProfile ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-1.5 space-y-2">
                  {u.status_text && (
                    <p className="text-xs text-slate-100">{u.status_text}</p>
                  )}
                  {u.bio && (
                    <p className="text-xs text-slate-300 whitespace-pre-line">
                      {u.bio}
                    </p>
                  )}
                </div>
              )}

              {/* Stats chips */}
              <div className="mt-3">
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {/* Reputation */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-700/80 text-slate-50 shadow-[0_10px_25px_rgba(15,23,42,0.7)]">
                    <Award className="w-3.5 h-3.5 text-amber-300" />
                    <span>Reputation · {u.reputation}</span>
                  </span>

                  {/* Followers */}
                  {profileUsername && (
                    <Link
                      href={`/${profileUsername}/followers`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-200 hover:border-primary-400 hover:text-primary-200"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Followers · {profile.followers_count}</span>
                    </Link>
                  )}

                  {/* Following */}
                  {profileUsername && (
                    <Link
                      href={`/${profileUsername}/following`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-200 hover:border-primary-400 hover:text-primary-200"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Following · {profile.following_count}</span>
                    </Link>
                  )}

                  {/* Posts */}
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-200">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Posts · {profile.posts_count}</span>
                  </span>

                  {/* Comments */}
                  {profileUsername && (
                    <Link
                      href={`/${profileUsername}/comments`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-700 text-slate-200 hover:border-primary-400 hover:text-primary-200"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Comments · {profile.comments_count}</span>
                    </Link>
                  )}
                </div>
              </div>

              {isOwner && !editMode && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setEditMode(true)}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-slate-700 text-slate-200 hover:border-primary-400 hover:text-primary-300"
                  >
                    Edit profile
                  </button>
                </div>
              )}

              {error && !editMode && (
                <p className="mt-2 text-[11px] text-amber-400">{error}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="grid gap-6 md:grid-cols-[2fr,1fr] items-start">
        {/* RECENT POSTS LIST */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Recent activity
              </h2>
              <p className="text-[11px] text-slate-500">
                Latest posts from @{profileUsername}
              </p>
            </div>
            {isOwner && (
              <Link
                href="/post/new"
                className="text-[11px] text-primary-300 hover:text-primary-200 underline-offset-2 hover:underline"
              >
                + Ask / Post
              </Link>
            )}
          </div>

          {profile.recent_posts.length === 0 ? (
            <div className="mt-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-5 text-xs text-slate-400">
              No posts yet.
              {isOwner && (
                <>
                  {" "}
                  Start by asking a question or sharing a write-up.
                </>
              )}
            </div>
          ) : (
            <ul className="rounded-2xl border border-slate-800 bg-slate-950/50 overflow-hidden divide-y divide-slate-800/80">
              {profile.recent_posts.map((p) => {
                const createdDate = new Date(p.created_at);
                const createdLabel = isNaN(createdDate.getTime())
                  ? null
                  : createdDate.toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    });

                const isMenuOpen = menuPostId === p.id;
                const isDeleting = deletingPostId === p.id;
                const thumbSrc = resolveImageUrl(p.thumbnail_url);

                return (
                  <li
                    key={p.id}
                    className="px-3.5 py-3 hover:bg-slate-900/70 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 flex gap-3">
                        {thumbSrc && (
                          <Link
                            href={`/post/${p.slug}`}
                            className="hidden xs:block w-10 h-10 rounded-lg overflow-hidden border border-slate-800 bg-slate-900 flex-shrink-0"
                          >
                            <img
                              src={thumbSrc}
                              alt={p.title}
                              className="w-full h-full object-cover"
                            />
                          </Link>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase tracking-[0.16em] text-primary-400/90">
                              {p.post_type}
                            </span>
                            {createdLabel && (
                              <span className="text-[10px] text-slate-500">
                                · {createdLabel}
                              </span>
                            )}
                          </div>
                          <Link href={`/post/${p.slug}`}>
                            <h3 className="text-[13px] sm:text-sm font-medium text-slate-100 hover:text-primary-300 line-clamp-2">
                              {p.title}
                            </h3>
                          </Link>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full bg-slate-900/70 border border-slate-800 text-[10px] text-slate-400">
                          {p.view_count} views
                        </span>

                        {isOwner && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() =>
                                setMenuPostId(isMenuOpen ? null : p.id)
                              }
                              className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-slate-100"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div className="absolute right-0 mt-1 w-40 rounded-md border border-slate-800 bg-slate-950 shadow-lg z-20">
                                <button
                                  type="button"
                                  onClick={() => handleDeletePost(p.id)}
                                  disabled={isDeleting}
                                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-rose-300 hover:bg-slate-900 disabled:opacity-60"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  {isDeleting ? "Deleting…" : "Delete post"}
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* RIGHT SIDE INFO */}
        <aside className="text-xs text-slate-300 mt-1 md:mt-0">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 md:bg-slate-950/30 md:border-l md:border-slate-800/80 p-3.5 md:pl-4 space-y-2 shadow-[0_14px_35px_rgba(15,23,42,0.8)]">
            <h3 className="text-sm font-semibold text-slate-100">
              About this profile
            </h3>
            <p className="text-[11px] text-slate-300">
              This profile aggregates posts, comments, followers and reputation
              for this user across all groups and topics on PwnTrends.
            </p>
            {isOwner && meLoaded && (
              <p className="text-[11px] text-slate-500">
                Only you can see the edit and delete controls on your own
                profile.
              </p>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
