import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { getAccount, upsertAccount, upsertPayment } from "@/lib/server/account-store";

type IpnCustom = {
  accountId?: string;
  email?: string;
  plan?: "premium" | "premium+";
};

export async function POST(request: NextRequest) {
  try {
    const ipnSecret = process.env.COINPAYMENTS_IPN_SECRET;
    if (!ipnSecret) {
      return NextResponse.json({ error: "Not configured" }, { status: 500 });
    }

    // Read raw body for HMAC verification
    const rawBody = await request.text();
    const hmacHeader = request.headers.get("HMAC");

    if (!hmacHeader) {
      return NextResponse.json({ error: "No HMAC" }, { status: 400 });
    }

    // Verify HMAC signature
    const hmac = crypto.createHmac("sha512", ipnSecret);
    hmac.update(rawBody);
    const expectedSignature = hmac.digest("hex");

    if (hmacHeader !== expectedSignature) {
      console.error("IPN HMAC mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    // Parse the IPN data
    const data = new URLSearchParams(rawBody);
    const status = parseInt(data.get("status") || "0");
    const statusText = data.get("status_text") || "";
    const txnId = data.get("txn_id") || "";
    const amount = data.get("amount1") || "";
    const currency = data.get("currency1") || "";
    const buyerEmail = data.get("buyer_email") || "";
    const itemName = data.get("item_name") || "";
    const itemNumber = (data.get("item_number") || "").toLowerCase();
    const confirms = parseInt(data.get("confirms") || "0");
    const confirmsNeeded = parseInt(data.get("confirms_needed") || "3");

    const merchantId = process.env.COINPAYMENTS_MERCHANT_ID;
    const ipnMerchant = data.get("merchant") || "";
    if (merchantId && ipnMerchant && ipnMerchant !== merchantId) {
      return NextResponse.json({ error: "Invalid merchant" }, { status: 403 });
    }

    const rawCustom = data.get("custom") || "";
    let custom: IpnCustom = {};
    try {
      custom = rawCustom ? (JSON.parse(rawCustom) as IpnCustom) : {};
    } catch {
      custom = {};
    }

    const planFromData =
      custom.plan === "premium" || custom.plan === "premium+"
        ? custom.plan
        : itemNumber === "premium" || itemNumber === "premium+"
          ? (itemNumber as "premium" | "premium+")
          : null;

    const accountId = custom.accountId || "";
    const accountEmail = (custom.email || buyerEmail || "").toLowerCase();

    console.log(`IPN received: txn=${txnId} status=${status} (${statusText}) email=${buyerEmail}`);

    const effectiveNeeded = Number.isNaN(confirmsNeeded) ? 3 : Math.max(confirmsNeeded, 3);
    const hasRequiredConfirmations = !Number.isNaN(confirms) && confirms >= effectiveNeeded;
    const isProviderComplete = status >= 100 || status === 2;
    const isConfirmedByChain = status >= 0 && hasRequiredConfirmations;

    let paymentStatus: "pending" | "confirmed" | "failed" | "cancelled" = "pending";
    if (isConfirmedByChain || isProviderComplete) paymentStatus = "confirmed";
    else if (status < 0) paymentStatus = status === -1 ? "cancelled" : "failed";

    if (txnId && accountId && planFromData) {
      await upsertPayment({
        txnId,
        accountId,
        email: accountEmail,
        plan: planFromData,
        status: paymentStatus,
        amount,
        currency,
        statusText: statusText || "Processed",
        confirmations: Number.isNaN(confirms) ? 0 : confirms,
        confirmationsRequired: effectiveNeeded,
      });
    }

    // Status >= 100 means payment complete
    // Status >= 0 and < 100 means payment pending
    // Status < 0 means error/cancelled
    if ((isConfirmedByChain || isProviderComplete) && accountId && planFromData) {
      // Payment confirmed! Upgrade the user's plan
      console.log(
        `Payment confirmed for ${buyerEmail}: ${itemName} ($${amount} ${currency}) confirms=${confirms}/${effectiveNeeded}`
      );

      const existing = await getAccount(accountId);
      await upsertAccount({
        accountId,
        email: accountEmail || existing?.email || "",
        plan: planFromData,
        apiKey: existing?.apiKey,
        apiKeyName: existing?.apiKeyName,
        providerUserId: existing?.providerUserId,
      });
    } else if (status < 0) {
      console.log(`Payment failed/cancelled for ${buyerEmail}: ${statusText}`);
    } else {
      console.log(
        `Payment pending for ${buyerEmail}: ${statusText} confirms=${Number.isNaN(confirms) ? 0 : confirms}/${effectiveNeeded}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("IPN processing error:", error);
    return NextResponse.json({ error: "IPN processing failed" }, { status: 500 });
  }
}
