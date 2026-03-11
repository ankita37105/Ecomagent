import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  clearAccountApiKey,
  clearAccountProviderUser,
  getAccount,
  upsertAccount,
} from "@/lib/server/account-store";
import {
  ProviderAuthError,
  ProviderConfigError,
  getProviderBaseUrl,
  providerFetch,
} from "@/lib/server/provider-session";
import { isDisposableEmail } from "@/lib/blocked-email-domains";
import { isProviderKeyPresent } from "@/lib/server/provider-keys";

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
    const query = new URLSearchParams(queryPart);
    const fromLocation =
      query.get("new_key") ??
      query.get("api_key") ??
      query.get("key") ??
      null;
    if (fromLocation) return decodeURIComponent(fromLocation);

    // Some providers include the key directly in the URL or fragment.
    const inlineFromLocation = location.match(/\b(sk-[A-Za-z0-9_-]{20,})\b/);
    if (inlineFromLocation?.[1]) return inlineFromLocation[1];
  }

  const queryStyleMatch = body.match(/[?&](?:new_key|api_key|key)=([^&"'\s<]+)/i);
  if (queryStyleMatch?.[1]) {
    try {
      return decodeURIComponent(queryStyleMatch[1]);
    } catch {
      return queryStyleMatch[1];
    }
  }

  const inputValueMatch = body.match(
    /name=["'](?:new_key|api_key|key)["'][^>]*value=["']([^"']+)["']/i
  );
  if (inputValueMatch?.[1]) return inputValueMatch[1];

  const jsonStyleMatch = body.match(/["'](?:new_key|api_key|key)["']\s*:\s*["']([^"']+)["']/i);
  if (jsonStyleMatch?.[1]) return jsonStyleMatch[1];

  const inlineFromBody = body.match(/\b(sk-[A-Za-z0-9_-]{20,})\b/);
  if (inlineFromBody?.[1]) return inlineFromBody[1];

  return null;
}

/**
 * After generating (or attempting to generate) a key, the provider usually
 * redirects to the user page where the key is visible in the HTML.
 * Fetch that page and extract the first sk- key found.
 */
async function fetchKeyFromUserPage(
  userId: string,
  browserLikeHeaders: Record<string, string>
): Promise<string | null> {
  try {
    const pageRes = await providerFetch(`/partner/users/${userId}`, {
      method: "GET",
      headers: { ...browserLikeHeaders, "content-type": undefined as unknown as string },
      cache: "no-store",
      redirect: "manual",
      retryOnAuthFailure: true,
    });
    if (pageRes.status >= 400) return null;
    const html = await pageRes.text().catch(() => "");
    const match = html.match(/\b(sk-[A-Za-z0-9_-]{20,})\b/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

async function generateKeyForUser(
  baseUrl: string,
  userId: string,
  browserLikeHeaders: Record<string, string>
) {
  // Single generation attempt — avoids accidental multi-key creation.
  const keyRes = await providerFetch(
    `/partner/users/${userId}/api-keys/generate`,
    {
      method: "POST",
      headers: {
        ...browserLikeHeaders,
        referer: `${baseUrl}/partner/users/${userId}`,
      },
      body: "key_name=EcomAgent+Trial&client_identifier=&description=Auto+Trial&rpm_limit=10&daily_limit=100",
      redirect: "manual",
      cache: "no-store",
      retryOnAuthFailure: true,
    }
  );

  const keyUrl = keyRes.headers.get("location");
  const keyBody = await keyRes.text().catch(() => "");
  let apiKey = extractKeyFromLocationOrBody(keyUrl, keyBody);

  // Many providers redirect to the user page after key creation without
  // embedding the key in the redirect URL. Fetch the page as a fallback.
  if (!apiKey) {
    apiKey = await fetchKeyFromUserPage(userId, browserLikeHeaders);
    if (apiKey) {
      console.log(`Key recovered from user page for userId=${userId}`);
    }
  }

  if (!apiKey) {
    console.warn(
      "Key generation: no key in response or user page. Status:",
      keyRes.status,
      "Body:",
      keyBody.slice(0, 250)
    );
  }

  return { apiKey, lastKeyStatus: keyRes.status, lastKeyBody: keyBody };
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

    if (accountEmail && isDisposableEmail(accountEmail)) {
      return NextResponse.json(
        { success: false, error: "Disposable email addresses are not allowed." },
        { status: 400 }
      );
    }

    const existingAccount = await getAccount(accountId);
    if (existingAccount?.apiKey && existingAccount.providerUserId) {
      // Verify the key still exists on the provider
      const keyStillValid = await isProviderKeyPresent(
        existingAccount.providerUserId,
        existingAccount.apiKey
      );
      if (keyStillValid) {
        return NextResponse.json({
          success: true,
          key: existingAccount.apiKey,
          userId: existingAccount.providerUserId,
          reused: true,
        });
      }
      // Key was deleted on provider — clear it so we can regenerate below
      await clearAccountApiKey(accountId);
    }

    const browserLikeHeaders: Record<string, string> = {
      "content-type": "application/x-www-form-urlencoded",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
      origin: BASE_URL,
      accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };

    const randomId = Math.floor(Math.random() * 100000);
    // Use a deterministic prefix derived from accountId so every provider user
    // is always traceable back to the Supabase account without extra DB columns.
    // Format: trial_<first-12-hex-chars-of-uuid>@ecomagent.in
    const accountHex = accountId.replace(/-/g, "").slice(0, 12);
    const trialEmail = accountHex
      ? `trial_${accountHex}@ecomagent.in`
      : `trial_${randomId}@ecomagent.in`;

    let userId: string | null = existingAccount?.providerUserId ?? null;
    let apiKey: string | null = null;
    let lastKeyStatus = 0;
    let lastKeyBody = "";

    if (userId) {
      try {
        const existingUserResult = await generateKeyForUser(BASE_URL, userId, browserLikeHeaders);
        apiKey = existingUserResult.apiKey;
        lastKeyStatus = existingUserResult.lastKeyStatus;
        lastKeyBody = existingUserResult.lastKeyBody;

        // Do NOT clear providerUserId when key parse fails — the user exists on
        // the provider side. Clearing it causes a new orphan user to be created
        // on the next click. Only wipe on a genuine auth failure below.
      } catch (error) {
        if (error instanceof ProviderAuthError) {
          await clearAccountProviderUser(accountId);
          userId = null;
        } else {
          throw error;
        }
      }
    }

    if (!userId) {
      const createRes = await providerFetch("/partner/users/create", {
        method: "POST",
        headers: {
          ...browserLikeHeaders,
          referer: `${BASE_URL}/partner/users/create`,
        },
        body: `email=${encodeURIComponent(trialEmail)}&password_option=generate&password=&request_limit=100&rpm_limit=10`,
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

      const createdUserResult = await generateKeyForUser(BASE_URL, userId, browserLikeHeaders);
      apiKey = createdUserResult.apiKey;
      lastKeyStatus = createdUserResult.lastKeyStatus;
      lastKeyBody = createdUserResult.lastKeyBody;
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
