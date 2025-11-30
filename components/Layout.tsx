// /components/Layout.tsx
"use client";

import { Suspense } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, List, PenSquare, Boxes, Users } from "lucide-react";
import Navbar from "./Navbar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const isSearch = pathname === "/search";
  const isFeed = pathname === "/feed" || pathname === "/";
  const isProjects = pathname?.startsWith("/projects");
  const isGroups = pathname?.startsWith("/groups");
  const isAuthRoute = pathname?.startsWith("/auth");

  const goSearch = () => router.push("/search");
  const goFeed = () => router.push("/feed");
  const goNewPost = () => router.push("/post/new?type=discussion");
  const goProjects = () => router.push("/projects");
  const goGroups = () => router.push("/groups");

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Sticky top navbar */}
      <div className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur border-b border-slate-800">
        <Navbar />
      </div>

      {/* Main content */}
      <main className="flex-1 w-full px-2 sm:px-4 pt-4 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto w-full">
          {isAuthRoute ? (
            // AUTH PAGES: centered
            <div className="flex items-center justify-center min-h-[calc(100vh-4.5rem-4rem)]">
              <section className="w-full max-w-md">{children}</section>
            </div>
          ) : (
            // NORMAL PAGES: children wrapped in Suspense so useSearchParams() is safe
            <section className="min-w-0 space-y-4">
              <Suspense
                fallback={
                  <div className="w-full text-center py-4 text-[11px] text-slate-400">
                    Loading…
                  </div>
                }
              >
                {children}
              </Suspense>
            </section>
          )}
        </div>
      </main>

      {/* Desktop footer */}
      <footer className="hidden md:block border-t border-slate-800 py-4 text-center text-xs text-slate-500">
        PwnTrends · Built for cyber security, CTF and open source communities.
      </footer>

      {/* Mobile bottom icon bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur md:hidden">
        <div className="relative max-w-6xl mx-auto">
          {/* Bottom icons row */}
          <div className="flex items-center justify-between px-6 pt-2 pb-3">
            {/* Search */}
            <button
              type="button"
              onClick={goSearch}
              className={`flex flex-col items-center gap-0.5 text-[11px] ${
                isSearch ? "text-primary-300" : "text-slate-400"
              }`}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Feed */}
            <button
              type="button"
              onClick={goFeed}
              className={`flex flex-col items-center gap-0.5 text-[11px] ${
                isFeed ? "text-primary-300" : "text-slate-400"
              }`}
            >
              <List className="w-5 h-5" />
            </button>

            {/* Spacer under FAB */}
            <div className="w-12" />

            {/* Groups */}
            <button
              type="button"
              onClick={goGroups}
              className={`flex flex-col items-center gap-0.5 text-[11px] ${
                isGroups ? "text-primary-300" : "text-slate-400"
              }`}
            >
              <Users className="w-5 h-5" />
            </button>

            {/* Projects */}
            <button
              type="button"
              onClick={goProjects}
              className={`flex flex-col items-center gap-0.5 text-[11px] ${
                isProjects ? "text-primary-300" : "text-slate-400"
              }`}
            >
              <Boxes className="w-5 h-5" />
            </button>
          </div>

          {/* Center FAB for new post */}
          <button
            type="button"
            onClick={goNewPost}
            className="absolute left-1/2 -translate-x-1/2 -top-5 w-12 h-12 rounded-full bg-primary-500 text-slate-950 shadow-lg shadow-primary-500/40 flex items-center justify-center active:scale-95 transition"
          >
            <PenSquare className="w-6 h-6" />
          </button>
        </div>
      </nav>
    </div>
  );
}
