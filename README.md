# DESConomic Review

Production-ready editorial website for a school economics newspaper using Next.js, Clerk, Convex, Tailwind, TipTap, and Resend.

## What is implemented

- Public editorial homepage (`/`) with:
  - Lead story hero
  - Top stories + latest list
  - Topic section blocks
  - Search + topic filter + sort (latest/popular)
  - Newsletter subscribe form
- Public article reader (`/article/[slug]`) with:
  - Headline, metadata, cover image, rich body rendering, related articles
- Protected writer/admin portal (`/upload`) with Clerk auth + role-based UI:
  - Create/edit drafts (TipTap + inline image upload)
  - Submit/withdraw workflow for writers
  - Admin review queue (approve/reject)
  - Admin publish controls (publish now / schedule)
  - Topics CRUD (admin)
  - Monthly PDF upload + secure link + email send (admin)
  - Subscribers view + CSV export (admin)
- Unsubscribe flow (`/unsubscribe?token=...`)
- Secure monthly PDF route (`/review/[id]?token=...`)

## Tech stack

- Next.js 16.1.6 + TypeScript 5.9
- pnpm
- Clerk auth
- Convex backend/database/storage
- Tailwind CSS
- TipTap editor with image support
- Resend email sending
- Deployment target: Vercel

## Assumptions

- Clerk users are synchronized into Convex on first portal load.
- Domain restriction is enforced in Convex auth guard + portal access gate (`ALLOWED_SCHOOL_DOMAIN`).
- `ADMIN_EMAILS` controls admin assignment (comma-separated); if empty, first synced users default to admin for bootstrap.
- For Convex + Clerk JWT auth, Clerk JWT template for Convex must include user email claims.

## Environment variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required values:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`
- `CONVEX_DEPLOYMENT`
- `CLERK_JWT_ISSUER_DOMAIN`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_SITE_URL`
- `ALLOWED_SCHOOL_DOMAIN`
- `ADMIN_EMAILS`

## Local setup

1. Install dependencies:

```bash
pnpm install
```

2. Configure Convex project and generate canonical `_generated` files:

```bash
pnpm convex:dev
```

3. In a separate terminal, run Next dev server:

```bash
pnpm dev
```

4. Seed demo data (6 topics, 10 articles, subscribers, 1 placeholder monthly review PDF):

```bash
pnpm seed
```

## Clerk + Convex auth setup notes

1. In Clerk Dashboard, create a JWT template named `convex`.
2. Ensure the template includes email/name claims used by the backend.
3. Set `CLERK_JWT_ISSUER_DOMAIN` in Convex env.
4. Add Next.js Clerk keys to `.env.local`.

## Convex schema and functions

Core tables are in `convex/schema.ts`:

- `users`
- `topics`
- `articles`
- `subscribers`
- `monthlyReviews`
- `emailSendLogs`

Main function files:

- `convex/users.ts`
- `convex/topics.ts`
- `convex/articles.ts`
- `convex/subscribers.ts`
- `convex/monthlyReviews.ts`
- `convex/seed.ts`

Note: `convex/_generated/*` placeholders are included for compile-time ergonomics in a fresh clone. Running `pnpm convex:dev` replaces them with real generated files.

## Deployment (Vercel)

1. Push repo to Git provider.
2. Import project in Vercel.
3. Set all environment variables from `.env.example` in Vercel Project Settings.
4. Ensure Convex deployment is production-ready (`pnpm convex:deploy`).
5. Deploy.

Build command:

```bash
pnpm build
```

Output is validated and currently passes locally.

## Scripts

- `pnpm dev` - Next dev server
- `pnpm build` - Production build
- `pnpm start` - Start built app
- `pnpm lint` - Type check (`tsc --noEmit`)
- `pnpm typecheck` - Type check
- `pnpm convex:dev` - Convex dev/codegen loop
- `pnpm convex:deploy` - Convex deploy
- `pnpm convex:codegen` - Convex codegen
- `pnpm seed` - Seed full demo dataset

## Testing checklist

### Public reader flows

- [ ] Home loads with hero/top/latest/topic sections.
- [ ] Search and topic filter return expected published content.
- [ ] Article cards show metadata (author/date/topic/read time).
- [ ] Opening `/article/[slug]` renders rich content and related stories.

### Auth + role controls

- [ ] Non-authenticated user cannot access `/upload`.
- [ ] Non-school-domain email is blocked in portal.
- [ ] Writer can create draft, upload images, submit, withdraw.
- [ ] Admin can approve/reject submitted articles.
- [ ] Admin can publish approved article immediately or schedule.

### Admin management

- [ ] Topics CRUD works; delete is blocked when topic has articles.
- [ ] Subscribers list is visible for admin only.
- [ ] CSV export downloads valid subscriber file.
- [ ] Monthly PDF upload stores file and creates secure link.
- [ ] Send triggers Resend action and creates send log.

### Subscriber flows

- [ ] Newsletter subscribe prevents duplicate active subscriptions.
- [ ] Email includes unsubscribe link.
- [ ] `/unsubscribe?token=...` updates status correctly.

### Technical checks

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm build` passes.
- [ ] Responsive behavior validated on mobile + desktop.

