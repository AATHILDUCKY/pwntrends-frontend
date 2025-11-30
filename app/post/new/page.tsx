"use client";

import { useState, FormEvent, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { ImagePlus, X, Star } from "lucide-react";

type PostType = "question" | "discussion" | "blog";
type Difficulty = "beginner" | "intermediate" | "advanced";

interface CreatedPostResponse {
  id: number;
  slug: string;
  title: string;
}

type UploadedImage = { url: string; position: number };

type PreviewItem = {
  url: string;
  type: "image" | "video";
};

export default function NewPostPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");

  const initialType: PostType =
    typeParam === "question" || typeParam === "blog"
      ? (typeParam as PostType)
      : "discussion";

  const [postType, setPostType] = useState<PostType>(initialType);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isCTF, setIsCTF] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [tags, setTags] = useState("");

  // media
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<PreviewItem[]>([]);
  const [thumbIndex, setThumbIndex] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeLabel = useMemo(() => {
    if (postType === "question") return "Ask a question";
    if (postType === "blog") return "Write a blog";
    return "Create a post";
  }, [postType]);

  // generate preview URLs for images & videos
  useEffect(() => {
    const items: PreviewItem[] = files.map((f) => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video/") ? "video" : "image",
    }));
    setPreviews(items);

    return () => {
      items.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [files]);

  const onPickFiles = (incoming: FileList | null) => {
    if (!incoming) return;

    // allow any images + any videos
    const picked = Array.from(incoming).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );

    if (picked.length === 0) {
      setError("Only image and video files are supported.");
      return;
    }

    setError(null);
    setFiles((prev) => {
      const next = [...prev, ...picked];
      if (prev.length === 0 && next.length > 0) {
        setThumbIndex(0);
      }
      return next;
    });
  };

  const removeImage = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));

    setThumbIndex((current) => {
      if (idx === current) return 0;
      if (idx < current) return Math.max(0, current - 1);
      return current;
    });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError("Title and content are required.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const tagSlugs =
        tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean) || [];

      // 1) create post
      const payload = {
        title: title.trim(),
        body: body.trim(),
        post_type: postType,
        is_ctf: isCTF,
        difficulty: isCTF && difficulty ? difficulty : null,
        thumbnail_url: null,
        group_id: null,
        tags: tagSlugs,
        repo_url: null,
        tech_stack: null,
        project_category: null,
        license: null,
        looking_for_contributors: false,
      };

      const res = await api.post<CreatedPostResponse>("/posts", payload);
      const createdPostId = res.data.id;
      const createdSlug = res.data.slug;

      // 2) upload media (images + videos)
      let uploadedImages: UploadedImage[] = [];
      if (files.length > 0) {
        const form = new FormData();
        files.forEach((f) => form.append("files", f));

        const imgRes = await api.post(
          `/posts/${createdPostId}/images`,
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        uploadedImages = imgRes.data?.images ?? [];
      }

      // 3) set thumbnail (prefer chosen index)
      if (uploadedImages.length > 0) {
        const chosen = uploadedImages[thumbIndex]?.url || uploadedImages[0].url;
        await api.put(`/posts/${createdPostId}`, {
          thumbnail_url: chosen,
        });
      }

      router.push(`/post/${createdSlug}`);
    } catch (err: any) {
      console.error(err);
      const detail =
        err?.response?.data?.detail ||
        "Failed to create post. Please check your input and try again.";
      setError(Array.isArray(detail) ? detail.join(", ") : String(detail));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-3 py-3 sm:py-4">
      {/* HEADER + TYPE SWITCHER */}
      <div className="mb-3 sm:mb-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg sm:text-xl font-semibold text-slate-50">
            {typeLabel}
          </h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[11px] sm:text-xs text-slate-400 hover:text-slate-200 underline-offset-2 hover:underline"
          >
            Cancel
          </button>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-400">
          Share questions, writeups, tooling notes or infosec insights with the
          PwnTrends community.
        </p>

        {/* segmented type control */}
        <div className="inline-flex rounded-full bg-slate-900/70 border border-slate-700 p-1 text-[11px] sm:text-xs">
          {[
            { value: "question", label: "Question" },
            { value: "discussion", label: "Post" },
            { value: "blog", label: "Blog" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPostType(opt.value as PostType)}
              className={`px-3 sm:px-4 py-1 rounded-full transition ${
                postType === opt.value
                  ? "bg-primary-500 text-white shadow shadow-primary-500/40"
                  : "text-slate-300 hover:bg-slate-800/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CARD */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-950/85 shadow-xl shadow-black/40 px-3 sm:px-3 py-3 sm:py-4 space-y-4 text-xs sm:text-[13px]"
      >
        {/* TITLE */}
        <div className="space-y-1.5">
          <label className="block text-slate-200 text-[11px] sm:text-xs">
            Title
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="Ex: HackTheBox – SneakyMailer walkthrough"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* CONTENT */}
        <div className="space-y-1.5">
          <label className="block text-slate-200 text-[11px] sm:text-xs">
            Content
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 min-h-[160px]"
            placeholder="Write your question, walkthrough, notes or explanation here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <p className="text-[10px] text-slate-500">
            You can paste code blocks and writeup steps. Formatting can be
            refined later on render.
          </p>
        </div>

        {/* MEDIA (images + videos) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-slate-200 text-[11px] sm:text-xs">
              Images / videos (optional)
            </label>
            <span className="text-[10px] text-slate-500">
              Large files may take longer to upload
            </span>
          </div>

          <label className="flex flex-col sm:flex-row items-center justify-center gap-2 rounded-xl border border-dashed border-slate-700 bg-slate-950/70 px-3 sm:px-3 py-3 cursor-pointer hover:border-primary-500/70 hover:bg-slate-900/80 transition">
            <ImagePlus className="w-4 h-4 text-slate-300" />
            <div className="flex flex-col items-center sm:items-start">
              <span className="text-xs text-slate-200">
                Click to upload screenshots, diagrams or short clips
              </span>
              <span className="text-[10px] text-slate-500">
                Images and videos are supported (e.g. PNG, JPG, WEBP, MP4)
              </span>
            </div>
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={(e) => onPickFiles(e.target.files)}
              className="hidden"
            />
          </label>

          {previews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-1">
              {previews.map((item, idx) => (
                <div
                  key={item.url}
                  className={`relative rounded-lg overflow-hidden border ${
                    idx === thumbIndex
                      ? "border-primary-500"
                      : "border-slate-800"
                  }`}
                >
                  {item.type === "image" ? (
                    <img
                      src={item.url}
                      alt={`preview-${idx}`}
                      className="h-24 w-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="h-24 w-full object-cover"
                      controls
                      muted
                    />
                  )}

                  {/* thumbnail selector */}
                  <button
                    type="button"
                    onClick={() => setThumbIndex(idx)}
                    className={`absolute left-1 top-1 inline-flex items-center gap-1 rounded-full px-2 py-[2px] text-[10px] ${
                      idx === thumbIndex
                        ? "bg-primary-500 text-white"
                        : "bg-slate-950/80 text-slate-200"
                    }`}
                    title="Set as thumbnail"
                  >
                    <Star className="w-3 h-3" />
                    Thumb
                  </button>

                  {/* remove */}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute right-1 top-1 rounded-full bg-slate-950/80 p-1 text-slate-200 hover:text-rose-300"
                    title="Remove file"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] text-slate-500">
            After publishing, media will be attached and your chosen one will be
            used as the thumbnail (where supported).
          </p>
        </div>

        {/* CTF + DIFFICULTY */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-slate-200">
            <input
              type="checkbox"
              className="h-3 w-3 rounded border border-slate-600 bg-slate-950"
              checked={isCTF}
              onChange={(e) => setIsCTF(e.target.checked)}
            />
            <span className="text-xs sm:text-[13px]">
              This is a CTF / challenge writeup or related post
            </span>
          </label>

          {isCTF && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300">Difficulty:</span>
              <select
                className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px]"
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as Difficulty | "")
                }
              >
                <option value="">Select…</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          )}
        </div>

        {/* TAGS */}
        <div className="space-y-1.5 pt-1">
          <label className="block text-slate-200 text-[11px] sm:text-xs">
            Tags
          </label>
          <input
            type="text"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="ctf, web, pwn, osint, hackthebox"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <p className="text-[10px] text-slate-500">
            Comma-separated. Example: <code>ctf, web, hackthebox</code>
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <p className="text-[11px] text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* ACTIONS */}
        <div className="pt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-3 sm:px-4 py-1.5 rounded-full border border-slate-700 text-slate-200 text-[11px] sm:text-xs hover:bg-slate-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 sm:px-5 py-1.5 rounded-full bg-primary-500 text-white text-[11px] sm:text-xs font-medium hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Publishing…" : "Publish"}
          </button>
        </div>
      </form>
    </div>
  );
}
