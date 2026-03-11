import { getProviderBaseUrl, ProviderAuthError, providerFetch } from "@/lib/server/provider-session";

function extractHiddenInputs(html: string): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const tags = html.match(/<input[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const type = (tag.match(/type=["']([^"']*)["']/i)?.[1] ?? "").toLowerCase();
    if (type !== "hidden") continue;
    const name = tag.match(/name=["']([^"']*)["']/i)?.[1];
    const value = tag.match(/value=["']([^"']*)["']/i)?.[1] ?? "";
    if (name) pairs.push([name, value]);
  }
  return pairs;
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

/**
 * Attempts to delete a specific API key from the provider admin panel.
 * Fetches the user page, finds the delete URL closest to the key in the HTML,
 * then POSTs to it (including any CSRF hidden fields).
 * Returns true when the provider confirmed deletion (2xx / redirect), false otherwise.
 */
export async function deleteProviderApiKey(userId: string, apiKey: string): Promise<boolean> {
  try {
    const pageRes = await providerFetch(`/partner/users/${userId}`, {
      method: "GET",
      cache: "no-store",
    });

    if (pageRes.status === 404 || pageRes.status === 401 || pageRes.status === 403) {
      return false;
    }

    const html = await pageRes.text().catch(() => "");
    if (!html) return false;

    // Find where the key appears in the page
    const prefix = apiKey.slice(0, 20);
    const suffix = apiKey.slice(-10);
    const keyPos = html.includes(prefix)
      ? html.indexOf(prefix)
      : html.includes(suffix)
        ? html.indexOf(suffix)
        : -1;

    if (keyPos === -1) return false;

    // Search a window around the key for a delete/revoke action URL
    const windowStart = Math.max(0, keyPos - 2000);
    const windowEnd = Math.min(html.length, keyPos + 2000);
    const section = html.slice(windowStart, windowEnd);

    const urlPatterns = [
      /action=["']([^"']*api[_-]key[^"']*(?:delete|revoke|remove)[^"']*)["']/i,
      /href=["']([^"']*api[_-]key[^"']*(?:delete|revoke|remove)[^"']*)["']/i,
      /action=["']([^"']*(?:delete|revoke)[^"']*api[_-]key[^"']*)["']/i,
      new RegExp(`/partner/users/${userId}/api-keys/[^"'\\s]+/(?:delete|revoke)`, "i"),
    ];

    let deleteUrl: string | null = null;
    for (const pattern of urlPatterns) {
      const match = section.match(pattern);
      if (match) {
        deleteUrl = match[1] ?? match[0];
        break;
      }
    }

    if (!deleteUrl) return false;

    // Find the enclosing form to collect CSRF / hidden fields
    const escapedUrl = deleteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const formMatch = html.match(
      new RegExp(`<form[^>]*action=["']${escapedUrl}["'][\\s\\S]*?</form>`, "i")
    );
    const bodyParams = new URLSearchParams(formMatch ? extractHiddenInputs(formMatch[0]) : []);

    const delRes = await providerFetch(deleteUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: bodyParams.toString(),
      redirect: "manual",
      cache: "no-store",
      retryOnAuthFailure: true,
    });

    // 2xx or redirect = deletion accepted
    return delRes.status < 400;
  } catch {
    return false;
  }
}

/**
 * Scrape the provider user page and return the first API key found.
 * Returns null when no key is found or the page cannot be fetched.
 */
export async function getKeyFromProviderPage(userId: string): Promise<string | null> {
  try {
    const res = await providerFetch(`/partner/users/${userId}`, {
      method: "GET",
      cache: "no-store",
    });
    if (res.status >= 400) return null;
    const html = await res.text().catch(() => "");
    return extractKeyFromHtml(html);
  } catch {
    return null;
  }
}

function extractKeyFromHtml(html: string): string | null {
  if (!html) return null;

  // 1. sk-proxy-* keys
  const proxyMatch = html.match(/\b(sk-proxy-[A-Za-z0-9_-]{20,})\b/);
  if (proxyMatch?.[1]) return proxyMatch[1];

  // 2. sk-* keys
  const skMatch = html.match(/\b(sk-[A-Za-z0-9_-]{20,})\b/);
  if (skMatch?.[1]) return skMatch[1];

  // 3. Keys shown in input value fields
  const inputMatch = html.match(
    /name=["'](?:api_key|key|new_key)["'][^>]*value=["']([^"']{20,})["']/i
  );
  if (inputMatch?.[1]) return inputMatch[1];

  // 4. Keys displayed in code / pre / monospace elements
  const codeMatch = html.match(/<(?:code|pre|samp)[^>]*>\s*([A-Za-z0-9_-]{40,})\s*<\/(?:code|pre|samp)>/i);
  if (codeMatch?.[1]) return codeMatch[1];

  return null;
}

export async function generateProviderApiKey(
  userId: string,
  keyName = "EcomAgent Trial"
): Promise<string | null> {
  const baseUrl = getProviderBaseUrl();
  const body = new URLSearchParams({
    key_name: keyName,
    client_identifier: "",
    description: "Auto Trial",
    rpm_limit: "10",
    daily_limit: "100",
  }).toString();

  const browserLikeHeaders: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36",
    origin: baseUrl,
    referer: `${baseUrl}/partner/users/${userId}`,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };

  // Single attempt — retryOnAuthFailure false to prevent duplicate key creation.
  try {
    const res = await providerFetch(`/partner/users/${userId}/api-keys/generate`, {
      method: "POST",
      headers: browserLikeHeaders,
      body,
      redirect: "manual",
      cache: "no-store",
      retryOnAuthFailure: false,
    });

    const location = res.headers.get("location");
    const text = await res.text().catch(() => "");
    const key = extractKeyFromLocationOrBody(location, text);
    if (key) return key;
  } catch {
    // POST might have created the key even though auth check failed.
  }

  // Fallback: scrape the user page for the key.
  await wait(500);
  return getKeyFromProviderPage(userId);
}

export type KeyStatus = "present" | "absent" | "unknown";

/**
 * Check whether the API key still exists on the provider user page.
 * Returns:
 *  - "present" — key found in the HTML
 *  - "absent"  — page loaded successfully but key is NOT in the HTML
 *  - "unknown" — could not determine (auth failure, network error, etc.)
 */
export async function checkProviderKeyStatus(userId: string, apiKey: string): Promise<KeyStatus> {
  try {
    // Use redirect: "follow" so we land on the actual page, not a 3xx shell.
    const res = await providerFetch(`/partner/users/${userId}`, {
      method: "GET",
      cache: "no-store",
    });

    // 404 means the provider user itself is gone
    if (res.status === 404) return "absent";
    // Auth issues → we can't tell, don't assume either way
    if (res.status === 401 || res.status === 403) return "unknown";

    const body = await res.text().catch(() => "");
    if (!body || body.length < 200) return "unknown";

    // Use targeted key extraction (same patterns as getKeyFromProviderPage)
    // instead of raw prefix/suffix text search which can false-positive
    // on logs, history sections, JS variables, etc.
    const activeKey = extractKeyFromHtml(body);

    if (!activeKey) {
      // Page loaded fine but no key pattern found → key is genuinely absent
      console.log(`[keyStatus] userId=${userId} → absent (no active key in HTML)`);
      return "absent";
    }

    // Compare the found active key against the expected key
    if (activeKey === apiKey) {
      return "present";
    }

    // Active key differs from what we have stored → our key was replaced/deleted
    console.log(`[keyStatus] userId=${userId} → absent (active key differs)`);
    return "absent";
  } catch (error) {
    console.error(`[keyStatus] userId=${userId} → unknown (error: ${error instanceof Error ? error.message : error})`);
    if (error instanceof ProviderAuthError) return "unknown";
    return "unknown";
  }
}

/**
 * Attempt to permanently delete a provider user account (not just the key).
 */
export async function deleteProviderUser(userId: string): Promise<boolean> {
  try {
    const res = await providerFetch(`/partner/users/${userId}/delete`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "confirmation=DELETE",
      redirect: "manual",
      cache: "no-store",
      retryOnAuthFailure: true,
    });
    return res.status < 400;
  } catch {
    return false;
  }
}
