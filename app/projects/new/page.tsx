"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

type ProjectStatus = "idea" | "active" | "maintenance" | "archived";

interface CreatedProjectResponse {
  id: number;
  slug: string;
  title: string;
}

export default function NewProjectPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [techStack, setTechStack] = useState("");
  const [license, setLicense] = useState("");
  const [status, setStatus] = useState<ProjectStatus>("active");
  const [isOpenForContrib, setIsOpenForContrib] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !description.trim()) {
      setError("Project name and description are required.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const techTags =
        techStack
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean) || [];

      // ✅ Projects are created via /posts in backend
      const payload = {
        title: name.trim(),
        body: description.trim(),
        post_type: "project",

        // normal post fields
        is_ctf: false,
        difficulty: null,
        thumbnail_url: null,
        group_id: null,

        // tags in backend expect slug array
        tags: techTags,

        // project fields (from ProjectFields)
        repo_url: repoUrl.trim() || null,
        homepage_url: homepageUrl.trim() || null,
        tech_stack: techTags.join(", ") || null,
        project_category: tagline.trim() || null,
        license: license.trim() || null,
        status,
        looking_for_contributors: isOpenForContrib,
      };

      const res = await api.post<CreatedProjectResponse>("/posts", payload);

      // ✅ Your app uses /post/[slug] everywhere
      router.push(`/post/${res.data.slug}`);
    } catch (err: any) {
      console.error(err);
      const detail =
        err?.response?.data?.detail ||
        "Failed to create project. Please check your input and try again.";
      setError(Array.isArray(detail) ? detail.join(", ") : String(detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto border border-slate-800 rounded-xl bg-slate-900/70 p-5">
      <h1 className="text-lg font-semibold mb-1">Share a new project</h1>
      <p className="text-xs text-slate-400 mb-4">
        Publish your open source tools, labs, CTF frameworks or security
        projects so the community can discover, star and contribute.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Basic info */}
        <div className="space-y-1">
          <label className="block text-slate-200">Project name</label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Ex: DuckyRecon – OSINT automation toolkit"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-slate-200">Short tagline</label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="One line about what this project does"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
          <p className="text-[10px] text-slate-500">
            Shown in cards & lists. Keep it concise.
          </p>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="block text-slate-200">Description</label>
          <textarea
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            rows={8}
            placeholder="Explain what your project does, key features, use cases, how to get started, etc."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Links */}
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-slate-200">Repository URL</label>
            <input
              type="url"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="https://github.com/yourname/ducky-recon"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
            />
            <p className="text-[10px] text-slate-500">
              GitHub, GitLab, Codeberg, etc.
            </p>
          </div>
          <div className="space-y-1">
            <label className="block text-slate-200">Homepage / Docs URL</label>
            <input
              type="url"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="https://duckyrecon.dev/docs"
              value={homepageUrl}
              onChange={(e) => setHomepageUrl(e.target.value)}
            />
          </div>
        </div>

        {/* Tech + license */}
        <div className="space-y-1">
          <label className="block text-slate-200">Tech stack / tags</label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="python, fastapi, nextjs, postgresql, docker"
            value={techStack}
            onChange={(e) => setTechStack(e.target.value)}
          />
          <p className="text-[10px] text-slate-500">
            Comma-separated. Example: <code>python, fastapi, elasticsearch</code>
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-slate-200">Status</label>
            <select
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              <option value="idea">Idea / Planning</option>
              <option value="active">Active development</option>
              <option value="maintenance">Maintenance mode</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="block text-slate-200">License (optional)</label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="MIT, GPL-3.0, Apache-2.0, etc."
              value={license}
              onChange={(e) => setLicense(e.target.value)}
            />
          </div>
        </div>

        {/* Open for contributions */}
        <div className="flex items-center gap-2 mt-1">
          <label className="inline-flex items-center gap-2 text-slate-200">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border border-slate-600 bg-slate-900"
              checked={isOpenForContrib}
              onChange={(e) => setIsOpenForContrib(e.target.checked)}
            />
            <span className="text-xs">
              Open for contributions (show &quot;Looking for contributors&quot;
              badge)
            </span>
          </label>
        </div>

        {error && (
          <p className="text-[11px] text-amber-400 border border-amber-500/30 bg-amber-500/10 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 py-1 rounded-full border border-slate-700 text-slate-200 hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-1 rounded-full bg-primary-500 text-white hover:bg-primary-400 disabled:opacity-60"
          >
            {submitting ? "Publishing…" : "Publish project"}
          </button>
        </div>
      </form>
    </div>
  );
}
