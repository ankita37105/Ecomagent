import { NextResponse } from "next/server";
import { extractUsageFromProviderHtml } from "@/lib/server/provider-usage";
import {
  ProviderAuthError,
  ProviderConfigError,
  providerFetch,
} from "@/lib/server/provider-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  if (!/^\d+$/.test(userId)) {
    return NextResponse.json(
      { success: false, error: "Invalid user ID" },
      { status: 400 }
    );
  }

  try {
    const res = await providerFetch(`/partner/users/${userId}`, {
      cache: "no-store",
    });

    const html = await res.text();
    const usage = extractUsageFromProviderHtml(html);

    return NextResponse.json({ success: true, usage });
  } catch (error) {
    if (error instanceof ProviderConfigError) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (error instanceof ProviderAuthError) {
      return NextResponse.json(
        { success: false, error: "Owner dashboard unreachable" },
        { status: 503 }
      );
    }

    console.error("Sync usage scraper error:", error);
    return NextResponse.json(
      { success: false, error: "Owner dashboard unreachable" },
      { status: 500 }
    );
  }
}
