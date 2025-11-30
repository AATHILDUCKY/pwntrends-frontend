"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api, { setTokens } from "@/lib/api";
import Link from "next/link";
import { Eye, EyeOff, LogIn } from "lucide-react";

/* ---------- email suggestion domains ---------- */
const EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For suggestions
  const [emailFocused, setEmailFocused] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  const emailHasAt = email.includes("@");
  const emailLocalPart = emailHasAt ? email.split("@")[0] : email;

  const showEmailSuggestions =
    emailFocused && emailLocalPart.length > 0 && !emailHasAt;

  const emailSuggestions = EMAIL_DOMAINS.map(
    (domain) => `${emailLocalPart}@${domain}`
  );

  const handleSelectEmailSuggestion = (value: string) => {
    setEmail(value);
    // keep focus on email input so user can quickly adjust if needed
    emailInputRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("username", email);
      form.append("password", password);
      const res = await api.post("/auth/login", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setTokens(res.data.access_token, res.data.refresh_token);
      router.push("/feed");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(90vh-4rem)] flex items-center justify-center px-4 py-8 bg-slate-950">
      <div className="relative w-full max-w-md">
        {/* subtle glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 blur-3xl opacity-40 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.16),_transparent_55%)]" />

        <div className="rounded-2xl border border-slate-800/80 bg-slate-950/80 shadow-[0_18px_60px_rgba(15,23,42,0.9)] px-5 py-6 sm:px-6 sm:py-7">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-primary-500/20 flex items-center justify-center">
              <LogIn className="w-5 h-5 text-primary-300" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-semibold text-slate-50">
                Welcome back
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Log in with your email and password to access PwnTrends.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 mt-2">
            {/* Email with suggestions */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-200">
                Email
              </label>
              <div className="relative">
                <input
                  ref={emailInputRef}
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.trim())}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder="you@example.com"
                />

                {showEmailSuggestions && (
                  <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-800 bg-slate-950/95 shadow-lg shadow-black/40 z-20">
                    {emailSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onMouseDown={(e) => {
                          // prevent blur before click
                          e.preventDefault();
                          handleSelectEmailSuggestion(suggestion);
                        }}
                        className="w-full text-left px-3 py-1.5 text-[11px] text-slate-200 hover:bg-slate-900 flex items-center justify-between"
                      >
                        <span>{suggestion}</span>
                        <span className="text-[9px] text-slate-500">
                          tap to use
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Password with visibility toggle */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-slate-200">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 pl-3 pr-9 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-2 flex items-center justify-center px-1 text-slate-400 hover:text-slate-100"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/40 rounded-md px-2 py-1.5">
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-1.5 inline-flex items-center justify-center gap-2 rounded-lg bg-primary-500 text-xs sm:text-sm font-semibold py-2.5 text-white hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.99]"
            >
              {loading ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-transparent animate-spin" />
                  Logging in…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Log in
                </>
              )}
            </button>
          </form>

          {/* Footer links */}
          <div className="mt-4 flex flex-col gap-2 text-[11px] sm:text-xs text-slate-400">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/auth/forgot-password"
                className="hover:text-primary-300 underline-offset-2 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="mt-1 text-center">
              <span>New here? </span>
              <Link
                href="/auth/register"
                className="text-primary-300 hover:text-primary-200 font-medium underline-offset-2 hover:underline"
              >
                Create an account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
