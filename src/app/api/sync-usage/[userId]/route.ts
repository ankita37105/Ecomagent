import { NextResponse } from "next/server";
import { extractUsageFromProviderHtml } from "@/lib/server/provider-usage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  const authCookie = process.env.PROVIDER_SESSION_COOKIE;
  const baseUrl = process.env.PROVIDER_BASE_URL;

  if (!authCookie || !baseUrl) {
    return NextResponse.json(
      { success: false, error: "Server configuration error" },
      { status: 500 }
    );
  }

  if (!/^\d+$/.test(userId)) {
    return NextResponse.json(
      { success: false, error: "Invalid user ID" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${baseUrl}/partner/users/${userId}`, {
      headers: {
        cookie: authCookie,
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });

    const html = await res.text();
    const usage = extractUsageFromProviderHtml(html);

    return NextResponse.json({ success: true, usage });
  } catch (error) {
    console.error("Sync usage scraper error:", error);
    return NextResponse.json(
      { success: false, error: "Owner dashboard unreachable" },
      { status: 500 }
    );
  }
}
