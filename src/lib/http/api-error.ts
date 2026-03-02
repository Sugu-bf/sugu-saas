/**
 * Typed API error that all network errors are mapped to.
 * Provides a uniform interface for consumers regardless of
 * whether the error came from a 422, 500, network timeout, etc.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly errors: Record<string, string[]>;
  public readonly requestId: string | null;

  constructor(opts: {
    message: string;
    status: number;
    code?: string;
    errors?: Record<string, string[]>;
    requestId?: string | null;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.code = opts.code ?? "UNKNOWN";
    this.errors = opts.errors ?? {};
    this.requestId = opts.requestId ?? null;
  }

  /** True for 401 */
  get isUnauthorized() {
    return this.status === 401;
  }

  /** True for 403 */
  get isForbidden() {
    return this.status === 403;
  }

  /** True for 422 */
  get isValidation() {
    return this.status === 422;
  }

  /** True for 429 */
  get isRateLimited() {
    return this.status === 429;
  }

  /** True for 5xx */
  get isServerError() {
    return this.status >= 500 && this.status < 600;
  }

  /** True for network / timeout errors (status = 0) */
  get isNetworkError() {
    return this.status === 0;
  }
}
