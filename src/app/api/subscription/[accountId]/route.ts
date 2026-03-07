import { NextResponse } from "next/server";
import { getAccount, upsertAccount } from "@/lib/server/account-store";

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

  return NextResponse.json({ success: true, subscription: account });
}
