import { createClient } from "@supabase/supabase-js";

export type PlanSlug = "free_trial" | "premium" | "premium+";
export type PaymentStatus = "pending" | "confirmed" | "failed" | "cancelled";

export type AccountRecord = {
  accountId: string;
  email: string;
  plan: PlanSlug;
  requestLimit: string;
  tokenLimit: string;
  apiKey?: string;
  apiKeyName?: string;
  providerUserId?: string;
  planStartsAt?: string;
  planEndsAt?: string;
  apiKeyCreatedAt?: string;
  updatedAt: string;
};

export type PaymentRecord = {
  txnId: string;
  accountId: string;
  email: string;
  plan: PlanSlug;
  status: PaymentStatus;
  amount: string;
  currency: string;
  statusText: string;
  confirmations: number;
  confirmationsRequired: number;
  updatedAt: string;
};

const PLAN_DETAILS: Record<PlanSlug, { requestLimit: string; tokenLimit: string }> = {
  free_trial: { requestLimit: "100", tokenLimit: "10M" },
  premium: { requestLimit: "3000", tokenLimit: "Unlimited" },
  "premium+": { requestLimit: "6000", tokenLimit: "Unlimited" },
};

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server credentials not configured");
  return createClient(url, key, { auth: { persistSession: false } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAccountRow(row: Record<string, any>): AccountRecord {
  return {
    accountId: row.account_id as string,
    email: (row.email as string) ?? "",
    plan: row.plan as PlanSlug,
    requestLimit: row.request_limit as string,
    tokenLimit: row.token_limit as string,
    apiKey: row.api_key ?? undefined,
    apiKeyName: row.api_key_name ?? undefined,
    providerUserId: row.provider_user_id ?? undefined,
    planStartsAt: row.plan_starts_at ?? undefined,
    planEndsAt: row.plan_ends_at ?? undefined,
    apiKeyCreatedAt: row.api_key_created_at ?? undefined,
    updatedAt: row.updated_at as string,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapPaymentRow(row: Record<string, any>): PaymentRecord {
  return {
    txnId: row.txn_id as string,
    accountId: row.account_id as string,
    email: (row.email as string) ?? "",
    plan: row.plan as PlanSlug,
    status: row.status as PaymentStatus,
    amount: row.amount as string,
    currency: row.currency as string,
    statusText: row.status_text as string,
    confirmations: row.confirmations as number,
    confirmationsRequired: row.confirmations_required as number,
    updatedAt: row.updated_at as string,
  };
}

export function getPlanDetails(plan: PlanSlug) {
  return PLAN_DETAILS[plan];
}

export async function getAccount(accountId: string): Promise<AccountRecord | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("accounts")
    .select("*")
    .eq("account_id", accountId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapAccountRow(data);
}

export async function upsertAccount(params: {
  accountId: string;
  email: string;
  plan?: PlanSlug;
  apiKey?: string;
  apiKeyName?: string;
  providerUserId?: string;
  /** Pass true when a new paid plan is being activated to stamp a fresh 30-day window. */
  stampValidity?: boolean;
}): Promise<AccountRecord> {
  const sb = getSupabase();
  const existing = await getAccount(params.accountId);
  const nextPlan: PlanSlug = params.plan ?? existing?.plan ?? "free_trial";
  const limits = PLAN_DETAILS[nextPlan];

  const now = new Date();
  const startsAt = params.stampValidity ? now.toISOString() : (existing?.planStartsAt ?? null);
  const endsAt = params.stampValidity
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    : (existing?.planEndsAt ?? null);

  const row = {
    account_id: params.accountId,
    email: params.email || existing?.email || "",
    plan: nextPlan,
    request_limit: limits.requestLimit,
    token_limit: limits.tokenLimit,
    api_key: params.apiKey ?? existing?.apiKey ?? null,
    api_key_name: params.apiKeyName ?? existing?.apiKeyName ?? null,
    provider_user_id: params.providerUserId ?? existing?.providerUserId ?? null,
    plan_starts_at: startsAt,
    plan_ends_at: endsAt,
    // Stamp api_key_created_at only when a brand-new key is being stored.
    api_key_created_at:
      params.apiKey != null && params.apiKey !== existing?.apiKey
        ? now.toISOString()
        : (existing?.apiKeyCreatedAt ?? null),
    updated_at: now.toISOString(),
  };

  const { data, error } = await sb
    .from("accounts")
    .upsert(row, { onConflict: "account_id" })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to upsert account");
  return mapAccountRow(data);
}

export async function clearAccountApiKey(accountId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("accounts")
    .update({ api_key: null, api_key_name: null, api_key_created_at: null, updated_at: new Date().toISOString() })
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);
}

export async function clearAccountProviderUser(accountId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("accounts")
    .update({ provider_user_id: null, updated_at: new Date().toISOString() })
    .eq("account_id", accountId);
  if (error) throw new Error(error.message);
}

export async function getExpiredTrialAccounts(): Promise<AccountRecord[]> {
  const sb = getSupabase();
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("accounts")
    .select("*")
    .eq("plan", "free_trial")
    .not("api_key", "is", null)
    .not("api_key_created_at", "is", null)
    .lt("api_key_created_at", cutoff);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAccountRow);
}

export async function upsertPayment(params: {
  txnId: string;
  accountId: string;
  email: string;
  plan: PlanSlug;
  status: PaymentStatus;
  amount: string;
  currency: string;
  statusText: string;
  confirmations?: number;
  confirmationsRequired?: number;
}): Promise<PaymentRecord> {
  const sb = getSupabase();

  const { data: existing } = await sb
    .from("payments")
    .select("confirmations, confirmations_required")
    .eq("txn_id", params.txnId)
    .maybeSingle();

  const row = {
    txn_id: params.txnId,
    account_id: params.accountId,
    email: params.email,
    plan: params.plan,
    status: params.status,
    amount: params.amount,
    currency: params.currency,
    status_text: params.statusText,
    confirmations: params.confirmations ?? existing?.confirmations ?? 0,
    confirmations_required: params.confirmationsRequired ?? existing?.confirmations_required ?? 3,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("payments")
    .upsert(row, { onConflict: "txn_id" })
    .select()
    .single();

  if (error || !data) throw new Error(error?.message ?? "Failed to upsert payment");
  return mapPaymentRow(data);
}
