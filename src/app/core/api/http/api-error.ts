/**
 * A failed server call, shaped the way callers already expect: `message` for
 * display and `code` for the few cases they branch on, such as
 * `IDENTITY_ALREADY_LINKED`. Angular buries the parsed body inside
 * `HttpErrorResponse.error`, so it is lifted out here.
 */
export class ApiError extends Error {
  constructor(
    override readonly message: string,
    readonly code: string | null,
    readonly status: number,
    /** An alternative the server offers, e.g. a free variant of a taken username. */
    readonly suggestion: string | null = null,
    /** Original structured body for feature-specific recovery (e.g. a run snapshot). */
    readonly body: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ServerError {
  message?: string;
  code?: string | null;
  error?: string;
  suggestion?: string | null;
}

export function toApiError(status: number, body: unknown, fallback: string): ApiError {
  const payload = (body ?? {}) as ServerError;
  const message = payload.message || payload.error || fallback;
  return new ApiError(message, payload.code ?? null, status, payload.suggestion ?? null, body);
}
