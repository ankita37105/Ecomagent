import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isDisposableEmail } from "@/lib/blocked-email-domains";

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) return firstIp;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "unknown";
}

function hashIp(ip: string) {
  const salt = process.env.SIGNUP_IP_SALT ?? "default-signup-ip-salt";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
    };

    const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
    const password = typeof payload.password === "string" ? payload.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Disposable email addresses are not allowed." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return NextResponse.json(
        { success: false, error: "Server configuration error." },
        { status: 500 }
      );
    }

    const ip = getClientIp(request);
    const ipHash = hashIp(ip);

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { error: lockError } = await adminClient.from("signup_ip_locks").insert({
      ip_hash: ipHash,
      email,
      created_at: new Date().toISOString(),
    });

    if (lockError) {
      const duplicate = /duplicate key|already exists/i.test(lockError.message);
      return NextResponse.json(
        {
          success: false,
          error: duplicate
            ? "Only one account can be created from this IP address."
            : "Could not complete signup right now.",
        },
        { status: duplicate ? 429 : 500 }
      );
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });

    const { data: signupData, error: signupError } = await anonClient.auth.signUp({ email, password });

    if (signupError) {
      await adminClient.from("signup_ip_locks").delete().eq("ip_hash", ipHash);
      return NextResponse.json(
        { success: false, error: signupError.message },
        { status: 400 }
      );
    }

    const requiresEmailConfirmation = !signupData.session;

    return NextResponse.json({
      success: true,
      requiresEmailConfirmation,
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { success: false, error: "System busy. Please try again." },
      { status: 500 }
    );
  }
}
