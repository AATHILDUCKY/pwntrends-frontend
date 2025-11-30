"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import PostCard, { Post } from "@/components/PostCard";
import { Search } from "lucide-react";

/* ---------- helpers for media URLs (same pattern as home/feed) ---------- */

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

export default function ProjectsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Helper to normalise media URLs on posts before storing
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

  // Load latest projects (default view)
  async function loadLatestProjects() {
    try {
      const res = await api.get<Post[]>("/posts", {
        params: { post_type: "project", limit: 50 },
      });
      setPosts(normalisePosts(res.data));
    } catch (err) {
      console.error("Failed to load latest projects", err);
      setPosts([]);
    }
  }

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        await loadLatestProjects();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Handle search input change – uses backend advanced search
  const handleSearchChange = async (value: string) => {
    const q = value;
    const trimmed = q.trim();
    setQuery(q);

    // If query is empty, reset to latest projects
    if (!trimmed) {
      setSearchLoading(true);
      try {
        await loadLatestProjects();
      } finally {
        setSearchLoading(false);
      }
      return;
    }

    setSearchLoading(true);
    try {
      const res = await api.get<Post[]>("/search/projects", {
        params: { q: trimmed, limit: 50 },
      });
      setPosts(normalisePosts(res.data));
    } catch (err) {
      console.error("Project search failed", err);
      // keep previous list if search fails
    } finally {
      setSearchLoading(false);
    }
  };

  const isBusy = loading || searchLoading;

  return (
    <div className="flex justify-center px-3 sm:px-4">
      <div className="w-full max-w-4xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-slate-50">
              Open source projects
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
              Discover, share and track security tools, labs, scripts and
              research projects from the PwnTrends community.
            </p>
          </div>

          <Link
            href="/projects/new"
            className="hidden sm:inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs bg-primary-500 text-white hover:bg-primary-400 transition"
          >
            + Share project
          </Link>
        </div>

        {/* Mobile CTA */}
        <div className="sm:hidden">
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center w-full rounded-full px-3 py-2 text-xs bg-primary-500 text-white hover:bg-primary-400 transition"
          >
            + Share a new project
          </Link>
        </div>

        {/* Search projects (server-side advanced search) */}
        <div className="mt-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search projects by title, description, or related keywords..."
              className="w-full rounded-full border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <p className="mt-1 text-[10px] text-slate-500">
            Powered by an advanced TF-IDF search over project titles & content.
          </p>
        </div>

        {/* States */}
        {isBusy && (
          <p className="text-xs text-slate-400">
            {searchLoading ? "Searching projects…" : "Loading projects…"}
          </p>
        )}

        {!isBusy && posts.length === 0 && (
          <div className="rounded-xl bg-slate-950/60 px-4 py-6 text-center border border-slate-800">
            <p className="text-sm text-slate-200 mb-1">No projects found.</p>
            <p className="text-xs text-slate-500 mb-3">
              Try a different keyword or be the first to showcase your security
              tool, script or research project.
            </p>
            <Link
              href="/projects/new"
              className="inline-flex items-center justify-center rounded-full px-4 py-1.5 text-xs bg-primary-500 text-white hover:bg-primary-400 transition"
            >
              Share your project
            </Link>
          </div>
        )}

        {/* Project list */}
        <div className="space-y-3">
          {!isBusy &&
            posts.map((post) => (
              <div
                key={post.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 shadow-sm overflow-hidden"
              >
                <PostCard post={post} />
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
