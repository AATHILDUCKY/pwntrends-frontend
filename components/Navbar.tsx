"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import api, { clearTokens, getAccessToken } from "@/lib/api";
import { User as UserIcon } from "lucide-react";

type Role = "user" | "moderator" | "admin";

interface MeResponse {
  id: number;
  email: string;
  username: string | null;
  full_name: string | null;
  role: Role;
  avatar_url: string | null;
}

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;
  return (
    <Link
      href={href}
      className={`px-3 py-1 text-sm rounded-full transition ${
        active
          ? "bg-primary-500 text-white"
          : "text-slate-200 hover:bg-slate-800"
      }`}
    >
      {label}
    </Link>
  );
}

// Helper to build a full URL for images
function resolveImageUrl(path?: string | null): string | undefined {
  if (!path) return undefined;

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  if (!base) {
    // No base URL configured; return as-is
    return path;
  }

  if (path.startsWith("/")) {
    return `${base}${path}`;
  }

  return `${base}/${path}`;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthed, setIsAuthed] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const loadMe = async () => {
    const token = getAccessToken();
    if (!token) {
      setIsAuthed(false);
      setIsAdmin(false);
      setUsername(null);
      setAvatarUrl(null);
      setLoadingMe(false);
      return;
    }

    try {
      const res = await api.get<MeResponse>("/auth/me");
      const data = res.data;
      setIsAuthed(true);
      setIsAdmin(data.role === "admin");
      setUsername(data.username || data.email || null);
      setAvatarUrl(resolveImageUrl(data.avatar_url) || null);
    } catch {
      // Token invalid/expired → clear and treat as logged-out
      clearTokens();
      setIsAuthed(false);
      setIsAdmin(false);
      setUsername(null);
      setAvatarUrl(null);
    } finally {
      setLoadingMe(false);
    }
  };

  // Initial load + re-check on route change (so after login/logout redirect, navbar refreshes)
  useEffect(() => {
    setLoadingMe(true);
    loadMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close mobile dropdown when clicking outside
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (!mobileMenuRef.current) return;
      if (!mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try {
      const refresh =
        typeof window !== "undefined"
          ? localStorage.getItem("refresh_token")
          : null;
      if (refresh) {
        // Tell backend to revoke refresh token, but don't block logout on error
        await api.post("/auth/logout", null, { params: { token: refresh } });
      }
    } catch {
      // Ignore backend error and still log out locally
    }
    clearTokens();
    // Immediately update navbar state without full reload
    setIsAuthed(false);
    setIsAdmin(false);
    setUsername(null);
    setAvatarUrl(null);
    router.push("/auth/login");
  };

  const avatarSrc = resolveImageUrl(avatarUrl || undefined);
  const profileSlug = username ? `/${username}` : "/";

  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3 relative">
        {/* Left: logo + nav links */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-500 flex items-center justify-center text-xs font-bold">
              PT
            </div>
            {/* Always show PwnTrends (also on mobile) */}
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide">
                PwnTrends
              </span>
              <span className="text-[10px] text-slate-400">
                Cybersec · CTF · Open Source
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 ml-6 text-xs">
            <NavLink href="/feed" label="Feed" />
            <NavLink href="/groups" label="Groups" />
            <NavLink href="/projects" label="Projects" />
            <NavLink href="/search" label="Search" />
            {isAdmin && <NavLink href="/admin" label="Admin" />}
          </nav>
        </div>

        {/* Right: desktop auth state */}
        <div className="hidden sm:flex items-center gap-2">
          {loadingMe ? (
            <span className="text-[11px] text-slate-400">
              Checking session…
            </span>
          ) : isAuthed && username ? (
            <>
              <Link
                href={profileSlug}
                className="flex items-center gap-2 text-xs text-slate-200 hover:text-white"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={username}
                    className="w-7 h-7 rounded-full border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-semibold">
                    {username[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <span>@{username}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1 rounded-full border border-slate-700 hover:border-red-500 hover:text-red-400 transition"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="text-xs text-slate-200 hover:text-white"
              >
                Log in
              </Link>
              <Link
                href="/auth/register"
                className="text-xs px-3 py-1 rounded-full bg-primary-500 text-white hover:bg-primary-400 transition"
              >
                Sign up
              </Link>
            </>
          )}
        </div>

        {/* Right: mobile profile button + dropdown */}
        <div
          className="flex sm:hidden items-center gap-2"
          ref={mobileMenuRef}
        >
          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 overflow-hidden"
          >
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt={username ?? "Profile"}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-4 h-4 text-slate-200" />
            )}
          </button>

          {mobileMenuOpen && (
            <div className="absolute right-4 top-12 w-40 rounded-lg border border-slate-800 bg-slate-950 shadow-lg text-xs text-slate-200 z-50">
              {loadingMe ? (
                <div className="px-3 py-2 text-slate-400">
                  Checking session…
                </div>
              ) : isAuthed && username ? (
                <>
                  <Link
                    href={profileSlug}
                    className="block px-3 py-2 hover:bg-slate-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Profile
                  </Link>
                  {isAdmin && (
                    <Link
                      href="/admin"
                      className="block px-3 py-2 hover:bg-slate-900"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-slate-900 text-red-300"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="block px-3 py-2 hover:bg-slate-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/register"
                    className="block px-3 py-2 hover:bg-slate-900"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
