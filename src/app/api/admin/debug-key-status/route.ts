import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAccount } from "@/lib/server/account-store";
import { checkProviderKeyStatus } from "@/lib/server/provider-keys";
import { providerFetch } from "@/lib/server/provider-session";

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

  // 1. Check key status via the normal function
  const status = await checkProviderKeyStatus(account.providerUserId, account.apiKey);
  debug.keyStatus = status;

  // 2. Also fetch the raw page for inspection
  try {
    const res = await providerFetch(`/partner/users/${account.providerUserId}`, {
      method: "GET",
      cache: "no-store",
    });
    debug.rawPageStatus = res.status;
    debug.rawPageUrl = res.url;
    const body = await res.text().catch(() => "");
    debug.rawPageLength = body.length;
    debug.rawPageFirst500 = body.slice(0, 500);

    // Check if the stored key prefix appears anywhere in the raw page
    const prefix = account.apiKey.slice(0, 20);
    debug.keyPrefixFoundInRawPage = body.includes(prefix);

    // Find all sk-* patterns in the page
    const allSkKeys = body.match(/\bsk-[A-Za-z0-9_-]{20,}\b/g) ?? [];
    debug.allSkKeysFound = allSkKeys.map((k: string) => `${k.slice(0, 16)}...`);

    // Check if page looks like a login page
    const hasPasswordField = /<input[^>]+type=["']password["']/i.test(body);
    const hasLoginText = /\b(login|sign in|session expired)\b/i.test(body);
    debug.looksLikeLoginPage = hasPasswordField && hasLoginText;
  } catch (e) {
    debug.rawPageError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(debug);
}
