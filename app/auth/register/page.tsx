"use client";

import { useState, useEffect, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import * as THREE from "three";
import api from "@/lib/api";
import { Eye, EyeOff } from "lucide-react";

/* -------------------- Config for email suggestions -------------------- */

const EMAIL_DOMAINS = [
  "gmail.com",
  "outlook.com",
  "yahoo.com",
  "icloud.com",
  "proton.me",
];

/* -------------------- 3D Galaxy Background -------------------- */

function GalaxyBackground() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mounted = true;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.z = 26;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0); // transparent
    container.appendChild(renderer.domElement);

    // Galaxy / starfield
    const starCount = 2500;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    const color = new THREE.Color();

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;

      // Spiral-ish distribution
      const radius = Math.random() * 20;
      const spinAngle = radius * 0.4;
      const branchAngle = ((i % 5) / 5) * Math.PI * 2;

      const randomX = (Math.random() - 0.5) * 2;
      const randomY = (Math.random() - 0.5) * 2;
      const randomZ = (Math.random() - 0.5) * 2;

      positions[i3 + 0] =
        Math.cos(branchAngle + spinAngle) * radius + randomX;
      positions[i3 + 1] = randomY * 1.2;
      positions[i3 + 2] =
        Math.sin(branchAngle + spinAngle) * radius + randomZ;

      // Color blend: purple/blue/cyan
      color.setHSL(0.58 + Math.random() * 0.1, 0.6, 0.6 + Math.random() * 0.2);
      colors[i3 + 0] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(positions, 3)
    );
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Ambient glow sphere (soft, behind everything)
    const glowGeometry = new THREE.SphereGeometry(12, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.25,
    });
    const glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
    glowSphere.position.set(0, 0, -10);
    scene.add(glowSphere);

    // Animation loop
    const animate = () => {
      if (!mounted) return;
      requestAnimationFrame(animate);

      points.rotation.y += 0.0009;
      points.rotation.x += 0.0003;

      renderer.render(scene, camera);
    };
    animate();

    // Resize handling
    const handleResize = () => {
      if (!mounted) return;
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup on unmount
    return () => {
      mounted = false;
      window.removeEventListener("resize", handleResize);
      container.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      glowGeometry.dispose();
      glowMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 -z-10"
    />
  );
}

/* -------------------- Register Page -------------------- */

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"init" | "verify">("init");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For better UX: track if email field is focused (for suggestion visibility)
  const [emailFocused, setEmailFocused] = useState(false);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- Derived: email suggestions ---------- */

  const emailHasAt = email.includes("@");
  const emailLocalPart = emailHasAt ? email.split("@")[0] : email;

  const showEmailSuggestions =
    step === "init" &&
    emailFocused &&
    emailLocalPart.length > 0 &&
    !emailHasAt;

  const emailSuggestions = EMAIL_DOMAINS.map(
    (domain) => `${emailLocalPart}@${domain}`
  );

  const handleSelectEmailSuggestion = (value: string) => {
    setEmail(value);
    // If username empty, auto-suggest from email local part
    if (!username.trim()) {
      const local = value.split("@")[0];
      const suggestion = local
        .toLowerCase()
        .replace(/[^a-z0-9_]/gi, "_")
        .slice(0, 32);
      if (suggestion) setUsername(suggestion);
    }
    // Keep focus in email for smooth flow
    emailInputRef.current?.focus();
  };

  const handleEmailBlur = () => {
    setEmailFocused(false);
    if (!username.trim() && email.includes("@")) {
      const local = email.split("@")[0];
      const suggestion = local
        .toLowerCase()
        .replace(/[^a-z0-9_]/gi, "_")
        .slice(0, 32);
      if (suggestion) setUsername(suggestion);
    }
  };

  const handleInit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/register/init", {
        email,
        full_name: fullName,
        username,
        password,
      });
      setStep("verify");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/auth/register/verify", {
        email,
        otp,
      });
      router.push("/auth/login");
    } catch (e: any) {
      setError(e?.response?.data?.detail || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-950 overflow-hidden">
      {/* 3D Galaxy Background */}
      <GalaxyBackground />

      {/* Subtle overlay gradients for depth */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_60%),radial-gradient(circle_at_bottom,_rgba(129,140,248,0.16),_transparent_60%)] -z-10" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md px-4 py-6 sm:px-6 sm:py-10">
        {/* Brand + heading */}
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/60 border border-slate-700 px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-300">
                PwnTrends · Beta Access
              </span>
            </div>
            <h1 className="mt-3 text-2xl font-semibold text-slate-50">
              Create your account
            </h1>
            <p className="mt-1 text-xs text-slate-400 max-w-sm">
              Join a focused community for CTF, bug bounty and open source
              security projects. We&apos;ll verify your email with a one-time
              OTP.
            </p>
          </div>
        </div>

        {/* Glass card */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-xl px-4 py-5 sm:px-5 sm:py-6 shadow-[0_18px_50px_rgba(15,23,42,0.9)]">
          {/* Step indicator */}
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
              <span>Details</span>
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
              <span>Verify</span>
            </div>

            <span className="text-[10px] text-slate-500">
              Step {step === "init" ? "1" : "2"} of 2
            </span>
          </div>

          {/* Step 1: Details */}
          {step === "init" && (
            <form onSubmit={handleInit} className="space-y-3 text-xs">
              {/* EMAIL + suggestions */}
              <div className="space-y-1">
                <label className="text-slate-200">Email</label>
                <div className="relative">
                  <input
                    ref={emailInputRef}
                    type="email"
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim())}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={handleEmailBlur}
                    placeholder="you@example.com"
                  />

                  {/* Suggestions dropdown */}
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

              <div className="space-y-1">
                <label className="text-slate-200">Full name</label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aathil Ducky"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-200 flex items-center justify-between">
                  <span>Username</span>
                  <span className="text-[10px] text-slate-500">
                    shown publicly
                  </span>
                </label>
                <input
                  type="text"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="^[a-zA-Z0-9_]+$"
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. pwn_ducky"
                />
                <p className="text-[10px] text-slate-500">
                  Letters, numbers and underscores only.
                </p>
              </div>

              {/* Password with eye toggle */}
              <div className="space-y-1">
                <label className="text-slate-200 flex items-center justify-between">
                  <span>Password</span>
                  <span className="text-[10px] text-slate-500">
                    at least 8 characters
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-slate-700 bg-slate-950/80 pl-3 pr-9 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
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
                <p className="text-[11px] text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-full bg-primary-500 text-xs font-semibold py-2.5 text-slate-950 hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.99]"
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          )}

          {/* Step 2: Verify */}
          {step === "verify" && (
            <form onSubmit={handleVerify} className="space-y-3 text-xs">
              <p className="text-slate-300 text-[11px]">
                We sent a one-time OTP to{" "}
                <span className="font-semibold text-slate-50">{email}</span>.
                Enter it below to complete your registration.
              </p>

              <div className="space-y-1">
                <label className="text-slate-200">Verification code</label>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm tracking-[0.3em] text-center focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  placeholder="••••••"
                />
              </div>

              {error && (
                <p className="text-[11px] text-amber-300 border border-amber-500/40 bg-amber-500/10 rounded-md px-3 py-2">
                  {error}
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep("init");
                    setError(null);
                  }}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline underline-offset-2"
                >
                  ← Edit details
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-full bg-primary-500 text-xs font-semibold px-4 py-2 text-slate-950 hover:bg-primary-400 disabled:opacity-60 disabled:cursor-not-allowed transition active:scale-[0.99]"
                >
                  {loading ? "Verifying..." : "Verify & Continue"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 text-[11px] text-slate-400 text-center">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-primary-300 hover:text-primary-200"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* tiny footer text */}
        <p className="mt-4 text-[10px] text-slate-500 text-center">
          By creating an account, you agree not to share malicious content or
          violate responsible disclosure guidelines.
        </p>
      </div>
    </div>
  );
}
