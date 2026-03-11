import { NextResponse } from "next/server";
import { clearAccountApiKey, getAccount, upsertAccount } from "@/lib/server/account-store";
import { checkProviderKeyStatus } from "@/lib/server/provider-keys";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { accountId } = await params;

  if (!accountId) {
    return NextResponse.json(
      { success: false, error: "Missing account ID" },
      { status: 400 }
    );
  }

  const account = await getAccount(accountId);

  if (!account) {
    const created = await upsertAccount({
      accountId,
      email: "",
      plan: "free_trial",
    });

    return NextResponse.json({ success: true, subscription: created });
  }

  if (account.apiKey && account.providerUserId) {
    const status = await checkProviderKeyStatus(account.providerUserId, account.apiKey);
    if (status === "absent") {
      // Key definitively gone on the provider — clear it so user can regenerate
      await clearAccountApiKey(accountId);
      const refreshed = await getAccount(accountId);
      return NextResponse.json({ success: true, subscription: refreshed });
    }
    // "unknown" → skip clearing, return existing data as-is
  }

  return NextResponse.json({ success: true, subscription: account });
}
