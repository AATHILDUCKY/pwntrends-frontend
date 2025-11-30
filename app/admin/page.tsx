"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import api from "@/lib/api";

import {
  Users as UsersIcon,
  FileText,
  MessageCircle,
  Tag,
  Layers,
  Activity,
  Search,
  Lock,
  Unlock,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type Tab = "overview" | "users" | "posts" | "comments";

interface AdminStats {
  users: { total: number; active: number };
  posts: { total: number };
  comments: { total: number };
  tags: { total: number };
  groups: { total: number };
}

interface User {
  id: number;
  email: string;
  username: string | null;
  full_name: string | null;
  role: string;
  is_active: boolean;
  reputation: number;
  created_at: string;
}

interface Post {
  id: number;
  slug: string;
  title: string;
  post_type: string;
  is_ctf: boolean;
  is_locked: boolean;
  is_deleted: boolean;
  created_at: string;
  author: {
    id: number;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  tags: { id: number; name: string; slug: string }[];
  images: { url: string; position: number }[];
  view_count: number;
  score: number;
  my_vote?: number | null;
}

interface Comment {
  id: number;
  body: string;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
  author: {
    id: number;
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

const PAGE_SIZE = 10;

const PIE_COLORS = ["#22c55e", "#64748b"];
const BAR_COLORS = ["#38bdf8", "#a855f7", "#f97316", "#22c55e"];

function formatDate(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleString();
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("overview");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [users, setUsers] = useState<User[]>([]);
  const [usersPage, setUsersPage] = useState(0);
  const [usersHasMore, setUsersHasMore] = useState(true);
  const [userSearchId, setUserSearchId] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsPage, setPostsPage] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(true);
  const [postSearchId, setPostSearchId] = useState("");
  const [postsLoading, setPostsLoading] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsPage, setCommentsPage] = useState(0);
  const [commentsHasMore, setCommentsHasMore] = useState(true);
  const [commentSearchId, setCommentSearchId] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // ---- Load stats once ----
  useEffect(() => {
    async function loadStats() {
      try {
        setStatsLoading(true);
        const res = await api.get<AdminStats>("/admin/stats");
        setStats(res.data);
      } catch (e: any) {
        console.error(e);
        setError("Failed to load admin stats. Are you an admin?");
      } finally {
        setStatsLoading(false);
      }
    }
    loadStats();
  }, []);

  // ---- Users ----
  async function loadUsers(page: number, append = false) {
    try {
      setUserLoading(true);
      setError(null);
      const res = await api.get<User[]>("/admin/users", {
        params: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      const data = res.data;
      setUsers((prev) => (append ? [...prev, ...data] : data));
      setUsersPage(page);
      setUsersHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
      setError("Failed to load users.");
    } finally {
      setUserLoading(false);
    }
  }

  async function searchUserById(e: FormEvent) {
    e.preventDefault();
    const id = Number(userSearchId.trim());
    if (!userSearchId.trim()) {
      // Clear search → reload first page
      await loadUsers(0, false);
      return;
    }
    if (!Number.isFinite(id)) {
      setError("User ID must be a number.");
      return;
    }
    try {
      setUserLoading(true);
      setError(null);
      const res = await api.get<User>(`/admin/users/${id}`);
      setUsers([res.data]);
      setUsersHasMore(false);
    } catch (e) {
      console.error(e);
      setUsers([]);
      setUsersHasMore(false);
      setError(`No user found with ID ${id}.`);
    } finally {
      setUserLoading(false);
    }
  }

  // ---- Posts ----
  async function loadPosts(page: number, append = false) {
    try {
      setPostsLoading(true);
      setError(null);
      const res = await api.get<Post[]>("/admin/posts", {
        params: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      const data = res.data;
      setPosts((prev) => (append ? [...prev, ...data] : data));
      setPostsPage(page);
      setPostsHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
      setError("Failed to load posts.");
    } finally {
      setPostsLoading(false);
    }
  }

  async function searchPostById(e: FormEvent) {
    e.preventDefault();
    const id = Number(postSearchId.trim());
    if (!postSearchId.trim()) {
      await loadPosts(0, false);
      return;
    }
    if (!Number.isFinite(id)) {
      setError("Post ID must be a number.");
      return;
    }
    try {
      setPostsLoading(true);
      setError(null);
      const res = await api.get<Post>(`/admin/posts/${id}`);
      setPosts([res.data]);
      setPostsHasMore(false);
    } catch (e) {
      console.error(e);
      setPosts([]);
      setPostsHasMore(false);
      setError(`No post found with ID ${id}.`);
    } finally {
      setPostsLoading(false);
    }
  }

  // ---- Comments ----
  async function loadComments(page: number, append = false) {
    try {
      setCommentsLoading(true);
      setError(null);
      const res = await api.get<Comment[]>("/admin/comments", {
        params: { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
      });
      const data = res.data;
      setComments((prev) => (append ? [...prev, ...data] : data));
      setCommentsPage(page);
      setCommentsHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      console.error(e);
      setError("Failed to load comments.");
    } finally {
      setCommentsLoading(false);
    }
  }

  async function searchCommentById(e: FormEvent) {
    e.preventDefault();
    const id = Number(commentSearchId.trim());
    if (!commentSearchId.trim()) {
      await loadComments(0, false);
      return;
    }
    if (!Number.isFinite(id)) {
      setError("Comment ID must be a number.");
      return;
    }
    try {
      setCommentsLoading(true);
      setError(null);
      const res = await api.get<Comment>(`/admin/comments/${id}`);
      setComments([res.data]);
      setCommentsHasMore(false);
    } catch (e) {
      console.error(e);
      setComments([]);
      setCommentsHasMore(false);
      setError(`No comment found with ID ${id}.`);
    } finally {
      setCommentsLoading(false);
    }
  }

  // Load first page when tab changes
  useEffect(() => {
    if (tab === "users") loadUsers(0, false);
    if (tab === "posts") loadPosts(0, false);
    if (tab === "comments") loadComments(0, false);
  }, [tab]);

  // ---- Admin actions (unchanged logic) ----
  const toggleUserActive = async (user: User) => {
    await api.put(`/admin/users/${user.id}`, {
      is_active: !user.is_active,
    });
    setUsers((prev) =>
      prev.map((u) =>
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
      )
    );
  };

  const promoteToModerator = async (user: User) => {
    await api.put(`/admin/users/${user.id}`, {
      role: "moderator",
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: "moderator" } : u))
    );
  };

  const softDeletePost = async (post: Post) => {
    await api.delete(`/admin/posts/${post.id}`);
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, is_deleted: true } : p))
    );
  };

  const toggleLockPost = async (post: Post) => {
    if (post.is_locked) {
      await api.post(`/admin/posts/${post.id}/unlock`);
    } else {
      await api.post(`/admin/posts/${post.id}/lock`);
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, is_locked: !p.is_locked } : p
      )
    );
  };

  const deleteComment = async (comment: Comment) => {
    await api.delete(`/admin/comments/${comment.id}`);
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
  };

  if (error && tab === "overview" && !stats) {
    return (
      <p className="text-xs text-amber-400 border border-amber-500/40 bg-amber-500/10 rounded-md px-3 py-2">
        {error}
      </p>
    );
  }

  const activeUsers = stats?.users.active ?? 0;
  const totalUsers = stats?.users.total ?? 0;
  const inactiveUsers = Math.max(0, totalUsers - activeUsers);

  const userPieData =
    totalUsers > 0
      ? [
          { name: "Active", value: activeUsers },
          { name: "Inactive", value: inactiveUsers },
        ]
      : [];

  const contentBarData = [
    { name: "Posts", value: stats?.posts.total ?? 0 },
    { name: "Comments", value: stats?.comments.total ?? 0 },
    { name: "Tags", value: stats?.tags.total ?? 0 },
    { name: "Groups", value: stats?.groups.total ?? 0 },
  ];

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-400" />
            Admin dashboard
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Admin-only overview of users, content and moderation activity.
          </p>
        </div>
        {stats && (
          <div className="flex gap-3 text-[11px] text-slate-400">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/70 border border-slate-800">
              <Activity className="w-3 h-3 text-emerald-400" />
              {stats.users.total} users
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/70 border border-slate-800">
              <FileText className="w-3 h-3 text-sky-400" />
              {stats.posts.total} posts
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(["overview", "users", "posts", "comments"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full border transition flex items-center gap-1 ${
              tab === t
                ? "bg-primary-500 text-white border-primary-400 shadow-sm shadow-primary-500/40"
                : "border-slate-700 bg-slate-900/70 text-slate-200 hover:border-slate-500"
            }`}
          >
            {t === "overview" && <Activity className="w-3 h-3" />}
            {t === "users" && <UsersIcon className="w-3 h-3" />}
            {t === "posts" && <FileText className="w-3 h-3" />}
            {t === "comments" && <MessageCircle className="w-3 h-3" />}
            {t === "overview"
              ? "Overview"
              : t === "users"
              ? "Users"
              : t === "posts"
              ? "Posts"
              : "Comments"}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === "overview" && (
        <div className="space-y-4">
          {statsLoading && (
            <p className="text-xs text-slate-400">Loading stats…</p>
          )}

          {stats && (
            <>
              {/* Stat cards */}
              <div className="grid gap-3 sm:grid-cols-3 text-xs">
                <div className="border border-slate-800 rounded-xl bg-slate-900/80 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <UsersIcon className="w-3 h-3 text-emerald-400" />
                      Users
                    </span>
                  </div>
                  <p className="text-lg font-semibold text-slate-50">
                    {stats.users.total}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Active:{" "}
                    <span className="text-emerald-300">
                      {stats.users.active}
                    </span>{" "}
                    · Inactive: {inactiveUsers}
                  </p>
                </div>

                <div className="border border-slate-800 rounded-xl bg-slate-900/80 p-4 space-y-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-sky-400" />
                    Content
                  </span>
                  <p className="text-lg font-semibold text-slate-50">
                    {stats.posts.total}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Comments:{" "}
                    <span className="text-slate-200">
                      {stats.comments.total}
                    </span>
                  </p>
                </div>

                <div className="border border-slate-800 rounded-xl bg-slate-900/80 p-4 space-y-2">
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Tag className="w-3 h-3 text-violet-400" />
                    Taxonomy
                  </span>
                  <p className="text-lg font-semibold text-slate-50">
                    {stats.tags.total + stats.groups.total}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Tags: {stats.tags.total} · Groups: {stats.groups.total}
                  </p>
                </div>
              </div>

              {/* Charts */}
              <div className="grid gap-3 md:grid-cols-2">
                {/* Active vs inactive users */}
                <div className="border border-slate-800 rounded-xl bg-slate-900/80 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-100">
                      User activity
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Active vs inactive
                    </span>
                  </div>
                  {userPieData.length === 0 ? (
                    <p className="text-[11px] text-slate-500">
                      Not enough data yet.
                    </p>
                  ) : (
                    <div className="h-48">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={userPieData}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={3}
                          >
                            {userPieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#020617",
                              border: "1px solid #1e293b",
                              fontSize: 11,
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Content distribution */}
                <div className="border border-slate-800 rounded-xl bg-slate-900/80 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-100">
                      Content overview
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Posts / comments / tags / groups
                    </span>
                  </div>
                  <div className="h-48">
                    <ResponsiveContainer>
                      <BarChart data={contentBarData} barSize={26}>
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#9ca3af" }}
                          axisLine={false}
                          tickLine={false}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#020617",
                            border: "1px solid #1e293b",
                            fontSize: 11,
                          }}
                        />
                        <Bar dataKey="value">
                          {contentBarData.map((entry, index) => (
                            <Cell
                              key={`bar-${index}`}
                              fill={BAR_COLORS[index % BAR_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {tab === "users" && (
        <div className="border border-slate-800 rounded-xl bg-slate-900/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-emerald-400" />
              Users (latest {PAGE_SIZE})
            </h2>

            <form
              onSubmit={searchUserById}
              className="flex items-center gap-2 text-xs w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2" />
                <input
                  value={userSearchId}
                  onChange={(e) => setUserSearchId(e.target.value)}
                  placeholder="Search by user ID…"
                  className="w-full rounded-full border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] hover:bg-slate-800"
              >
                Go
              </button>
            </form>
          </div>

          {userLoading && (
            <p className="text-[11px] text-slate-400">Loading users…</p>
          )}

          <div className="overflow-x-auto rounded-lg border border-slate-900">
            <table className="w-full text-[11px]">
              <thead className="text-slate-400 border-b border-slate-800 bg-slate-950/70">
                <tr>
                  <th className="py-1.5 px-2 text-left">User</th>
                  <th className="py-1.5 px-2 text-left">Role</th>
                  <th className="py-1.5 px-2 text-left">Rep</th>
                  <th className="py-1.5 px-2 text-left">Status</th>
                  <th className="py-1.5 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-900">
                    <td className="py-1.5 px-2 align-top">
                      <div className="flex flex-col">
                        <span className="text-slate-200">
                          {u.full_name || u.username || u.email}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          #{u.id} · {u.email}
                        </span>
                      </div>
                    </td>
                    <td className="py-1.5 px-2 align-top text-slate-300">
                      {u.role}
                    </td>
                    <td className="py-1.5 px-2 align-top text-slate-300">
                      {u.reputation}
                    </td>
                    <td className="py-1.5 px-2 align-top">
                      <span
                        className={`px-2 py-[2px] rounded-full text-[10px] ${
                          u.is_active
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-slate-700 text-slate-200"
                        }`}
                      >
                        {u.is_active ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 align-top text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleUserActive(u)}
                          className="px-2 py-[2px] rounded-full border border-slate-700 hover:bg-slate-800"
                        >
                          {u.is_active ? "Block" : "Unblock"}
                        </button>
                        {u.role !== "admin" && (
                          <button
                            onClick={() => promoteToModerator(u)}
                            className="px-2 py-[2px] rounded-full border border-amber-500/60 text-amber-300 hover:bg-amber-500/10"
                          >
                            Make mod
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {!userLoading && users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="py-3 px-2 text-center text-[11px] text-slate-500"
                    >
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {usersHasMore && !userSearchId.trim() && (
            <div className="flex justify-center pt-2">
              <button
                disabled={userLoading}
                onClick={() => loadUsers(usersPage + 1, true)}
                className="px-4 py-1.5 rounded-full border border-slate-700 text-[11px] hover:bg-slate-800 disabled:opacity-60"
              >
                {userLoading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* POSTS TAB */}
      {tab === "posts" && (
        <div className="border border-slate-800 rounded-xl bg-slate-900/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              Posts (latest {PAGE_SIZE})
            </h2>

            <form
              onSubmit={searchPostById}
              className="flex items-center gap-2 text-xs w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2" />
                <input
                  value={postSearchId}
                  onChange={(e) => setPostSearchId(e.target.value)}
                  placeholder="Search by post ID…"
                  className="w-full rounded-full border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] hover:bg-slate-800"
              >
                Go
              </button>
            </form>
          </div>

          {postsLoading && (
            <p className="text-[11px] text-slate-400">Loading posts…</p>
          )}

          <div className="space-y-2 text-xs">
            {posts.map((p) => (
              <div
                key={p.id}
                className="border border-slate-800 rounded-lg bg-slate-950/80 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/post/${p.slug}`}
                    className="text-slate-200 hover:text-primary-300 text-sm font-medium line-clamp-1"
                  >
                    {p.title}
                  </Link>
                  <div className="text-[10px] text-slate-500 mt-1 flex flex-wrap gap-1">
                    <span>#{p.id}</span>
                    {p.author.username && (
                      <span>· @{p.author.username}</span>
                    )}
                    <span>· {p.post_type}</span>
                    <span>· {p.view_count} views</span>
                    {p.is_ctf && <span>· CTF</span>}
                    {p.is_deleted && <span>· deleted</span>}
                    <span>· {formatDate(p.created_at)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => toggleLockPost(p)}
                    className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full border border-slate-700 hover:bg-slate-800 text-[10px]"
                  >
                    {p.is_locked ? (
                      <>
                        <Unlock className="w-3 h-3" />
                        Unlock
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        Lock
                      </>
                    )}
                  </button>
                  {!p.is_deleted && (
                    <button
                      onClick={() => softDeletePost(p)}
                      className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full border border-red-500/60 text-red-300 hover:bg-red-500/10 text-[10px]"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}

            {!postsLoading && posts.length === 0 && (
              <p className="text-[11px] text-slate-500">No posts found.</p>
            )}
          </div>

          {postsHasMore && !postSearchId.trim() && (
            <div className="flex justify-center pt-2">
              <button
                disabled={postsLoading}
                onClick={() => loadPosts(postsPage + 1, true)}
                className="px-4 py-1.5 rounded-full border border-slate-700 text-[11px] hover:bg-slate-800 disabled:opacity-60"
              >
                {postsLoading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* COMMENTS TAB */}
      {tab === "comments" && (
        <div className="border border-slate-800 rounded-xl bg-slate-900/80 p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-violet-400" />
              Comments (latest {PAGE_SIZE})
            </h2>

            <form
              onSubmit={searchCommentById}
              className="flex items-center gap-2 text-xs w-full sm:w-auto"
            >
              <div className="relative flex-1 sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2" />
                <input
                  value={commentSearchId}
                  onChange={(e) => setCommentSearchId(e.target.value)}
                  placeholder="Search by comment ID…"
                  className="w-full rounded-full border border-slate-700 bg-slate-950 pl-8 pr-3 py-1.5 text-[11px] text-slate-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-full border border-slate-700 px-3 py-1 text-[11px] hover:bg-slate-800"
              >
                Go
              </button>
            </form>
          </div>

          {commentsLoading && (
            <p className="text-[11px] text-slate-400">Loading comments…</p>
          )}

          <div className="space-y-2 text-xs">
            {comments.map((c) => (
              <div
                key={c.id}
                className="border border-slate-800 rounded-lg bg-slate-950/80 p-3 flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-slate-500 mb-1 flex flex-wrap gap-1">
                    <span>#{c.id}</span>
                    {c.author.username && (
                      <span>· @{c.author.username}</span>
                    )}
                    <span>· {formatDate(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-slate-200 whitespace-pre-line line-clamp-4">
                    {c.body}
                  </p>
                </div>
                <button
                  onClick={() => deleteComment(c)}
                  className="px-2 py-[2px] rounded-full border border-red-500/60 text-red-300 hover:bg-red-500/10 text-[10px] shrink-0"
                >
                  Delete
                </button>
              </div>
            ))}

            {!commentsLoading && comments.length === 0 && (
              <p className="text-[11px] text-slate-500">No comments found.</p>
            )}
          </div>

          {commentsHasMore && !commentSearchId.trim() && (
            <div className="flex justify-center pt-2">
              <button
                disabled={commentsLoading}
                onClick={() => loadComments(commentsPage + 1, true)}
                className="px-4 py-1.5 rounded-full border border-slate-700 text-[11px] hover:bg-slate-800 disabled:opacity-60"
              >
                {commentsLoading ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* global error (non-blocking) */}
      {error && (
        <p className="text-[11px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-md px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
