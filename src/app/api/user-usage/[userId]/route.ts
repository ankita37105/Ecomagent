import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractUsageFromProviderHtml } from "@/lib/server/provider-usage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const AUTH_COOKIE = process.env.PROVIDER_SESSION_COOKIE;
  const BASE_URL = process.env.PROVIDER_BASE_URL;

  if (!AUTH_COOKIE || !BASE_URL) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  // Validate userId is numeric to prevent injection
  if (!/^\d+$/.test(userId)) {
    return NextResponse.json(
      { success: false, error: "Invalid user ID" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`${BASE_URL}/partner/users/${userId}`, {
      headers: {
        cookie: AUTH_COOKIE,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    const html = await response.text();
    const usage = extractUsageFromProviderHtml(html);

    return NextResponse.json({
      success: true,
      usage,
    });
  } catch (error) {
    console.error("Usage scraper error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync usage" },
      { status: 500 }
    );
  }
}
