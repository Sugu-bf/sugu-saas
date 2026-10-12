import { env } from "@/lib/env";
import { ApiError } from "./api-error";

// ============================================================
// Central HTTP Client
//
// In the browser every call goes to the same-origin BFF
// (/api/proxy/*), which adds the session token server-side.
// The browser never holds — and can no longer read — that token.
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

/** Same-origin prefix of the authenticated relay. */
export const API_PROXY_PREFIX = "/api/proxy/";

/** Generate a simple correlation id */
function requestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const cleanPath = (path: string) => path.replace(/^\/+/, "");

/**
 * URL of an API path as the BROWSER must call it: through the BFF.
 * Use it for the rare raw `fetch` (multipart upload, binary download) that
 * cannot go through `apiRequest`. Never build a direct API URL client-side.
 */
export function apiUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
  }
  const qs = query.toString();
  return `${API_PROXY_PREFIX}${cleanPath(path)}${qs ? `?${qs}` : ""}`;
}

/** Build URL with query params */
function buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  if (typeof window !== "undefined") return apiUrl(path, params);

  // Server side (public, unauthenticated reads only): straight to the API.
  // new URL("sellers/x", "https://host/api/v1/") → https://host/api/v1/sellers/x
  const base = env.NEXT_PUBLIC_API_BASE_URL.endsWith("/")
    ? env.NEXT_PUBLIC_API_BASE_URL
    : `${env.NEXT_PUBLIC_API_BASE_URL}/`;
  const url = new URL(cleanPath(path), base);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    });
  }
  return url.toString();
}

/**
 * Raw authenticated `fetch` through the BFF, for multipart bodies and binary
 * responses. The session cookie travels automatically (same origin); no
 * Authorization header is — or can be — set here.
 */
export function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  headers.delete("Authorization");
  return fetch(apiUrl(path), { ...init, headers, credentials: "same-origin" });
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

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "X-Request-Id": correlationId,
    ...extraHeaders,
  };

  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const fetchOptions: RequestInit & { next?: NextFetchRequestConfig } = {
    method,
    headers,
    signal,
    next: nextOpts,
    credentials: "same-origin",
  };

  if (body !== undefined) {
    fetchOptions.body = isFormData ? (body as unknown as BodyInit) : JSON.stringify(body);
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
          // Laravel names it `error_code` (COURIER_KYC_PENDING, SUGU-…); the BFF's own routes say `code`.
          code: json.code ?? json.error_code ?? `HTTP_${response.status}`,
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
