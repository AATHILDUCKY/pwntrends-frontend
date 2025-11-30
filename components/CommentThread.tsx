"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "@/lib/api";
import {
  MessageCircle,
  CornerDownRight,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";

/* ---------------- media URL helper (same pattern as app/page.tsx) ---------------- */
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

export interface Comment {
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
  // optional permission flags returned by backend
  can_edit?: boolean;
  can_delete?: boolean;
}

interface CommentNode extends Comment {
  children: CommentNode[];
}

/* ---------------- helpers ---------------- */

// Patch avatar URL to full URL
function patchCommentMedia(c: Comment): Comment {
  return {
    ...c,
    author: {
      ...c.author,
      avatar_url: resolveMediaUrl(c.author?.avatar_url),
    },
  };
}

function buildTree(comments: Comment[]): CommentNode[] {
  const map = new Map<number, CommentNode>();
  const roots: CommentNode[] = [];

  comments.forEach((c) => {
    map.set(c.id, { ...c, children: [] });
  });

  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

// Only update state if something really changed
function sameComments(a: Comment[], b: Comment[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].id !== b[i].id) return false;
    if (a[i].updated_at !== b[i].updated_at) return false;
  }
  return true;
}

/* ---------------- comment item ---------------- */

interface CommentItemProps {
  node: CommentNode;
  depth: number;
  postId: number;
  refreshLocal: () => Promise<void>;
  refreshParent?: () => void;
}

const CommentItem = React.memo(function CommentItem({
  node,
  depth,
  postId,
  refreshLocal,
  refreshParent,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);

  // edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(node.body);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // menu state
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const created = new Date(node.created_at).toLocaleString();
  const displayName = node.author.full_name || node.author.username || "User";
  const initial =
    (node.author.username || node.author.full_name || "U")[0]?.toUpperCase() ||
    "U";

  const canEdit = node.can_edit ?? false;
  const canDelete = node.can_delete ?? false;
  const showMenu = canEdit || canDelete;

  // keep editBody in sync if comment text changes from server
  useEffect(() => {
    setEditBody(node.body);
  }, [node.body]);

  // 🔹 Close menu when clicking outside or pressing Escape
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleReply = async () => {
    if (!reply.trim()) return;
    setSubmittingReply(true);
    try {
      await api.post(`/posts/${postId}/comments`, {
        body: reply.trim(),
        parent_id: node.id,
      });
      setReply("");
      setIsReplying(false);

      await refreshLocal();
      refreshParent?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleEditSave = async () => {
    if (!editBody.trim()) return;
    setSubmittingEdit(true);
    try {
      await api.put(`/posts/${postId}/comments/${node.id}`, {
        body: editBody.trim(),
      });
      setIsEditing(false);
      setMenuOpen(false);

      await refreshLocal();
      refreshParent?.();
    } catch (e) {
      console.error(e);
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete) return;
    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    try {
      await api.delete(`/posts/${postId}/comments/${node.id}`);
      setMenuOpen(false);
      await refreshLocal();
      refreshParent?.();
    } catch (e) {
      console.error(e);
    }
  };

  const containerClass =
    depth === 0
      ? "mt-3"
      : "mt-3 pl-4 border-l border-slate-800/70 relative";

  return (
    <div className={containerClass}>
      {/* subtle depth indicator dot for nested replies */}
      {depth > 0 && (
        <span className="absolute -left-[3px] top-4 w-1.5 h-1.5 rounded-full bg-slate-600" />
      )}

      <div className="border border-slate-800 rounded-xl bg-slate-900/70 p-3 hover:bg-slate-900/90 transition-colors">
        <div className="flex items-start gap-2">
          {node.author.avatar_url ? (
            <img
              src={node.author.avatar_url}
              alt={displayName}
              className="w-7 h-7 rounded-full border border-slate-700 object-cover bg-slate-950"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] font-semibold text-slate-200">
              {initial}
            </div>
          )}

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 text-[11px] text-slate-400 mb-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-slate-200 font-medium">
                  {displayName}
                </span>
                {node.author.username && (
                  <span className="text-slate-500">
                    @{node.author.username}
                  </span>
                )}
                <span className="text-slate-600">•</span>
                <span>{created}</span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsReplying((v) => !v)}
                  className="inline-flex items-center gap-1 text-[10px] text-primary-300 hover:text-primary-200"
                >
                  <MessageCircle className="w-3 h-3" />
                  Reply
                </button>

                {showMenu && (
                  <div className="relative" ref={menuRef}>
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      className="p-1 rounded-full hover:bg-slate-800/80 text-slate-400 hover:text-slate-100 transition"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 mt-1 w-36 rounded-md border border-slate-800 bg-slate-950/95 shadow-xl z-20 animate-fade-in">
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditing(true);
                              setMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-900/80"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Edit
                          </button>
                        )}
                        {canDelete && (
                          <button
                            type="button"
                            onClick={handleDelete}
                            className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-rose-300 hover:bg-slate-900/80"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Comment body / edit mode */}
            {isEditing ? (
              <div className="mt-1 space-y-2">
                <textarea
                  className="w-full text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={3}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setEditBody(node.body);
                    }}
                    className="text-[11px] px-3 py-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleEditSave}
                    disabled={submittingEdit}
                    className="text-[11px] px-3 py-1 rounded-full bg-primary-500 text-white hover:bg-primary-400 disabled:opacity-60"
                  >
                    {submittingEdit ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-100 whitespace-pre-line">
                {node.body}
              </p>
            )}

            {/* Reply box */}
            {isReplying && (
              <div className="mt-2">
                <div className="flex items-start gap-2">
                  <CornerDownRight className="w-3 h-3 text-slate-500 mt-1" />
                  <div className="flex-1">
                    <textarea
                      className="w-full text-xs rounded-md border border-slate-700 bg-slate-900 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      rows={3}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder="Write your reply..."
                    />
                    <div className="flex justify-end gap-2 mt-1">
                      <button
                        type="button"
                        onClick={() => setIsReplying(false)}
                        className="text-[11px] px-3 py-1 rounded-full border border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleReply}
                        disabled={submittingReply}
                        className="text-[11px] px-3 py-1 rounded-full bg-primary-500 text-white hover:bg-primary-400 disabled:opacity-60"
                      >
                        {submittingReply ? "Replying…" : "Reply"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* recursive children */}
      {node.children.map((child) => (
        <CommentItem
          key={child.id}
          node={child}
          depth={depth + 1}
          postId={postId}
          refreshLocal={refreshLocal}
          refreshParent={refreshParent}
        />
      ))}
    </div>
  );
});

/* ---------------- thread component ---------------- */

interface CommentThreadProps {
  comments: Comment[];
  postId: number;
  onRefresh?: () => void; // parent refresh (optional)
  autoRefreshMs?: number;
}

export default function CommentThread({
  comments,
  postId,
  onRefresh,
  autoRefreshMs = 5000,
}: CommentThreadProps) {
  // ensure avatar URLs are patched even for initial props
  const [liveComments, setLiveComments] = useState<Comment[]>(() =>
    (comments || []).map(patchCommentMedia)
  );
  const prevRef = useRef<Comment[]>(liveComments);

  // sync local when parent sends a different list
  useEffect(() => {
    const patchedIncoming = (comments || []).map(patchCommentMedia);
    if (!sameComments(liveComments, patchedIncoming)) {
      setLiveComments(patchedIncoming);
      prevRef.current = patchedIncoming;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comments]);

  const refreshLocal = async () => {
    try {
      const res = await api.get<Comment[]>(`/posts/${postId}/comments`);
      const patched = res.data.map(patchCommentMedia);

      if (!sameComments(prevRef.current, patched)) {
        prevRef.current = patched;
        setLiveComments(patched);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-refresh comments (only this panel)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    const tick = () => {
      if (document.visibilityState !== "visible") return;
      refreshLocal();
    };

    tick(); // initial
    timer = setInterval(tick, autoRefreshMs);

    return () => {
      if (timer) clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, autoRefreshMs]);

  const tree = useMemo(() => buildTree(liveComments), [liveComments]);

  return (
    <div className="mt-4 space-y-2">
      {tree.length === 0 && (
        <p className="text-xs text-slate-500">
          No comments yet. Be the first.
        </p>
      )}

      {tree.map((node) => (
        <CommentItem
          key={node.id}
          node={node}
          depth={0}
          postId={postId}
          refreshLocal={refreshLocal}
          refreshParent={onRefresh}
        />
      ))}
    </div>
  );
}
