"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { isDisposableEmail, DISPOSABLE_EMAIL_ERROR } from "@/lib/blocked-email-domains";
import { Zap, Eye, EyeOff, CheckCircle } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

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

    const { error: authError } = await supabase.auth.signUp({ email, password });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="hero-glow" />
        <div className="w-full max-w-md text-center relative z-10">
          <div className="glass rounded-xl p-10">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Check your email</h2>
            <p className="text-sm text-muted-foreground mb-6">
              We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
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
