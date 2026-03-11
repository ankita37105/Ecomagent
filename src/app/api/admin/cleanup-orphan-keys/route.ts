/**
 * POST /api/admin/cleanup-orphan-keys
 *
 * For every free-trial user in Supabase:
 *   1. Fetch their provider panel page
 *   2. Find ALL API keys listed there
 *   3. Keep the one stored in Supabase — delete every other one
 *
 * Premium users are never touched.
 * Protected by CRON_SECRET (Bearer token).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { providerFetch } from "@/lib/server/provider-session";

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/**
 * Scrape the provider user page and return all API keys found in it.
 * Keys are matched by the `sk-` prefix pattern.
 */
function extractAllKeysFromPage(html: string): string[] {
  const found = new Set<string>();
  // Match full visible keys (sk-<hex>)
  const fullKeyRe = /\b(sk-[A-Za-z0-9_-]{20,})\b/g;
  let m: RegExpExecArray | null;
  while ((m = fullKeyRe.exec(html)) !== null) {
    found.add(m[1]);
  }
  return [...found];
}

/**
 * Scrape the provider user page and return all delete-action URLs for API keys.
 * Returns an array of { deleteUrl, nearbyKeyFragment } objects.
 */
function extractDeleteActions(
  html: string,
  userId: string
): Array<{ deleteUrl: string; pos: number }> {
  const actions: Array<{ deleteUrl: string; pos: number }> = [];

  // Look for form action URLs that match the delete/revoke pattern for THIS user
  const deleteUrlRe = new RegExp(
    `["'](/partner/users/${userId}/api-keys/[^"'\\s]+/(?:delete|revoke)[^"'\\s]*)["']`,
    "gi"
  );
  let m: RegExpExecArray | null;
  while ((m = deleteUrlRe.exec(html)) !== null) {
    actions.push({ deleteUrl: m[1], pos: m.index });
  }

  // Fallback: any action= URL with delete/revoke near api-key
  if (actions.length === 0) {
    const genericRe =
      /action=["']([^"']*api[_-]key[^"']*(?:delete|revoke|remove)[^"']*)["']/gi;
    while ((m = genericRe.exec(html)) !== null) {
      actions.push({ deleteUrl: m[1], pos: m.index });
    }
  }

  return actions;
}

async function deleteKeyByUrl(userId: string, deleteUrl: string, html: string): Promise<boolean> {
  try {
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

    return delRes.status < 400;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

type AccountRow = {
  account_id: string;
  email: string;
  plan: string;
  api_key: string;
  provider_user_id: string;
};

type CleanupResult = {
  accountId: string;
  email: string;
  providerUserId: string;
  assignedKey: string;
  orphanKeysFound: string[];
  deleted: string[];
  failed: string[];
  error?: string;
};

export async function POST(request: NextRequest) {
  // Auth guard — same secret used by the cron job
  const authHeader = request.headers.get("authorization") ?? "";
  const cronSecret = process.env.CRON_SECRET ?? "";
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  // Fetch only free_trial accounts that have a provider_user_id AND an api_key
  // Premium users are explicitly excluded.
  const { data: rows, error: dbError } = await supabase
    .from("accounts")
    .select("account_id, email, plan, api_key, provider_user_id")
    .not("provider_user_id", "is", null)
    .not("api_key", "is", null)
    .eq("plan", "free_trial");

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 });
  }

  const accounts = (rows ?? []) as AccountRow[];
  const results: CleanupResult[] = [];

  for (const account of accounts) {
    const result: CleanupResult = {
      accountId: account.account_id,
      email: account.email,
      providerUserId: account.provider_user_id,
      assignedKey: account.api_key,
      orphanKeysFound: [],
      deleted: [],
      failed: [],
    };

    try {
      // Fetch the provider user page
      const pageRes = await providerFetch(`/partner/users/${account.provider_user_id}`, {
        method: "GET",
        cache: "no-store",
        redirect: "manual",
        retryOnAuthFailure: true,
      });

      if (pageRes.status >= 400) {
        result.error = `Provider page returned status ${pageRes.status}`;
        results.push(result);
        continue;
      }

      const html = await pageRes.text().catch(() => "");
      if (!html) {
        result.error = "Empty provider page response";
        results.push(result);
        continue;
      }

      // Find all keys visible on this page
      const allKeys = extractAllKeysFromPage(html);

      // Find delete actions
      const deleteActions = extractDeleteActions(html, account.provider_user_id);

      // Identify orphan keys: any key on the page that is NOT the assigned key
      const assignedPrefix = account.api_key.slice(0, 20);
      const assignedSuffix = account.api_key.slice(-10);

      for (const key of allKeys) {
        const isAssigned =
          key === account.api_key ||
          key.startsWith(assignedPrefix) ||
          key.endsWith(assignedSuffix);

        if (!isAssigned) {
          result.orphanKeysFound.push(key);
        }
      }

      // For each orphan key, find the closest delete action and delete it
      for (const orphanKey of result.orphanKeysFound) {
        const orphanPos = html.indexOf(orphanKey.slice(0, 20));
        if (orphanPos === -1) {
          result.failed.push(orphanKey);
          continue;
        }

        // Find the delete action URL closest in the HTML to this key
        let closestAction: { deleteUrl: string; pos: number } | null = null;
        let closestDistance = Infinity;

        for (const action of deleteActions) {
          const distance = Math.abs(action.pos - orphanPos);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestAction = action;
          }
        }

        if (!closestAction || closestDistance > 5000) {
          result.failed.push(orphanKey);
          continue;
        }

        const deleted = await deleteKeyByUrl(
          account.provider_user_id,
          closestAction.deleteUrl,
          html
        );

        if (deleted) {
          result.deleted.push(orphanKey);
          // Remove this action so it isn't reused for another key
          deleteActions.splice(deleteActions.indexOf(closestAction), 1);
        } else {
          result.failed.push(orphanKey);
        }
      }
    } catch (err) {
      result.error = String(err);
    }

    results.push(result);
  }

  const summary = {
    totalAccounts: accounts.length,
    totalOrphansFound: results.reduce((n, r) => n + r.orphanKeysFound.length, 0),
    totalDeleted: results.reduce((n, r) => n + r.deleted.length, 0),
    totalFailed: results.reduce((n, r) => n + r.failed.length, 0),
    results,
  };

  return NextResponse.json(summary);
}
