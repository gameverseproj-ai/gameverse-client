import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_BASE_URL } from './api-config';
import { SessionStore } from './session.store';
import { SessionGate } from './session.gate';
import { toApiError } from './api-error';

/**
 * Signs every server call with the stored session, starting one first if a
 * screen asks for data before sign-in has finished, and turns failures into an
 * {@link ApiError} carrying the server's own message and code. A rejected
 * session is dropped so the next call can start a fresh one.
 */
export const serverApiInterceptor: HttpInterceptorFn = (req, next) => {
  const baseUrl = inject(API_BASE_URL);
  // Match the API prefix, not just the origin: with a same-origin base ('')
  // a bare origin check would capture every request.
  if (!req.url.startsWith(`${baseUrl}/api/`)) return next(req);

  const session = inject(SessionStore);
  const gate = inject(SessionGate);

  const send = () => {
    const token = session.token();
    const request = token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : req;
    return next(request).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) session.clear();
        return throwError(() => toApiError(error.status, error.error, error.message));
      }),
    );
  };

  // Sign-in itself must not wait on a session, or it would wait on itself.
  const signingIn = req.url.startsWith(`${baseUrl}/api/auth/`);
  if (signingIn || session.token()) return send();

  return gate.ensure().pipe(switchMap(send));
};
