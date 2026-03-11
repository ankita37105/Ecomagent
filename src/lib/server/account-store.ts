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
}): Promise<AccountRecord> {
  const sb = getSupabase();
  const existing = await getAccount(params.accountId);
  const nextPlan: PlanSlug = params.plan ?? existing?.plan ?? "free_trial";
  const limits = PLAN_DETAILS[nextPlan];

  const row = {
    account_id: params.accountId,
    email: params.email || existing?.email || "",
    plan: nextPlan,
    request_limit: limits.requestLimit,
    token_limit: limits.tokenLimit,
    api_key: params.apiKey ?? existing?.apiKey ?? null,
    api_key_name: params.apiKeyName ?? existing?.apiKeyName ?? null,
    provider_user_id: params.providerUserId ?? existing?.providerUserId ?? null,
    updated_at: new Date().toISOString(),
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
    .update({ api_key: null, api_key_name: null, updated_at: new Date().toISOString() })
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
