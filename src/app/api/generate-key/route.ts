import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getAccount, upsertAccount } from "@/lib/server/account-store";
import {
  ProviderAuthError,
  ProviderConfigError,
  getProviderBaseUrl,
  providerFetch,
} from "@/lib/server/provider-session";

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractUserIdFromHtml(html: string, email: string) {
  const escapedEmail = escapeRegExp(email);
  const scopedPattern = new RegExp(`${escapedEmail}[\\s\\S]{0,300}?ID:\\s*(\\d+)`, "i");
  const scopedMatch = html.match(scopedPattern);
  if (scopedMatch?.[1]) return scopedMatch[1];

  const nearIndex = html.indexOf(email);
  if (nearIndex >= 0) {
    const localSlice = html.slice(Math.max(0, nearIndex - 500), nearIndex + 500);
    const idMatch = localSlice.match(/ID:\s*(\d+)/i);
    if (idMatch?.[1]) return idMatch[1];
  }

  return null;
}

function extractKeyFromLocationOrBody(location: string | null, body: string) {
  if (location) {
    const queryPart = location.includes("?") ? location.split("?")[1] : "";
    const fromLocation = new URLSearchParams(queryPart).get("new_key");
    if (fromLocation) return fromLocation;
  }

  const bodyMatch = body.match(/[?&]new_key=([^&"'\s<]+)/i);
  if (bodyMatch?.[1]) {
    try {
      return decodeURIComponent(bodyMatch[1]);
    } catch {
      return bodyMatch[1];
    }
  }

  return null;
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  try {
    const BASE_URL = getProviderBaseUrl();

    const payload = (await request.json().catch(() => ({}))) as {
      accountId?: string;
      email?: string;
    };
    const accountId = typeof payload.accountId === "string" ? payload.accountId.trim() : "";
    const accountEmail = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: "Missing account ID" },
        { status: 400 }
      );
    }

    const existingAccount = await getAccount(accountId);
    if (existingAccount?.apiKey) {
      return NextResponse.json({
        success: true,
        key: existingAccount.apiKey,
        userId: existingAccount.providerUserId ?? "",
        reused: true,
      });
    }

    const browserLikeHeaders: Record<string, string> = {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      origin: BASE_URL,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };

    const randomId = Math.floor(Math.random() * 100000);
    const trialEmail = `trial_${randomId}@ecomagent.in`;

    let userId: string | null = existingAccount?.providerUserId ?? null;

    if (!userId) {
      const createRes = await providerFetch("/partner/users/create", {
        method: "POST",
        headers: {
          ...browserLikeHeaders,
          referer: `${BASE_URL}/partner/users/create`,
        },
        body: `email=${encodeURIComponent(trialEmail)}&password_option=generate&password=&request_limit=100&rpm_limit=100`,
        redirect: "manual",
        cache: "no-store",
        retryOnAuthFailure: true,
      });

      const userUrl = createRes.headers.get("location");
      let createBody = "";

      if (userUrl) {
        const userMatch = userUrl.match(/\/partner\/users\/(\d+)/);
        userId = userMatch?.[1] ?? userUrl.split("/").pop() ?? null;
      } else {
        createBody = await createRes.text().catch(() => "");
        console.error(
          "Key generation: No location header from provider. Status:",
          createRes.status,
          "Body:",
          createBody.slice(0, 300)
        );
      }

      if (!userId && createBody) {
        userId = extractUserIdFromHtml(createBody, trialEmail);
      }

      if (!userId) {
        const partnerRes = await providerFetch("/partner", {
          method: "GET",
          headers: {
            ...browserLikeHeaders,
            referer: `${BASE_URL}/partner/users/create`,
          },
          cache: "no-store",
        });

        const partnerHtml = await partnerRes.text().catch(() => "");
        userId = extractUserIdFromHtml(partnerHtml, trialEmail);
      }

      if (!userId || !/^\d+$/.test(userId)) {
        const likelyAuthFailure =
          createRes.status === 200 &&
          /create user|login|sign in|partner dashboard/i.test(createBody);

        return NextResponse.json(
          {
            success: false,
            error: likelyAuthFailure
              ? "Service temporarily unavailable. Please try again later."
              : `User creation could not be verified. Trial email: ${trialEmail}`,
          },
          { status: likelyAuthFailure ? 503 : 502 }
        );
      }

      await upsertAccount({
        accountId,
        email: accountEmail,
        providerUserId: userId,
      });
    }

    let apiKey: string | null = null;
    let lastKeyStatus = 0;
    let lastKeyBody = "";

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (attempt > 1) {
        await wait(1000 * attempt);
      }

      const keyRes = await providerFetch(
        `/partner/users/${userId}/api-keys/generate`,
        {
          method: "POST",
          headers: {
            ...browserLikeHeaders,
            referer: `${BASE_URL}/partner/users/${userId}`,
          },
          body: "key_name=EcomAgent+Trial&client_identifier=&description=Auto+Trial&rpm_limit=100&daily_limit=",
          redirect: "manual",
          cache: "no-store",
          retryOnAuthFailure: true,
        }
      );

      const keyUrl = keyRes.headers.get("location");
      const keyBody = await keyRes.text().catch(() => "");

      lastKeyStatus = keyRes.status;
      lastKeyBody = keyBody;
      apiKey = extractKeyFromLocationOrBody(keyUrl, keyBody);

      if (apiKey) {
        break;
      }

      console.warn(
        `Key generation attempt ${attempt} failed. Status:`,
        keyRes.status,
        "Body:",
        keyBody.slice(0, 250)
      );
    }

    if (!apiKey) {
      console.error(
        "Key generation: All retries failed. Last status:",
        lastKeyStatus,
        "Last body:",
        lastKeyBody.slice(0, 300)
      );
      return NextResponse.json(
        {
          success: false,
          error: `User created (ID: ${userId}) but key generation did not complete. Please wait 5 seconds and retry.`,
        },
        { status: 502 }
      );
    }

    await upsertAccount({
      accountId,
      email: accountEmail,
      providerUserId: userId,
      apiKey,
      apiKeyName: "EcomAgent Trial",
      plan: existingAccount?.plan ?? "free_trial",
    });

    return NextResponse.json({ success: true, key: apiKey, userId, reused: false });
  } catch (error) {
    if (error instanceof ProviderConfigError) {
      return NextResponse.json(
        { success: false, error: "Server configuration error" },
        { status: 500 }
      );
    }

    if (error instanceof ProviderAuthError) {
      return NextResponse.json(
        {
          success: false,
          error: "Service temporarily unavailable. Please try again later.",
        },
        { status: 503 }
      );
    }

    console.error("Key generation error:", error);
    return NextResponse.json(
      { success: false, error: "System busy. Please try again." },
      { status: 500 }
    );
  }
}
