"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { Search as SearchIcon } from "lucide-react";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initial = searchParams.get("q") || "";
  const [q, setQ] = useState(initial);

  useEffect(() => {
    setQ(initial);
  }, [initial]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const isEmpty = !q.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="
        flex w-full max-w-full items-center
        rounded-full border border-slate-800
        bg-slate-950/80 px-2 py-1
        shadow-sm
        focus-within:border-primary-500
        focus-within:ring-1 focus-within:ring-primary-500/70
        transition
      "
    >
      {/* Left icon */}
      <SearchIcon className="mr-2 h-4 w-4 flex-shrink-0 text-slate-500" />

      {/* Input */}
      <input
        className="
          min-w-0 flex-1
          bg-transparent
          border-none outline-none
          px-1 py-1.5
          text-[11px] sm:text-xs text-slate-100
          placeholder:text-slate-500
        "
        placeholder="Search posts, users, groups…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {/* Button */}
      <button
        type="submit"
        disabled={isEmpty}
        className="
          ml-1 inline-flex flex-shrink-0 items-center justify-center
          rounded-full
          bg-primary-500 px-3 py-1.5
          text-[11px] sm:text-xs font-medium text-white
          hover:bg-primary-400
          active:scale-95
          transition
          disabled:opacity-60 disabled:cursor-not-allowed
        "
      >
        <span className="hidden sm:inline">Search</span>
        <SearchIcon className="sm:hidden h-3.5 w-3.5" />
      </button>
    </form>
  );
}
