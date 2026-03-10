import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { extractUsageFromProviderHtml } from "@/lib/server/provider-usage";
import {
  ProviderAuthError,
  ProviderConfigError,
  providerFetch,
} from "@/lib/server/provider-session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  // Validate userId is numeric to prevent injection
  if (!/^\d+$/.test(userId)) {
    return NextResponse.json(
      { success: false, error: "Invalid user ID" },
      { status: 400 }
    );
  }

  try {
    const response = await providerFetch(`/partner/users/${userId}`, {
      cache: "no-store",
    });

    const html = await response.text();
    const usage = extractUsageFromProviderHtml(html);

    return NextResponse.json({
      success: true,
      usage,
    });
  } catch (error) {
    if (error instanceof ProviderConfigError) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (error instanceof ProviderAuthError) {
      return NextResponse.json(
        { success: false, error: "Failed to sync usage" },
        { status: 503 }
      );
    }

    console.error("Usage scraper error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to sync usage" },
      { status: 500 }
    );
  }
}
