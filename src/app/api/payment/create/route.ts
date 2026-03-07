import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import crypto from "crypto";
import { getAccount, upsertAccount, upsertPayment } from "@/lib/server/account-store";

const PLANS: Record<string, { amount: number; name: string }> = {
  premium: { amount: 69, name: "Premium" },
  "premium+": { amount: 149, name: "Premium+" },
};

const CRYPTO_OPTIONS: Record<string, string> = {
  usdt_trc20: "USDT.TRC20",
  eth_erc20: "ETH.ERC20",
  litecoin: "LTC",
  bitcoin: "BTC",
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const plan = (formData.get("plan") as string | null)?.trim().toLowerCase() || "";
    const email = (formData.get("email") as string | null)?.trim().toLowerCase() || "";
    const accountId = (formData.get("accountId") as string | null)?.trim() || "";
    const cryptoChoice =
      (formData.get("currency") as string | null)?.trim().toLowerCase() || "usdt_trc20";
    const selectedCurrency = CRYPTO_OPTIONS[cryptoChoice];

    if (!plan || !email || !accountId || !PLANS[plan] || !selectedCurrency) {
      return NextResponse.json(
        { success: false, error: "Invalid plan, wallet network, email, or account" },
        { status: 400 }
      );
    }

    const apiKey = process.env.COINPAYMENTS_API_KEY;
    const apiSecret = process.env.COINPAYMENTS_API_SECRET;
    const merchantId = process.env.COINPAYMENTS_MERCHANT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://ecomagent.in";

    if (!apiKey || !apiSecret || !merchantId) {
      return NextResponse.json(
        { success: false, error: "Payment not configured" },
        { status: 500 }
      );
    }

    const planInfo = PLANS[plan];
    const account = await getAccount(accountId);

    await upsertAccount({
      accountId,
      email,
      plan: (account?.plan ?? "free_trial") as "free_trial" | "premium" | "premium+",
      apiKey: account?.apiKey,
      apiKeyName: account?.apiKeyName,
      providerUserId: account?.providerUserId,
    });

    const customPayload = JSON.stringify({ accountId, email, plan });

    // Build CoinPayments API request
    const body = new URLSearchParams({
      version: "1",
      format: "json",
      cmd: "create_transaction",
      key: apiKey,
      merchant: merchantId,
      amount: planInfo.amount.toString(),
      currency1: "USD",
      currency2: selectedCurrency,
      buyer_email: email,
      item_name: `EcomAgent ${planInfo.name} Plan`,
      item_number: plan,
      custom: customPayload,
      ipn_url: `${appUrl}/api/payment/ipn`,
      success_url: `${appUrl}/dashboard?payment=success&plan=${encodeURIComponent(plan)}`,
      cancel_url: `${appUrl}/dashboard?payment=cancelled`,
    });

    // Create HMAC signature
    const hmac = crypto.createHmac("sha512", apiSecret);
    hmac.update(body.toString());
    const signature = hmac.digest("hex");

    const cpResponse = await fetch(
      "https://www.coinpayments.net/api.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          HMAC: signature,
        },
        body: body.toString(),
      }
    );

    const cpResult = await cpResponse.json();

    if (cpResult.error !== "ok") {
      console.error("CoinPayments error:", cpResult.error);
      return NextResponse.json(
        { success: false, error: "Payment creation failed" },
        { status: 500 }
      );
    }

    const txnId = cpResult.result?.txn_id as string | undefined;
    if (txnId) {
      await upsertPayment({
        txnId,
        accountId,
        email,
        plan: plan as "premium" | "premium+",
        status: "pending",
        amount: String(planInfo.amount),
        currency: selectedCurrency,
        statusText: "Checkout created",
        confirmations: 0,
        confirmationsRequired: 3,
      });
    }

    // Redirect to CoinPayments checkout
    const checkoutUrl = cpResult.result?.checkout_url || cpResult.result?.status_url;

    if (checkoutUrl) {
      return NextResponse.redirect(checkoutUrl);
    }

    return NextResponse.json({
      success: true,
      txn_id: cpResult.result?.txn_id,
      checkout_url: checkoutUrl,
      status_url: cpResult.result?.status_url,
      amount: cpResult.result?.amount,
    });
  } catch (error) {
    console.error("Payment creation error:", error);
    return NextResponse.json(
      { success: false, error: "Payment system error" },
      { status: 500 }
    );
  }
}
