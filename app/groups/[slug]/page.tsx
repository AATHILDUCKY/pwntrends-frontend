"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import api, { getAccessToken } from "@/lib/api";
import PostCard, { Post } from "@/components/PostCard";
import {
  Users,
  Lock,
  Globe,
  PlusCircle,
  Image as ImageIcon,
  Pencil,
  LogIn,
  LogOut,
  Search,
} from "lucide-react";

/* ---------------- media URL helper ---------------- */
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
type Role = "user" | "moderator" | "admin";

interface MeResponse {
  id: number;
  username: string | null;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
}

interface Group {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  is_public: boolean;
  created_at: string;
  created_by: {
    id: number;
    username: string | null;
    full_name: string | null;
  };
  members_count: number;
  is_owner?: boolean;
  is_joined?: boolean;
}

interface Member {
  id: number;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  reputation: number;
}

type Tab = "posts" | "about" | "members";

export default function GroupDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();

  const [group, setGroup] = useState<Group | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [membersQ, setMembersQ] = useState("");
  const [tab, setTab] = useState<Tab>("posts");
  const [loading, setLoading] = useState(true);

  const [me, setMe] = useState<MeResponse | null>(null);

  // edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editPublic, setEditPublic] = useState(true);
  const [saving, setSaving] = useState(false);

  const [joinLoading, setJoinLoading] = useState(false);

  // members pagination
  const PAGE_SIZE = 10;
  const [membersSkip, setMembersSkip] = useState(0);
  const [membersHasMore, setMembersHasMore] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await api.get<MeResponse>("/auth/me");
        setMe({
          ...res.data,
          avatar_url: resolveMediaUrl(res.data.avatar_url),
        });
      } catch {
        // ignore
      }
    })();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [gRes, pRes] = await Promise.all([
        api.get<Group>(`/groups/${slug}`),
        api.get<Post[]>(`/groups/${slug}/posts`),
      ]);

      const gFixed: Group = {
        ...gRes.data,
        avatar_url: resolveMediaUrl(gRes.data.avatar_url),
        cover_url: resolveMediaUrl(gRes.data.cover_url),
      };

      const pFixed = pRes.data.map((p: any) => ({
        ...p,
        thumbnail_url: resolveMediaUrl(p.thumbnail_url),
        author: p.author
          ? { ...p.author, avatar_url: resolveMediaUrl(p.author.avatar_url) }
          : p.author,
      }));

      setGroup(gFixed);
      setPosts(pFixed);

      setEditName(gFixed.name);
      setEditDesc(gFixed.description || "");
      setEditBio(gFixed.bio || "");
      setEditPublic(gFixed.is_public);
    } catch (e) {
      console.error(e);
      setGroup(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // members loader with pagination
  async function loadMembers(q?: string, skip = 0, append = false) {
    if (membersLoading) return;
    setMembersLoading(true);

    try {
      const res = await api.get<Member[]>(`/groups/${slug}/members`, {
        params: {
          q: q || undefined,
          skip,
          limit: PAGE_SIZE,
        },
      });

      const fixed = res.data.map((m) => ({
        ...m,
        avatar_url: resolveMediaUrl(m.avatar_url),
      }));

      setMembers((prev) => (append ? [...prev, ...fixed] : fixed));
      setMembersHasMore(fixed.length === PAGE_SIZE);
      setMembersSkip(skip + fixed.length);
    } finally {
      setMembersLoading(false);
    }
  }

  useEffect(() => {
    if (tab === "members") {
      setMembersSkip(0);
      setMembersHasMore(true);
      loadMembers(membersQ, 0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const isOwner = !!group?.is_owner;
  const isJoined = !!group?.is_joined || isOwner;

  async function saveProfile() {
    if (!group) return;
    setSaving(true);
    try {
      const res = await api.put<Group>(`/groups/${group.slug}`, {
        name: editName.trim(),
        description: editDesc.trim() || null,
        bio: editBio.trim() || null,
        is_public: editPublic,
      });
      setGroup({
        ...res.data,
        avatar_url: resolveMediaUrl(res.data.avatar_url),
        cover_url: resolveMediaUrl(res.data.cover_url),
      });
      setEditOpen(false);
    } finally {
      setSaving(false);
    }
  }

  async function uploadFile(kind: "avatar" | "cover", file: File) {
    if (!group) return;
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<Group>(`/groups/${group.slug}/${kind}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setGroup({
      ...res.data,
      avatar_url: resolveMediaUrl(res.data.avatar_url),
      cover_url: resolveMediaUrl(res.data.cover_url),
    });
  }

  async function joinOrLeave() {
    if (!group) return;
    if (!me) return router.push("/auth/login");

    setJoinLoading(true);
    try {
      if (group.is_joined) {
        await api.post(`/groups/${group.slug}/leave`);
      } else {
        await api.post(`/groups/${group.slug}/join`);
      }
      await loadAll();
      if (tab === "members") {
        setMembersSkip(0);
        setMembersHasMore(true);
        loadMembers(membersQ, 0, false);
      }
    } finally {
      setJoinLoading(false);
    }
  }

  function goCreateInGroup(type: "question" | "discussion" | "blog" | "project") {
    if (!me) return router.push("/auth/login");
    if (!isJoined && !group?.is_public) return;
    router.push(`/post/new?type=${type}&group_id=${group?.id}`);
  }

  if (loading) {
    return (
      <p className="text-xs text-slate-400">Loading group…</p>
    );
  }

  if (!group) {
    return <p className="text-xs text-slate-400">Group not found.</p>;
  }

  const adminName =
    group.created_by?.username
      ? `@${group.created_by.username}`
      : group.created_by?.full_name || "Admin";

  return (
    <div className="space-y-4 md:space-y-6">
      {/* COVER + HEADER */}
      <div className="relative border border-slate-800 rounded-2xl overflow-hidden bg-slate-900/60">
        {group.cover_url ? (
          <img
            src={group.cover_url}
            alt="cover"
            className="h-40 sm:h-52 w-full object-cover"
          />
        ) : (
          <div className="h-40 sm:h-52 w-full bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        <div className="absolute inset-x-4 bottom-3 sm:bottom-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            {/* Left: avatar + title */}
            <div className="flex items-end gap-3">
              {group.avatar_url ? (
                <img
                  src={group.avatar_url}
                  alt="avatar"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-slate-950/90 object-cover shadow-xl"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-800/90 border-2 border-slate-950/90 flex items-center justify-center text-xl sm:text-2xl font-bold shadow-xl">
                  {group.name[0]}
                </div>
              )}

              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-semibold">
                    {group.name}
                  </h1>
                  {group.is_public ? (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-100 border border-emerald-500/40">
                      <Globe className="w-3 h-3" /> Public
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-100 border border-amber-500/40">
                      <Lock className="w-3 h-3" /> Private
                    </span>
                  )}
                </div>

                {group.description && (
                  <p className="text-[12px] sm:text-sm text-slate-100 mt-1 line-clamp-2">
                    {group.description}
                  </p>
                )}

                <p className="text-[11px] sm:text-[12px] text-slate-300 mt-1 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {group.members_count} members
                  </span>
                  <span className="hidden sm:inline text-slate-500">•</span>
                  <span className="text-slate-400">Admin: {adminName}</span>
                </p>
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex flex-wrap gap-2 justify-end">
              {!isOwner && (
                <button
                  onClick={joinOrLeave}
                  disabled={joinLoading}
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] sm:text-sm font-medium border shadow-sm transition ${
                    group.is_joined
                      ? "bg-slate-950/90 border-slate-600 text-slate-100 hover:bg-slate-900"
                      : "bg-primary-500 border-primary-400 text-white hover:bg-primary-400"
                  } disabled:opacity-60`}
                >
                  {group.is_joined ? (
                    <>
                      <LogOut className="w-4 h-4" /> Leave
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" /> Join
                    </>
                  )}
                </button>
              )}

              {isOwner && (
                <>
                  <label className="hidden sm:inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-700 cursor-pointer hover:bg-slate-900">
                    <ImageIcon className="w-4 h-4" />
                    Cover
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        uploadFile("cover", e.target.files[0])
                      }
                    />
                  </label>

                  <label className="hidden sm:inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full bg-slate-950/80 border border-slate-700 cursor-pointer hover:bg-slate-900">
                    <ImageIcon className="w-4 h-4" />
                    Avatar
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) =>
                        e.target.files?.[0] &&
                        uploadFile("avatar", e.target.files[0])
                      }
                    />
                  </label>

                  <button
                    className="inline-flex items-center gap-2 text-[11px] px-3 py-1.5 rounded-full bg-primary-500 text-white hover:bg-primary-400"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="w-4 h-4" /> Edit
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE BOX */}
      <div className="border border-slate-800 rounded-2xl bg-slate-950/80 px-3 py-3 sm:px-4 sm:py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-sm text-slate-200">
          Share something with{" "}
          <span className="font-semibold">{group.name}</span>
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            onClick={() => goCreateInGroup("question")}
            disabled={!isJoined && !group.is_public}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] bg-slate-950 border border-slate-700 hover:bg-slate-900 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            Ask
          </button>
          <button
            onClick={() => goCreateInGroup("discussion")}
            disabled={!isJoined && !group.is_public}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] bg-primary-500 text-white hover:bg-primary-400 disabled:opacity-50"
          >
            <PlusCircle className="w-4 h-4" />
            Post
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="sticky top-[64px] z-10">
        <div className="w-full border border-slate-800 bg-slate-950/80 backdrop-blur rounded-full p-1 flex items-center justify-between text-[12px] sm:text-sm gap-1">
          {(["posts", "about", "members"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-3 py-1.5 rounded-full transition text-center ${
                tab === t
                  ? "bg-primary-500/15 text-primary-100 border border-primary-500/60 shadow-sm shadow-primary-500/20"
                  : "text-slate-300 border border-transparent hover:bg-slate-900"
              }`}
            >
              {t === "posts" && "Posts"}
              {t === "about" && "About"}
              {t === "members" && `Members (${group.members_count})`}
            </button>
          ))}
        </div>
      </div>

      {/* POSTS TAB */}
      {tab === "posts" && (
        <div className="space-y-3">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {posts.length === 0 && (
            <p className="text-sm text-slate-500">
              No posts in this group yet.
            </p>
          )}
        </div>
      )}

      {/* ABOUT TAB */}
      {tab === "about" && (
        <div className="border border-slate-800 rounded-2xl bg-slate-950/80 p-4 space-y-3">
          {group.bio ? (
            <p className="text-sm text-slate-200 whitespace-pre-line">
              {group.bio}
            </p>
          ) : (
            <p className="text-sm text-slate-500">No bio yet.</p>
          )}
        </div>
      )}

      {/* MEMBERS TAB */}
      {tab === "members" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
              placeholder="Search members…"
              value={membersQ}
              onChange={(e) => setMembersQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setMembersSkip(0);
                  setMembersHasMore(true);
                  loadMembers(membersQ, 0, false);
                }
              }}
            />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            {members.map((m) => (
              <Link
                key={m.id}
                href={m.username ? `/${m.username}` : "#"}
                className="border border-slate-800 rounded-xl bg-slate-950/80 p-3 flex items-center gap-3 hover:bg-slate-900/80 transition"
              >
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    className="w-9 h-9 rounded-full object-cover"
                    alt="member"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-semibold">
                    {(m.username || m.full_name || "U")[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-slate-100 truncate">
                    {m.full_name || m.username || "User"}
                  </div>
                  {m.username && (
                    <div className="text-[11px] text-slate-400 truncate">
                      @{m.username}
                    </div>
                  )}
                </div>
                <div className="text-[11px] px-2 py-1 rounded-full bg-slate-900 border border-slate-700 text-slate-200">
                  rep {m.reputation}
                </div>
              </Link>
            ))}

            {!membersLoading && members.length === 0 && (
              <p className="text-sm text-slate-500">No members found.</p>
            )}
          </div>

          {membersHasMore && (
            <div className="flex justify-center pt-2">
              <button
                disabled={membersLoading}
                onClick={() => loadMembers(membersQ, membersSkip, true)}
                className="px-4 py-2 rounded-full text-sm bg-slate-950 border border-slate-700 hover:bg-slate-900 disabled:opacity-60"
              >
                {membersLoading ? "Loading…" : "View more"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {editOpen && isOwner && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-xl border border-slate-800 rounded-2xl bg-slate-950 p-4 sm:p-5 space-y-3">
            <h3 className="text-sm font-semibold mb-1">Edit group</h3>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-300">Name</label>
              <input
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-300">Short description</label>
              <textarea
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                rows={3}
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="One or two lines about what this group is for."
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] text-slate-300">
                Bio / rules / details
              </label>
              <textarea
                className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm focus:ring-1 focus:ring-primary-500"
                rows={6}
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Longer description, rules, resources, etc."
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={editPublic}
                onChange={(e) => setEditPublic(e.target.checked)}
                className="rounded border-slate-600 bg-slate-900"
              />
              Public group
              <span className="text-[11px] text-slate-500">
                (Anyone can see posts and join)
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <button
                className="px-4 py-2 rounded-full border border-slate-700 text-sm hover:bg-slate-900"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </button>
              <button
                disabled={saving}
                className="px-4 py-2 rounded-full bg-primary-500 text-white text-sm hover:bg-primary-400 disabled:opacity-60"
                onClick={saveProfile}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
