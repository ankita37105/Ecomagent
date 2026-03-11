import { providerFetch } from "@/lib/server/provider-session";

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
