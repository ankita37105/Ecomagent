type UsageLog = {
  timestamp: string;
  model: string;
  tokens: number;
  status: string;
};

type ModelUsage = {
  model: string;
  requests: number;
  tokens: number;
};

function stripTags(input: string) {
  return input
    .replace(/<[^>]+>/g, " ")
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(raw: string | null | undefined) {
  if (!raw) return 0;
  const normalized = raw.replace(/,/g, "").match(/\d+/)?.[0] ?? "0";
  return parseInt(normalized, 10);
}

function extractFirstMatch(html: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/,/g, "");
    }
  }
  return "0";
}

function parseRecentUsageLogs(html: string) {
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const logs: UsageLog[] = [];

  for (const row of rows) {
    const cellMatches = [...row.matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)];
    if (cellMatches.length < 3) continue;

    const cells = cellMatches.map((c) => stripTags(c[1]));
    const timestamp = cells.find((c) => /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(c)) ?? cells[0] ?? "-";

    if (!/\d{4}-\d{2}-\d{2}/.test(timestamp)) continue;

    const model =
      cells.find((c) => /(claude|sonnet|opus|haiku|gpt|gemini|mixtral)/i.test(c)) ??
      cells[1] ??
      "unknown";

    const status = cells.find((c) => /^\d{3}$/.test(c) || /(success|failed|error|pending)/i.test(c)) ?? "-";

    const tokenCandidate =
      cells.find((c) => /^\d{1,3}(,\d{3})*$/.test(c)) ??
      cells.find((c) => /^\d+$/.test(c) && c !== status) ??
      "0";

    logs.push({
      timestamp,
      model,
      tokens: parseNumber(tokenCandidate),
      status,
    });
  }

  // Keep latest rows first as displayed in provider dashboard.
  return logs.slice(0, 200);
}

function buildModelBreakdown(logs: UsageLog[]): ModelUsage[] {
  const map = new Map<string, ModelUsage>();

  for (const log of logs) {
    const key = log.model || "unknown";
    const existing = map.get(key) ?? { model: key, requests: 0, tokens: 0 };
    existing.requests += 1;
    existing.tokens += log.tokens;
    map.set(key, existing);
  }

  return [...map.values()].sort((a, b) => b.tokens - a.tokens);
}

export function extractUsageFromProviderHtml(html: string) {
  const requestPatterns = [
    /Requests<\/span>\s*<span[^>]*>([\d,]+)<\/span>/i,
    /requests[^<]*<\/[^>]+>\s*<[^>]+>([\d,]+)/i,
    /"requests":\s*([\d]+)/i,
    /Total Requests[^<]*<\/[^>]+>\s*<[^>]+>([\d,]+)/i,
    /Requests Today[^\d]*([\d,]+)/i,
  ];

  const tokenPatterns = [
    /Tokens Used<\/span>\s*<span[^>]*>([\d,]+)<\/span>/i,
    /tokens[^<]*<\/[^>]+>\s*<[^>]+>([\d,]+)/i,
    /"tokens":\s*([\d]+)/i,
    /Total Tokens[^<]*<\/[^>]+>\s*<[^>]+>([\d,]+)/i,
    /Tokens Today[^\d]*([\d,]+)/i,
  ];

  const requests = parseNumber(extractFirstMatch(html, requestPatterns));
  const tokens = parseNumber(extractFirstMatch(html, tokenPatterns));
  const recentLogs = parseRecentUsageLogs(html);
  const modelBreakdown = buildModelBreakdown(recentLogs);

  // Fallback: if totals are not discoverable, derive request count from recent logs.
  const safeRequests = requests > 0 ? requests : recentLogs.length;

  return {
    requests: safeRequests,
    tokens,
    recentLogs,
    modelBreakdown,
    lastUpdated: new Date().toISOString(),
  };
}
