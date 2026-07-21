# Lodgio App

Multi-tenant SaaS for Airbnb hosts — guest communication automation.

## Setup

1. Copy `.env.example` to `.env.local` and fill in values.
   - Supabase keys: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (client) and `SUPABASE_SECRET_KEY` (server only).
   - Legacy names `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` still work as fallbacks.
2. Link Supabase CLI to your existing cloud project (no need to create a new one):

```bash
cd app
pnpm supabase:link   # or: supabase link --project-ref obupqorgiricysdcyvlx
pnpm supabase:push   # apply migrations to remote
```

If the remote DB has old schema from a previous app, reset it and re-apply Lodgio migrations:

```bash
pnpm supabase:reset  # destructive: wipes remote DB + auth users
```

3. Run locally:

```bash
pnpm dev
```

## Migrations

All schema lives in `supabase/migrations/`. Apply with:

```bash
supabase db push
```

Generate TypeScript types after linking:

```bash
pnpm supabase:types
# writes src/types/database.generated.ts
```

## Feature flags

**Full app (current default):** omit `NEXT_PUBLIC_DEMO_MODE`. Dashboard shows bookings, submissions, properties, caretakers, and full onboarding.

**Phase 1 & 2 demo:** set `NEXT_PUBLIC_DEMO_MODE=phase12` to hide everything except Gmail connect/sync and parsed bookings.

## Mock integrations

Default `.env.example` enables mock WhatsApp and SMS so the full booking flow runs without Meta credentials:

- `USE_MOCK_WHATSAPP=true` — guest/caretaker messages are logged, not sent via Meta; WhatsApp-specific UI is hidden
- `USE_MOCK_SMS=true`

Gmail can use real OAuth or `USE_MOCK_GMAIL=true` with fixtures in `fixtures/airbnb-emails/`.

## Deployment (Vercel)

1. Set root directory to `app/`.
2. Add all env vars from `.env.example`.
3. Deploy — `vercel.json` configures Gmail poll cron every 10 minutes.
4. Set WhatsApp webhook to `/api/webhooks/whatsapp` when Meta credentials are ready.

## Deferred verification

See `lodgio-build-pack/12_DEFERRED_AND_VERIFICATION.md` for live WhatsApp, Gmail CASA, and production migration checklists.

## Tests

```bash
pnpm test
```
