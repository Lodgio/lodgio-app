# CLAUDE.md — Lodgio project rules

Conventions and guardrails for all generated code. Apply to every file.

## Stack

- **Next.js** (App Router, TypeScript). Server Actions / Route Handlers for backend logic.
- **Supabase**: Postgres, Auth, Storage. Row Level Security on every table.
- **Vercel** for hosting.
- **Tailwind CSS** for styling. Keep the dashboard clean and minimal.
- Package manager: `pnpm`.

## Architecture principles

- **Multi-tenant first.** Every domain row carries `host_id`. RLS enforces isolation at the DB layer — never rely on app-layer filtering alone.
- **Integrations behind interfaces.** Define a TypeScript interface for each external service (`GmailClient`, `WhatsAppClient`, `SmsClient`, `SheetsClient`). Provide a real implementation and a mock implementation. Select via env (`USE_MOCK_WHATSAPP=true`, etc.).
- **No hardcoded host-specific content.** Message text, caretaker details, property info, locations — all from DB/config, never literals in source.
- **Idempotency.** Booking ingestion and message sending must be safe to retry. Dedup on a natural key (Airbnb booking ID). Never double-send a welcome message.
- **Explicit booking state machine.** A booking moves through states (see data model). Don't infer state implicitly.

## Security

- Guest ID documents: store in a private Supabase Storage bucket, access only via signed URLs scoped to the owning host. Never log file contents or put document data in query strings.
- OAuth tokens and API keys: server-side only, never exposed to the client. Store host Gmail refresh tokens encrypted at rest.
- Treat token expiry (`invalid_grant`, etc.) as a normal state → set connection status to `needs_reconnect` and prompt the host. Do not crash or silently retry forever.

## Error handling

- Every external call wrapped with typed error handling. Distinguish: transient (retry with backoff), auth (needs reconnect), and permanent (log + surface).
- WhatsApp: there is NO way to pre-check if a number has WhatsApp. Attempt send; on failure, trigger SMS fallback (if enabled). Track delivery status via webhook (WAMID).

## Code style

- Strict TypeScript, no `any` unless justified with a comment.
- Zod for all external input validation (form submissions, webhook payloads, parsed email fields).
- Keep modules small and single-purpose. Co-locate tests.

## What NOT to do

- Do NOT attempt to call Airbnb directly (no API, no scraping, no UI automation).
- Do NOT try to look up whether a phone number is on WhatsApp.
- Do NOT store secrets in the repo or client bundle.
- Do NOT bypass RLS with the service role key in user-facing paths.
