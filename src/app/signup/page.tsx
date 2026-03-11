"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isDisposableEmail, DISPOSABLE_EMAIL_ERROR } from "@/lib/blocked-email-domains";
import { Zap, Eye, EyeOff, CheckCircle } from "lucide-react";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.1-.2-1.5H12Z"/>
      <path fill="#34A853" d="M2.8 12c0 5.2 4.1 9.3 9.2 9.3 5.3 0 8.8-3.7 8.8-8.9 0-.6-.1-1.1-.2-1.5H12v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6Z"/>
      <path fill="#4A90E2" d="M5 7.4 8 9.6C8.8 7.7 10.3 6.5 12 6.5c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.6 14.6 2.7 12 2.7 8.4 2.7 5.3 4.7 3.7 7.7L5 7.4Z"/>
      <path fill="#FBBC05" d="M5 16.6A5.9 5.9 0 0 1 4.2 12c0-1 .2-1.9.6-2.8L3.7 7.7A9.2 9.2 0 0 0 2.8 12c0 1.5.4 3 1.1 4.3L5 16.6Z"/>
    </svg>
  );
}

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [requiresEmailConfirmation, setRequiresEmailConfirmation] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (isDisposableEmail(email)) {
      setError(DISPOSABLE_EMAIL_ERROR);
      setLoading(false);
      return;
    }

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const result = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
      requiresEmailConfirmation?: boolean;
    };

    if (!response.ok || !result.success) {
      setError(result.error ?? "Could not create account.");
      setLoading(false);
      return;
    }

    setRequiresEmailConfirmation(Boolean(result.requiresEmailConfirmation));
    setSuccess(true);
    setLoading(false);
  };

  const handleGoogleSignup = async () => {
    setError("");
    setGoogleLoading(true);

    const redirectTo = `${window.location.origin}/dashboard`;
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (authError) {
      setError(authError.message);
      setGoogleLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="hero-glow" />
        <div className="w-full max-w-md text-center relative z-10">
          <div className="glass rounded-xl p-10">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">
              {requiresEmailConfirmation ? "Check your email" : "Account created"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {requiresEmailConfirmation ? (
                <>
                  We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
                </>
              ) : (
                <>
                  Your account is active now. You can log in immediately with <strong>{email}</strong>.
                </>
              )}
            </p>
            <Link href="/login" className="text-sm text-primary hover:underline">
              Go to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="hero-glow" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-xl font-bold mb-2">
            <Zap className="w-5 h-5 text-primary" />
            ecomagent<span className="text-primary">.in</span>
          </Link>
          <h1 className="text-2xl font-bold mt-4">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Get started with a free trial</p>
        </div>

        <form onSubmit={handleSignup} className="glass rounded-xl p-8 space-y-5">
          {error && (
            <div className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading || googleLoading}
            className="w-full py-2.5 rounded-lg border border-border bg-background hover:border-primary/50 text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-3"
          >
            <GoogleIcon />
            {googleLoading ? "Redirecting to Google..." : "Continue with Google"}
          </button>

          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
            <span className="h-px flex-1 bg-border" />
            <span>or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-background border border-border focus:border-primary focus:outline-none text-sm transition-colors pr-10"
                placeholder="Min. 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">Log in</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
