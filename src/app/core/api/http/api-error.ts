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
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ServerError {
  message?: string;
  code?: string | null;
  error?: string;
}

export function toApiError(status: number, body: unknown, fallback: string): ApiError {
  const payload = (body ?? {}) as ServerError;
  const message = payload.message || payload.error || fallback;
  return new ApiError(message, payload.code ?? null, status);
}
