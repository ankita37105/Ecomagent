import { getProviderBaseUrl, providerFetch } from "@/lib/server/provider-session";

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

  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) await wait(1000 * attempt);

    const res = await providerFetch(`/partner/users/${userId}/api-keys/generate`, {
      method: "POST",
      headers: browserLikeHeaders,
      body,
      redirect: "manual",
      cache: "no-store",
      retryOnAuthFailure: true,
    });

    const location = res.headers.get("location");
    const text = await res.text().catch(() => "");
    const key = extractKeyFromLocationOrBody(location, text);
    if (key) return key;
  }

  return null;
}

export async function isProviderKeyPresent(userId: string, apiKey: string): Promise<boolean> {
  try {
    const res = await providerFetch(`/partner/users/${userId}`, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
    });

    if (res.status === 404) return false;
    if (res.status === 401 || res.status === 403) return false;

    const body = await res.text().catch(() => "");
    if (!body) return false;

    // Match by stable fragments to tolerate masked rendering differences.
    const prefix = apiKey.slice(0, 20);
    const suffix = apiKey.slice(-10);
    return body.includes(prefix) || body.includes(suffix);
  } catch {
    return false;
  }
}
