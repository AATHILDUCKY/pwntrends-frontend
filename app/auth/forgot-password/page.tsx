"use client";

import { useState, useRef } from "react";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

/* ---------- email suggestion domains ---------- */
const EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
];

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState<"init" | "verify">("init");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // email suggestion UX
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
    emailInputRef.current?.focus();
  };

  const handleInit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password/init", { email });
      setMessage("If this email is registered, an OTP has been sent.");
      setStep("verify");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      await api.post("/auth/forgot-password/verify", {
        email,
        otp,
        new_password: newPassword,
      });
      setMessage("Password reset successfully. Redirecting to login...");
      setTimeout(() => router.push("/auth/login"), 1500);
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden">
      {/* soft background gradients */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.14),_transparent_55%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.16),_transparent_55%)]" />

      <div className="w-full max-w-md px-4 py-6 sm:px-6 sm:py-10">
        {/* heading */}
        <div className="mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 border border-slate-800 px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
              Account recovery
            </span>
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-50">
            Reset your password
          </h1>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            We&apos;ll send a one-time OTP to your email to confirm the reset.
          </p>
        </div>

        {/* glass card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-xl px-4 py-5 sm:px-5 sm:py-6 shadow-[0_18px_50px_rgba(15,23,42,0.9)]">
          {/* step indicator */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-[11px] text-slate-300">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  step === "init"
                    ? "bg-primary-500 text-slate-950"
                    : "bg-slate-800 text-slate-200"
                }`}
              >
                1
              </div>
              <span>Request OTP</span>
              <span className="w-6 h-px bg-slate-700 mx-1" />
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  step === "verify"
                    ? "bg-primary-500 text-slate-950"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                2
              </div>
              <span>Reset</span>
            </div>
            <span className="text-[10px] text-slate-500">
              Step {step === "init" ? "1" : "2"} of 2
            </span>
          </div>

          {/* STEP 1: INIT */}
          {step === "init" && (
            <form onSubmit={handleInit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-200">Email</label>
                <div className="relative">
                  <input
                    ref={emailInputRef}
                    type="email"
                    required
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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

              {error && (
                <p className="text-[11px] text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-[11px] text-emerald-300 border border-emerald-500/30 bg-emerald-500/5 rounded-md px-3 py-2">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 rounded-full bg-primary-500 text-xs font-semibold py-2.5 text-slate-950 hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.99]"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* STEP 2: VERIFY */}
          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-3 text-xs">
              <p className="text-[11px] text-slate-300">
                We sent a one-time OTP to{" "}
                <span className="font-semibold text-slate-50">{email}</span>.
                Enter it below with your new password.
              </p>

              <div className="space-y-1">
                <label className="text-slate-200">OTP</label>
                <input
                  type="text"
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-center tracking-[0.3em] focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-200 flex items-center justify-between">
                  <span>New password</span>
                  <span className="text-[10px] text-slate-500">
                    at least 8 characters
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 pl-3 pr-9 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                <p className="text-[11px] text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}
              {message && (
                <p className="text-[11px] text-emerald-300 border border-emerald-500/30 bg-emerald-500/5 rounded-md px-3 py-2">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 rounded-full bg-primary-500 text-xs font-semibold py-2.5 text-slate-950 hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.99]"
              >
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          )}

          <div className="mt-4 text-[11px] text-slate-400 text-center">
            Remembered it?{" "}
            <Link
              href="/auth/login"
              className="text-primary-300 hover:text-primary-200"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}