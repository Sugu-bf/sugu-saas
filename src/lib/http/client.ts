import { env } from "@/lib/env";
import { ApiError } from "./api-error";

// ============================================================
// Central HTTP Client
// ============================================================

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined>;
  /** Timeout in ms. Default 15 000 */
  timeout?: number;
  /** Number of retries for idempotent (GET) requests. Default 2 */
  retries?: number;
  /** Signal for abort */
  signal?: AbortSignal;
  /** Next.js fetch cache / revalidate options */
  next?: NextFetchRequestConfig;
}

/** Generate a simple correlation id */
function requestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Build URL with query params */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  // Ensure base URL has trailing slash so relative paths resolve correctly.
  // new URL("/sellers/x", "https://host/api/v1")  → https://host/sellers/x  ❌ (absolute path strips base)
  // new URL("sellers/x",  "https://host/api/v1/") → https://host/api/v1/sellers/x ✅
  const base = env.NEXT_PUBLIC_API_BASE_URL.endsWith("/")
    ? env.NEXT_PUBLIC_API_BASE_URL
    : `${env.NEXT_PUBLIC_API_BASE_URL}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  const url = new URL(cleanPath, base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

/** Get stored token (reads from cookie on server, memory on client) */
function getToken(): string | null {
  if (typeof window === "undefined") {
    // Server-side: read from cookies via next/headers (dynamic import to avoid build errors)
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { cookies } = require("next/headers");
      const cookieStore = cookies();
      return (cookieStore as { get: (name: string) => { value: string } | undefined }).get("sugu_token")?.value ?? null;
    } catch {
      return null;
    }
  }
  // Client-side: read from cookie
  const match = document.cookie.match(/(?:^|; )sugu_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Sleep helper for retries */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The single, central API request function.
 * All domain modules call this.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    headers: extraHeaders = {},
    params,
    timeout = 15_000,
    retries = method === "GET" ? 2 : 0,
    signal,
    next: nextOpts,
  } = options;

  const url = buildUrl(path, params);
  const correlationId = requestId();
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Request-Id": correlationId,
    ...extraHeaders,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit & { next?: NextFetchRequestConfig } = {
    method,
    headers,
    signal,
    next: nextOpts,
  };

  if (body !== undefined) {
    fetchOptions.body = JSON.stringify(body);
  }

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Merge user signal with timeout
    if (signal) {
      signal.addEventListener("abort", () => controller.abort());
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle non-JSON responses
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        if (!response.ok) {
          throw new ApiError({
            message: `HTTP ${response.status} — non‑JSON response`,
            status: response.status,
            code: "NON_JSON_RESPONSE",
            requestId: correlationId,
          });
        }
        // For 204 No Content, etc.
        return undefined as T;
      }

      const json = await response.json();

      if (!response.ok) {
        throw new ApiError({
          message: json.message ?? `HTTP ${response.status}`,
          status: response.status,
          code: json.code ?? `HTTP_${response.status}`,
          errors: json.errors,
          requestId: correlationId,
        });
      }

      return json as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiError) {
        // Don't retry 4xx (except 429)
        if (error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }
        lastError = error;
      } else if (error instanceof DOMException && error.name === "AbortError") {
        lastError = new ApiError({
          message: "Request timed out",
          status: 0,
          code: "TIMEOUT",
          requestId: correlationId,
        });
      } else {
        lastError = new ApiError({
          message: error instanceof Error ? error.message : "Network error",
          status: 0,
          code: "NETWORK_ERROR",
          requestId: correlationId,
        });
      }

      // Exponential backoff before retry
      if (attempt < retries) {
        await sleep(Math.min(1000 * 2 ** attempt, 8000));
      }
    }
  }

  throw lastError!;
}

/** Shorthand helpers */
export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "GET" }),

  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "POST", body }),

  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "PATCH", body }),

  delete: <T>(path: string, opts?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...opts, method: "DELETE" }),
};
