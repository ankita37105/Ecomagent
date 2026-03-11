import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteProviderUser } from "@/lib/server/provider-keys";

export const runtime = "nodejs";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Admin-only route to delete provider users that have no matching Supabase account.
 * Accepts a JSON body: { orphanUserIds: string[] }
 * Protected by CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const { orphanUserIds } = (await request.json()) as { orphanUserIds?: string[] };
    if (!Array.isArray(orphanUserIds) || orphanUserIds.length === 0) {
      return NextResponse.json({ error: "Provide orphanUserIds array" }, { status: 400 });
    }

    // Verify these IDs are NOT associated with any Supabase account
    const sb = getSupabase();
    const { data: linkedAccounts } = await sb
      .from("accounts")
      .select("provider_user_id")
      .in("provider_user_id", orphanUserIds);

    const linkedIds = new Set((linkedAccounts ?? []).map((a) => a.provider_user_id));
    const safeToDelete = orphanUserIds.filter((id) => !linkedIds.has(id));

    const results: { userId: string; deleted: boolean }[] = [];

    for (const userId of safeToDelete) {
      const deleted = await deleteProviderUser(userId);
      results.push({ userId, deleted });
      console.log(`[cleanup-orphan-keys] userId=${userId} deleted=${deleted}`);
    }

    return NextResponse.json({
      success: true,
      submitted: orphanUserIds.length,
      skippedLinked: orphanUserIds.length - safeToDelete.length,
      results,
    });
  } catch (error) {
    console.error("[cleanup-orphan-keys] Error:", error);
    return NextResponse.json({ success: false, error: "Cleanup failed" }, { status: 500 });
  }
}
