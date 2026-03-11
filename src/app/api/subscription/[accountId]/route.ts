import { NextResponse } from "next/server";
import { clearAccountApiKey, getAccount, upsertAccount } from "@/lib/server/account-store";
import { isProviderKeyPresent } from "@/lib/server/provider-keys";

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
    const keyStillExists = await isProviderKeyPresent(account.providerUserId, account.apiKey);
    if (!keyStillExists) {
      await clearAccountApiKey(accountId);
      const refreshed = await getAccount(accountId);
      return NextResponse.json({ success: true, subscription: refreshed });
    }
  }

  return NextResponse.json({ success: true, subscription: account });
}
