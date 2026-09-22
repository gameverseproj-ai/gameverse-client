# Account flow prepared for be-core

Reviewed source: `/Users/greg/IdeaProjects/be-core/src/main/java/com/gameverse/core/controller/AuthController.java`, `dto/auth/AuthResponse.java`, `dto/auth/TelegramWidgetAuthRequest.java`, and `service/UserService.java`.

## Server contract

| Operation | Route | Body |
| --- | --- | --- |
| Guest creation | POST `/api/auth/anonymous` | No body |
| Session restoration | GET `/api/auth/me` | No body |
| Google conversion | POST `/api/auth/attach/google` | `{idToken}` |
| Telegram Mini App conversion | POST `/api/auth/attach/telegram` | `{initData}` |
| Telegram browser conversion | POST `/api/auth/attach/telegram/web` | Signed widget fields: `id`, `hash`, `auth_date`, optional profile fields |

Regular provider sign-in uses the same paths without `attach/`. Creation/sign-in supports `Accept-Language` and `x-user-version`. Conversion and `/me` require the current bearer token. Every response returns a fresh token, userId, playerId, anonymous, language, profile and identities. Conversion retains both identifiers and existing progress. An already-owned identity returns `409 / IDENTITY_ALREADY_LINKED`; it does not merge accounts.

## Current client behavior

`AUTH_API` is bound only to `MockAuthApi`. No provider SDK, OAuth popup, real HTTP request or bearer interceptor is enabled. The UI explicitly labels the flow as a demo and does not claim cloud saving. Credentials are fixtures; real Google tokens and Telegram launch data are never sent to the mock.

Opening any route restores the local session or creates a guest. The optional save-progress panel can be dismissed persistently and reopened from the account button. Demo Google and Telegram attach to that guest; both userId and the existing mock player `player-001` remain unchanged. Existing game storage keys are untouched. This is deliberately a single-player mock; switching to another existing account is not implemented, because every current game mock has its own fixed player storage. On conflict, preserve the guest and show an error. Implement isolated player storage and explicit account switching before wiring regular sign-in to an existing account.

Client mode hints distinguish Telegram, phone browser, tablet browser and desktop browser. Telegram launch context takes precedence; it only selects presentation/credential type, never establishes identity. Touch and screen size are layout heuristics, not security or authorization signals. Existing responsive game controls remain in charge of gameplay.

Mock fixtures: `mock:success` attaches, `mock:linked` returns the server's identity-conflict code, any other proof is rejected. Session corruption and failed writes surface errors without silently resetting accounts or game progress. Guest gameplay remains ungated even if account initialization fails.

## Real integration follow-up

Replace the auth provider with an HTTP implementation; obtain real Google ID tokens and signed Telegram payloads via their respective SDKs. Send Mini App initData verbatim to the Mini App endpoint, and widget fields to `/telegram/web`. Verify them only on the server. Restore and replace tokens from server responses, handle expiry explicitly, and scope all game/profile APIs by returned playerId. Preserve the guest token during attach; never create a fresh authenticated player as a substitute for conversion. Do not automatically switch accounts or imply progress merging on a 409.

Validation: `node scripts/check-auth.mjs`, existing game regression scripts, Angular template compilation, browser guest/dismiss/reload/demo conversion flows.
