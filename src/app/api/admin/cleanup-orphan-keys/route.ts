/**
 * POST /api/admin/cleanup-orphan-keys  (ONE-SHOT — delete after use)
 *
 * 1. Scrapes the provider /partner/users list to get every trial user
 *    (email ends with @ecomagent.in).
 * 2. Compares against Supabase to build a map of
 *    providerUserId → assignedApiKey (null if user has no key in Supabase).
 * 3. For each trial user on the provider:
 *    - Fetch their user page and find ALL sk-... keys listed there.
 *    - If the provider user has NO Supabase account → delete EVERY key.
 *    - If the provider user HAS a Supabase account → keep the assigned key,
 *      delete all others.
 * 4. Premium users are never touched (not in trial scope).
 *
 * Auth: Bearer {CRON_SECRET}
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { providerFetch } from "@/lib/server/provider-session";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

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

/** Extract all visible sk-... keys from a provider user page. */
function extractAllKeysFromHtml(html: string): string[] {
  const found = new Set<string>();
  const re = /\b(sk-[A-Za-z0-9_-]{20,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) found.add(m[1]);
  return [...found];
}

/**
 * Parse { userId, email } pairs from the /partner/users page HTML.
 * The table contains rows like:
 *   <td> user@email.com <br> ID: 173 </td>
 */
function parseUserList(html: string): Array<{ userId: string; email: string }> {
  const results: Array<{ userId: string; email: string }> = [];
  // Match the ID: NNN pattern and then walk backwards to find the nearby email
  const rowRe = /ID:\s*(\d+)/gi;
  let m: RegExpExecArray | null;
  while ((m = rowRe.exec(html)) !== null) {
    const userId = m[1];
    // Look backward up to 500 chars for an email address
    const before = html.slice(Math.max(0, m.index - 500), m.index);
    const emailMatch = before.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi);
    const email = emailMatch ? emailMatch[emailMatch.length - 1].toLowerCase() : "";
    if (userId && email) results.push({ userId, email });
  }
  return results;
}

/** Find all delete-action URLs for API keys on a user's page. */
function extractDeleteActions(
  html: string,
  userId: string
): Array<{ deleteUrl: string; pos: number }> {
  const actions: Array<{ deleteUrl: string; pos: number }> = [];
  const re = new RegExp(
    `["'](/partner/users/${userId}/api-keys/[^"'\\s]+/(?:delete|revoke)[^"'\\s]*)["']`,
    "gi"
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) actions.push({ deleteUrl: m[1], pos: m.index });

  if (actions.length === 0) {
    const generic = /action=["']([^"']*api[_-]key[^"']*(?:delete|revoke|remove)[^"']*)["']/gi;
    while ((m = generic.exec(html)) !== null)
      actions.push({ deleteUrl: m[1], pos: m.index });
  }
  return actions;
}

async function deleteKeyByUrl(deleteUrl: string, html: string): Promise<boolean> {
  try {
    const escaped = deleteUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const formMatch = html.match(
      new RegExp(`<form[^>]*action=["']${escaped}["'][\\s\\S]*?</form>`, "i")
    );
    const body = new URLSearchParams(formMatch ? extractHiddenInputs(formMatch[0]) : []);
    const res = await providerFetch(deleteUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      redirect: "manual",
      cache: "no-store",
      retryOnAuthFailure: true,
    });
    return res.status < 400;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

type UserResult = {
  userId: string;
  email: string;
  inSupabase: boolean;
  assignedKey: string | null;
  keysOnProvider: string[];
  deleted: string[];
  kept: string[];
  failed: string[];
  error?: string;
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  // ---  Step 1: Build Supabase map { providerUserId → assignedApiKey } ------
  const { data: rows, error: dbError } = await supabase
    .from("accounts")
    .select("provider_user_id, api_key, plan")
    .not("provider_user_id", "is", null);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  // Never touch premium accounts
  const supabaseMap = new Map<string, string | null>();
  for (const row of rows ?? []) {
    if (row.plan === "premium" || row.plan === "premium+") continue;
    supabaseMap.set(String(row.provider_user_id), row.api_key ?? null);
  }

  // ---  Step 2: Scrape provider users list (handle pagination) --------------
  const allProviderUsers: Array<{ userId: string; email: string }> = [];
  let page = 1;
  while (true) {
    const listRes = await providerFetch(
      `/partner/users${page > 1 ? `?page=${page}` : ""}`,
      { method: "GET", cache: "no-store", redirect: "manual", retryOnAuthFailure: true }
    );
    if (listRes.status >= 400) break;
    const html = await listRes.text().catch(() => "");
    if (!html) break;

    const users = parseUserList(html);
    if (users.length === 0) break;

    // Only trial users we created (email ends with @ecomagent.in)
    const trialUsers = users.filter((u) => u.email.endsWith("@ecomagent.in"));
    allProviderUsers.push(...trialUsers);

    // Stop if no next-page link (simple heuristic)
    if (!html.includes(`page=${page + 1}`) && !html.includes("next")) break;
    page++;
    if (page > 20) break; // safety cap
  }

  // Deduplicate by userId
  const seen = new Set<string>();
  const uniqueUsers = allProviderUsers.filter((u) => {
    if (seen.has(u.userId)) return false;
    seen.add(u.userId);
    return true;
  });

  // ---  Step 3: For each trial user, delete orphan keys --------------------
  const results: UserResult[] = [];

  for (const { userId, email } of uniqueUsers) {
    const result: UserResult = {
      userId,
      email,
      inSupabase: supabaseMap.has(userId),
      assignedKey: supabaseMap.get(userId) ?? null,
      keysOnProvider: [],
      deleted: [],
      kept: [],
      failed: [],
    };

    try {
      const pageRes = await providerFetch(`/partner/users/${userId}`, {
        method: "GET",
        cache: "no-store",
        redirect: "manual",
        retryOnAuthFailure: true,
      });

      if (pageRes.status >= 400) {
        result.error = `Provider page status ${pageRes.status}`;
        results.push(result);
        continue;
      }

      const html = await pageRes.text().catch(() => "");
      result.keysOnProvider = extractAllKeysFromHtml(html);

      if (result.keysOnProvider.length === 0) {
        results.push(result);
        continue;
      }

      const deleteActions = extractDeleteActions(html, userId);
      const assignedPrefix = result.assignedKey?.slice(0, 20) ?? null;
      const assignedSuffix = result.assignedKey?.slice(-10) ?? null;

      for (const key of result.keysOnProvider) {
        // Keep the key if it matches the Supabase-assigned key
        const isAssigned =
          result.inSupabase &&
          result.assignedKey !== null &&
          (key === result.assignedKey ||
            (assignedPrefix && key.startsWith(assignedPrefix)) ||
            (assignedSuffix && key.endsWith(assignedSuffix)));

        if (isAssigned) {
          result.kept.push(key);
          continue;
        }

        // Find closest delete action for this key
        const keyPos = html.indexOf(key.slice(0, 20));
        if (keyPos === -1) {
          result.failed.push(key);
          continue;
        }

        let closest: { deleteUrl: string; pos: number } | null = null;
        let closestDist = Infinity;
        for (const action of deleteActions) {
          const dist = Math.abs(action.pos - keyPos);
          if (dist < closestDist) { closestDist = dist; closest = action; }
        }

        if (!closest || closestDist > 5000) {
          result.failed.push(key);
          continue;
        }

        const ok = await deleteKeyByUrl(closest.deleteUrl, html);
        if (ok) {
          result.deleted.push(key);
          deleteActions.splice(deleteActions.indexOf(closest), 1);
        } else {
          result.failed.push(key);
        }
      }
    } catch (err) {
      result.error = String(err);
    }

    results.push(result);
  }

  return NextResponse.json({
    providerTrialUsersFound: uniqueUsers.length,
    totalKeysDeleted: results.reduce((n, r) => n + r.deleted.length, 0),
    totalKeysFailed: results.reduce((n, r) => n + r.failed.length, 0),
    results,
  });
}
