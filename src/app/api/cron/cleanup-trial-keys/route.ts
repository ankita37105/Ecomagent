import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  clearAccountApiKey,
  clearAccountProviderUser,
  getExpiredTrialAccounts,
} from "@/lib/server/account-store";
import {
  deleteProviderApiKey,
  deleteProviderUser,
} from "@/lib/server/provider-keys";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  // Protect with CRON_SECRET — Vercel cron sends this automatically when the env var is set.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const accounts = await getExpiredTrialAccounts();

    const results: {
      accountId: string;
      email: string;
      providerKeyDeleted: boolean;
      providerUserDeleted: boolean;
    }[] = [];

    for (const account of accounts) {
      let providerKeyDeleted = false;
      let providerUserDeleted = false;

      // Delete the API key on the provider
      if (account.providerUserId && account.apiKey) {
        providerKeyDeleted = await deleteProviderApiKey(account.providerUserId, account.apiKey);
      }

      // Delete the provider user entirely to free up server space
      if (account.providerUserId) {
        providerUserDeleted = await deleteProviderUser(account.providerUserId);
      }

      // Clear key and provider user from Supabase so user can re-generate
      await clearAccountApiKey(account.accountId);
      await clearAccountProviderUser(account.accountId);

      results.push({
        accountId: account.accountId,
        email: account.email,
        providerKeyDeleted,
        providerUserDeleted,
      });

      console.log(
        `[cleanup-trial-keys] Cleaned ${account.email} | keyDeleted=${providerKeyDeleted} | userDeleted=${providerUserDeleted}`
      );
    }

    return NextResponse.json({ success: true, cleaned: results.length, results });
  } catch (error) {
    console.error("[cleanup-trial-keys] Error:", error);
    return NextResponse.json({ success: false, error: "Cleanup failed" }, { status: 500 });
  }
}
