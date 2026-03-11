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

/** Known HTTP status codes to distinguish from token counts */
const HTTP_STATUS_CODES = new Set([
  "100","101","200","201","202","204","301","302","303","304","307","308",
  "400","401","402","403","404","405","408","409","410","413","422","429",
  "500","501","502","503","504",
]);

/**
 * Map a header label to a semantic column type.
 */
function classifyHeader(raw: string): "timestamp" | "model" | "tokens" | "status" | "other" {
  const h = raw.toLowerCase();
  if (/time|date|created|when/.test(h)) return "timestamp";
  if (/model|engine/.test(h)) return "model";
  if (/token|usage|consumed/.test(h)) return "tokens";
  if (/status|code|result|response/.test(h)) return "status";
  return "other";
}

function parseRecentUsageLogs(html: string) {
  // Find all tables, pick the one that looks like a usage/log table
  const tables = html.match(/<table[^>]*>[\s\S]*?<\/table>/gi) ?? [];
  let bestTable = "";
  for (const table of tables) {
    if (/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(table)) {
      bestTable = table;
      break;
    }
  }
  if (!bestTable) bestTable = html; // fall back to full HTML

  // Extract header row to determine column positions
  const headerRow = bestTable.match(/<thead[^>]*>[\s\S]*?<\/thead>/i)?.[0]
    ?? bestTable.match(/<tr[^>]*>[\s\S]*?<\/tr>/i)?.[0]
    ?? "";
  const headerCells = [...headerRow.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/gi)].map(m => stripTags(m[1]));

  let colMap: Record<string, number> = {};
  if (headerCells.length >= 3) {
    headerCells.forEach((h, i) => {
      const type = classifyHeader(h);
      // First match wins for each type
      if (type !== "other" && colMap[type] === undefined) {
        colMap[type] = i;
      }
    });
  }

  const rows = bestTable.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? [];
  const logs: UsageLog[] = [];

  for (const row of rows) {
    // Skip header rows
    if (/<th[\s>]/i.test(row)) continue;

    const cellMatches = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
    if (cellMatches.length < 3) continue;

    const cells = cellMatches.map((c) => stripTags(c[1]));

    let timestamp: string;
    let model: string;
    let tokens: number;
    let status: string;

    if (Object.keys(colMap).length >= 2) {
      // --- Header-based positional parsing ---
      timestamp = colMap.timestamp !== undefined ? cells[colMap.timestamp] ?? "-" : "-";
      model = colMap.model !== undefined ? cells[colMap.model] ?? "unknown" : "unknown";
      tokens = colMap.tokens !== undefined ? parseNumber(cells[colMap.tokens]) : 0;
      status = colMap.status !== undefined ? cells[colMap.status] ?? "-" : "-";

      // Fall back for unmapped columns
      if (timestamp === "-") {
        timestamp = cells.find((c) => /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(c)) ?? "-";
      }
      if (model === "unknown") {
        model = cells.find((c) => /(claude|sonnet|opus|haiku|gpt|gemini|mixtral)/i.test(c)) ?? "unknown";
      }
    } else {
      // --- Heuristic fallback (no usable headers) ---
      timestamp = cells.find((c) => /\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/.test(c)) ?? cells[0] ?? "-";
      model = cells.find((c) => /(claude|sonnet|opus|haiku|gpt|gemini|mixtral)/i.test(c)) ?? cells[1] ?? "unknown";

      // Collect all purely-numeric cells (excluding timestamp and model)
      const numericCells: { idx: number; value: string; num: number }[] = [];
      for (let i = 0; i < cells.length; i++) {
        const stripped = cells[i].replace(/,/g, "");
        if (/^\d+$/.test(stripped) && cells[i] !== timestamp && cells[i] !== model) {
          numericCells.push({ idx: i, value: stripped, num: parseInt(stripped, 10) });
        }
      }

      // Separate status codes from token counts
      const statusCell = numericCells.find((c) => HTTP_STATUS_CODES.has(c.value));
      const tokenCells = numericCells.filter((c) => c !== statusCell);

      status = statusCell?.value ?? cells.find((c) => /(success|failed|error|pending)/i.test(c)) ?? "-";
      // Pick the largest remaining numeric value as the token count
      tokens = tokenCells.length > 0
        ? Math.max(...tokenCells.map((c) => c.num))
        : 0;
    }

    if (!/\d{4}-\d{2}-\d{2}/.test(timestamp)) continue;

    logs.push({ timestamp, model, tokens, status });
  }

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
