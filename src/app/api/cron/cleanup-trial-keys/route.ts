import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  clearAccountApiKey,
  getExpiredTrialAccounts,
  upsertAccount,
} from "@/lib/server/account-store";
import {
  deleteProviderApiKey,
  generateProviderApiKey,
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
      providerDeleted: boolean;
      newKeyGenerated: boolean;
    }[] = [];

    for (const account of accounts) {
      let providerDeleted = false;
      let newKeyGenerated = false;

      if (account.providerUserId && account.apiKey) {
        providerDeleted = await deleteProviderApiKey(account.providerUserId, account.apiKey);
      }

      await clearAccountApiKey(account.accountId);

      // Free-trial rotation: after 3 days, old key is revoked and replaced with a fresh key.
      if (account.providerUserId && (providerDeleted || !account.apiKey)) {
        const newKey = await generateProviderApiKey(account.providerUserId, "EcomAgent Trial");
        if (newKey) {
          await upsertAccount({
            accountId: account.accountId,
            email: account.email,
            plan: "free_trial",
            apiKey: newKey,
            apiKeyName: "EcomAgent Trial",
            providerUserId: account.providerUserId,
          });
          newKeyGenerated = true;
        }
      }

      results.push({
        accountId: account.accountId,
        email: account.email,
        providerDeleted,
        newKeyGenerated,
      });

      console.log(
        `[cleanup-trial-keys] Rotated key for ${account.email} | providerDeleted=${providerDeleted} | newKeyGenerated=${newKeyGenerated}`
      );
    }

    return NextResponse.json({ success: true, cleaned: results.length, results });
  } catch (error) {
    console.error("[cleanup-trial-keys] Error:", error);
    return NextResponse.json({ success: false, error: "Cleanup failed" }, { status: 500 });
  }
}
