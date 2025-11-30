"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { ArrowLeft, Users, Globe2, Lock } from "lucide-react";

export default function CreateGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setLoading(true);
    setErr(null);
    try {
      const res = await api.post("/groups", {
        name: name.trim(),
        description: description.trim() || null,
        bio: bio.trim() || null,
        is_public: isPublic,
      });
      router.push(`/groups/${res.data.slug}`);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Failed to create group");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top bar with back button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center w-8 h-8 rounded-full border border-slate-800 bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-slate-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px] bg-primary-500/10 border border-primary-500/40 text-primary-200 w-fit mb-1">
            Create group
          </span>
          <h1 className="text-xl sm:text-2xl font-semibold">
            Start a new community
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Create a space for specific topics, teams or styles of hacking.
            You can always tweak details later.
          </p>
        </div>
      </div>

      {/* Main card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/80 shadow-lg shadow-black/40 overflow-hidden">
        {/* Header strip */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-xs font-semibold text-slate-200 border border-slate-700">
              GT
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-300">
                Group preview
              </span>
              <span className="text-[11px] text-slate-500">
                Pick a clear name and short description.
              </span>
            </div>
          </div>

          {/* Visibility preview pill */}
          <div className="inline-flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-full border bg-slate-950/80">
            {isPublic ? (
              <>
                <Globe2 className="w-3.5 h-3.5 text-emerald-300" />
                <span className="text-emerald-200">Public</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-300" />
                <span className="text-amber-200">Private</span>
              </>
            )}
          </div>
        </div>

        {/* Form content */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {err && (
            <p className="text-[11px] text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded-md px-3 py-2">
              {err}
            </p>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-200">
                Group name
              </label>
              <span className="text-[10px] text-slate-500">
                Required · Min 3 characters
              </span>
            </div>
            <input
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Web Exploitation · Bug Bounty · OSINT Sri Lanka"
              maxLength={80}
            />
          </div>

          {/* Short description */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-200">
                Short description
              </label>
              <span className="text-[10px] text-slate-500">
                Shown in group cards
              </span>
            </div>
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="One or two lines describing what this group is about."
              maxLength={220}
            />
          </div>

          {/* Bio / about */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-200">
                Bio / about
              </label>
              <span className="text-[10px] text-slate-500">
                Rules, topics, expectations
              </span>
            </div>
            <textarea
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              rows={6}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={`Example:
• Only post web exploitation, XSS, SSRF, etc.
• No doxxing or illegal targets.
• Share writeups, payloads, lab setups and tools.`}
            />
          </div>

          {/* Visibility toggle */}
          <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-3">
            <div className="flex items-start gap-2">
              <div className="mt-[2px]">
                <input
                  id="public-toggle"
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-primary-500 focus:ring-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="public-toggle"
                  className="text-xs font-medium text-slate-200 cursor-pointer"
                >
                  Public group
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {isPublic
                    ? "Anyone can find and view this group. Posts may appear in public feeds."
                    : "Only members can see posts. You’ll control who can join."}
                </p>
              </div>
            </div>

            <div className="hidden sm:flex flex-col items-end text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                Communities grow faster when public.
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
            <p className="text-[11px] text-slate-500">
              You can edit this group’s details, avatar and cover after
              creating it.
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-3 py-1.5 rounded-full border border-slate-700 text-xs text-slate-200 hover:bg-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="px-4 py-1.5 rounded-full bg-primary-500 text-white text-xs sm:text-sm font-medium hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {loading ? "Creating…" : "Create group"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
