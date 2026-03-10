type ProviderConfig = {
  baseUrl: string;
  staticCookie: string;
  loginPath: string;
  verifyPath: string;
  usernameField: string;
  passwordField: string;
  loginUsername: string;
  loginPassword: string;
};

const PLACEHOLDER_COOKIE = "PASTE_YOUR_FULL_COOKIE_STRING_HERE";
const DEFAULT_LOGIN_PATH = "/login";
const DEFAULT_VERIFY_PATH = "/partner";
const DEFAULT_USERNAME_FIELD = "email";
const DEFAULT_PASSWORD_FIELD = "password";
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36";
const HTML_ACCEPT =
  "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";

export class ProviderConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderConfigError";
  }
}

export class ProviderAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProviderAuthError";
  }
}

let runtimeSessionCookie: string | null = null;
let refreshPromise: Promise<string> | null = null;

function safeTrim(value: string | undefined) {
  return (value ?? "").trim();
}

function isPlaceholderCookie(cookie: string) {
  return cookie.includes(PLACEHOLDER_COOKIE) || cookie.length < 20;
}

function getProviderConfig(): ProviderConfig {
  const baseUrl = safeTrim(process.env.PROVIDER_BASE_URL).replace(/\/+$/, "");
  if (!baseUrl) {
    throw new ProviderConfigError("PROVIDER_BASE_URL is missing");
  }

  const rawCookie = safeTrim(process.env.PROVIDER_SESSION_COOKIE);
  const staticCookie = rawCookie && !isPlaceholderCookie(rawCookie) ? rawCookie : "";

  const loginUsername = safeTrim(
    process.env.PROVIDER_LOGIN_EMAIL ?? process.env.PROVIDER_LOGIN_USERNAME
  );
  const loginPassword = safeTrim(process.env.PROVIDER_LOGIN_PASSWORD);

  const hasStaticCookie = Boolean(staticCookie);
  const hasLoginCredentials = Boolean(loginUsername && loginPassword);

  if (!hasStaticCookie && !hasLoginCredentials) {
    throw new ProviderConfigError(
      "Provider auth is not configured. Set PROVIDER_SESSION_COOKIE or PROVIDER_LOGIN_EMAIL/PROVIDER_LOGIN_PASSWORD"
    );
  }

  return {
    baseUrl,
    staticCookie,
    loginPath: safeTrim(process.env.PROVIDER_LOGIN_PATH) || DEFAULT_LOGIN_PATH,
    verifyPath: safeTrim(process.env.PROVIDER_VERIFY_PATH) || DEFAULT_VERIFY_PATH,
    usernameField:
      safeTrim(process.env.PROVIDER_LOGIN_USERNAME_FIELD) || DEFAULT_USERNAME_FIELD,
    passwordField:
      safeTrim(process.env.PROVIDER_LOGIN_PASSWORD_FIELD) || DEFAULT_PASSWORD_FIELD,
    loginUsername,
    loginPassword,
  };
}

function toProviderUrl(baseUrl: string, pathOrUrl: string) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalizedPath = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${baseUrl}${normalizedPath}`;
}

function extractCookiePair(cookiePart: string) {
  const trimmed = cookiePart.trim();
  if (!trimmed) return null;
  const eqIndex = trimmed.indexOf("=");
  if (eqIndex <= 0) return null;
  return {
    name: trimmed.slice(0, eqIndex).trim(),
    value: trimmed.slice(eqIndex + 1).trim(),
  };
}

function getSetCookieHeaders(response: Response) {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    return headers.getSetCookie();
  }

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function cookieHeaderFromSetCookie(response: Response) {
  const cookieMap = new Map<string, string>();

  for (const item of getSetCookieHeaders(response)) {
    const firstPart = item.split(";")[0] ?? "";
    const pair = extractCookiePair(firstPart);
    if (pair) cookieMap.set(pair.name, pair.value);
  }

  return [...cookieMap.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function mergeCookies(...cookieHeaders: Array<string | null | undefined>) {
  const cookieMap = new Map<string, string>();

  for (const header of cookieHeaders) {
    if (!header) continue;

    for (const part of header.split(";")) {
      const pair = extractCookiePair(part);
      if (pair) cookieMap.set(pair.name, pair.value);
    }
  }

  return [...cookieMap.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function extractAttribute(tag: string, attribute: string) {
  const directPattern = new RegExp(`${attribute}\\s*=\\s*["']([^"']*)["']`, "i");
  const directMatch = tag.match(directPattern);
  if (directMatch?.[1] !== undefined) return directMatch[1];

  const barePattern = new RegExp(`${attribute}\\s*=\\s*([^\\s>]+)`, "i");
  const bareMatch = tag.match(barePattern);
  return bareMatch?.[1];
}

function extractHiddenFields(html: string) {
  const pairs: Array<[string, string]> = [];
  const inputs = html.match(/<input[^>]*>/gi) ?? [];

  for (const inputTag of inputs) {
    const type = (extractAttribute(inputTag, "type") ?? "").toLowerCase();
    if (type !== "hidden") continue;

    const name = extractAttribute(inputTag, "name");
    if (!name) continue;

    const value = extractAttribute(inputTag, "value") ?? "";
    pairs.push([name, value]);
  }

  return pairs;
}

async function looksLikeAuthFailure(response: Response) {
  if (response.status === 401 || response.status === 403) return true;

  const location = response.headers.get("location") ?? "";
  if (/\/(login|sign-in|signin)\b/i.test(location)) {
    return true;
  }

  const contentType = response.headers.get("content-type") ?? "";
  const shouldInspectBody =
    response.status === 200 ||
    response.status === 302 ||
    response.status === 303 ||
    contentType.includes("text/html");

  if (!shouldInspectBody) return false;

  const body = await response
    .clone()
    .text()
    .then((text) => text.slice(0, 8000))
    .catch(() => "");

  if (!body) return false;

  const hasPasswordField = /<input[^>]+type=["']password["']/i.test(body);
  const hasLoginText = /\b(login|sign in|session expired|unauthorized|forbidden)\b/i.test(
    body
  );

  return hasPasswordField && hasLoginText;
}

async function fetchWithCookie(
  url: string,
  init: RequestInit,
  cookieHeader: string
) {
  const headers = new Headers(init.headers);

  if (cookieHeader) headers.set("cookie", cookieHeader);
  if (!headers.has("user-agent")) headers.set("user-agent", USER_AGENT);
  if (!headers.has("accept")) headers.set("accept", HTML_ACCEPT);

  const response = await fetch(url, {
    ...init,
    headers,
  });

  const rotatedCookie = cookieHeaderFromSetCookie(response);
  if (rotatedCookie) {
    runtimeSessionCookie = mergeCookies(cookieHeader, rotatedCookie);
  }

  return response;
}

async function loginAndGetSession(config: ProviderConfig) {
  if (!config.loginUsername || !config.loginPassword) {
    throw new ProviderAuthError(
      "Provider login credentials are missing. Configure PROVIDER_LOGIN_EMAIL and PROVIDER_LOGIN_PASSWORD"
    );
  }

  const loginUrl = toProviderUrl(config.baseUrl, config.loginPath);

  const initialCookie = mergeCookies(config.staticCookie, runtimeSessionCookie);

  const loginPageRes = await fetchWithCookie(
    loginUrl,
    {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
    },
    initialCookie
  );

  const pageCookie = cookieHeaderFromSetCookie(loginPageRes);
  const loginCookie = mergeCookies(initialCookie, pageCookie);

  const loginPageHtml = await loginPageRes.text().catch(() => "");
  const formData = new URLSearchParams();

  for (const [name, value] of extractHiddenFields(loginPageHtml)) {
    formData.append(name, value);
  }

  formData.set(config.usernameField, config.loginUsername);
  formData.set(config.passwordField, config.loginPassword);

  const loginRes = await fetchWithCookie(
    loginUrl,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        referer: loginUrl,
        origin: config.baseUrl,
      },
      body: formData.toString(),
      redirect: "manual",
      cache: "no-store",
    },
    loginCookie
  );

  const freshCookie = mergeCookies(
    loginCookie,
    cookieHeaderFromSetCookie(loginRes),
    runtimeSessionCookie
  );

  if (!freshCookie) {
    throw new ProviderAuthError("Provider login did not return a usable session");
  }

  const verifyUrl = toProviderUrl(config.baseUrl, config.verifyPath);
  const verifyRes = await fetchWithCookie(
    verifyUrl,
    {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      headers: {
        referer: loginUrl,
      },
    },
    freshCookie
  );

  if (await looksLikeAuthFailure(verifyRes)) {
    throw new ProviderAuthError("Provider login verification failed");
  }

  runtimeSessionCookie = freshCookie;
  return freshCookie;
}

async function ensureRefreshCookie(config: ProviderConfig) {
  if (!refreshPromise) {
    refreshPromise = loginAndGetSession(config).finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function getInitialCookie(config: ProviderConfig) {
  const merged = mergeCookies(config.staticCookie, runtimeSessionCookie);
  if (merged) return merged;
  return ensureRefreshCookie(config);
}

export function getProviderBaseUrl() {
  return getProviderConfig().baseUrl;
}

type ProviderFetchInit = RequestInit & {
  retryOnAuthFailure?: boolean;
};

function isIdempotentMethod(method: string) {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

export async function providerFetch(pathOrUrl: string, init: ProviderFetchInit = {}) {
  const { retryOnAuthFailure, ...requestInit } = init;
  const method = (requestInit.method ?? "GET").toUpperCase();
  const shouldRetryOnAuthFailure =
    retryOnAuthFailure ?? isIdempotentMethod(method);

  const config = getProviderConfig();
  const url = toProviderUrl(config.baseUrl, pathOrUrl);

  const firstCookie = await getInitialCookie(config);
  let response = await fetchWithCookie(url, requestInit, firstCookie);

  if (await looksLikeAuthFailure(response)) {
    if (!shouldRetryOnAuthFailure) {
      throw new ProviderAuthError("Provider authentication failed for request");
    }

    const refreshedCookie = await ensureRefreshCookie(config);
    response = await fetchWithCookie(url, requestInit, refreshedCookie);

    if (await looksLikeAuthFailure(response)) {
      throw new ProviderAuthError("Provider authentication failed after refresh");
    }
  }

  return response;
}
