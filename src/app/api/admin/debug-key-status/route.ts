import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAccount } from "@/lib/server/account-store";
import { checkProviderKeyStatus } from "@/lib/server/provider-keys";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (token !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const accountId = request.nextUrl.searchParams.get("accountId");
  if (!accountId) {
    return NextResponse.json({ error: "Missing accountId query param" }, { status: 400 });
  }

  const account = await getAccount(accountId);
  if (!account) {
    return NextResponse.json({ error: "Account not found", accountId }, { status: 404 });
  }

  const debug: Record<string, unknown> = {
    accountId: account.accountId,
    email: account.email,
    plan: account.plan,
    apiKey: account.apiKey ? `${account.apiKey.slice(0, 16)}...${account.apiKey.slice(-8)}` : null,
    providerUserId: account.providerUserId,
    providerEmail: account.providerEmail,
  };

  if (!account.apiKey || !account.providerUserId) {
    debug.result = "no key or provider user stored — nothing to check";
    return NextResponse.json(debug);
  }

  // Check key status via direct API validation (no admin session needed)
  const status = await checkProviderKeyStatus(account.providerUserId, account.apiKey);
  debug.keyStatus = status;
  debug.method = "direct API key validation via /v1/models";

  return NextResponse.json(debug);
}
