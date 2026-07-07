# ThriftAsia Production Deployment

## Prerequisites

- Node.js 20+
- Supabase project with Auth enabled
- Cloudinary account with unsigned upload preset
- Vercel account (recommended)
- Optional: Resend account for email notifications
- Optional: VAPID keys for web push

## 1. Database migrations

Run SQL files in this order inside the Supabase SQL editor:

1. `supabase-schema.sql`
2. `supabase-escrow-migration.sql`
3. `supabase-visual-voice-migration.sql`
4. `supabase-phase4-migration.sql`
5. `supabase-phase5-migration.sql`
6. `supabase-rls.sql`

## 2. Environment variables

Copy `.env.example` to `.env.local` for local development and configure the same keys in Vercel for production.

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

Recommended:

- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `SENTRY_DSN`

## 3. Pre-deploy checks

```bash
npm install
npm run lint
npm run test
npm run build
curl http://localhost:3000/api/health
```

The health endpoint returns `200` when required environment variables and database connectivity are healthy.

## 4. Vercel deployment

1. Import the GitHub repository into Vercel.
2. Set the framework preset to Next.js.
3. Add all environment variables from `.env.example`.
4. Deploy the `main` branch.
5. Configure Supabase Auth redirect URLs to include your production domain.
6. Configure Cloudinary allowed origins if using strict upload settings.

## 5. Post-deploy verification

- Visit `/api/health`
- Sign up and sign in
- Create a listing with image upload
- Browse, search, and open a product
- Send a protected chat message
- Create an escrow order
- Confirm admin dashboard loads for an admin profile

## 6. Backup strategy

- Enable Supabase daily backups on paid plans
- Export schema and RLS policies from version-controlled SQL files in this repository
- Store Cloudinary media in a dedicated folder per seller/product (already enforced by upload path)
- Keep production secrets only in Vercel/Supabase secret stores

## 7. Monitoring

- Structured JSON logs are emitted server-side via `src/lib/monitoring/logger.ts`
- Health checks: `GET /api/health`
- Optional: connect `SENTRY_DSN` with `@sentry/nextjs` for error tracking
- Optional: add Vercel Analytics / Speed Insights from the Vercel dashboard

## 8. Security notes

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- Admin routes require `profiles.role = 'admin'`
- Middleware applies security headers and API rate limiting
- Server Actions rely on Next.js CSRF protection and Zod validation

## 9. Rollback

- Roll back the Vercel deployment to the previous successful build
- Database rollbacks should use Supabase point-in-time recovery when available
- Re-run the last known-good SQL migration set if schema drift occurs
