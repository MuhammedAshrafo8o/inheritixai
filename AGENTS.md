# Inheritix — Design & Engineering Platform

Inheritix is an enterprise-grade digital products and operations platform built with **Next.js 15 (App Router)**, **TypeScript**, **Payload CMS 3.x**, and **PostgreSQL**.

The visual reference and user interface faithfully preserve the approved Figma Make design system (typography, spacing, responsive layout, Arabic RTL, motion reveals, and device mockups).

---

## Architecture Overview

- **Web Application Framework**: Next.js 15.4 (App Router) with React 19 and Tailwind CSS v4
- **Content Management System**: Payload CMS 3.90 (`@payloadcms/next`, `@payloadcms/ui`, `@payloadcms/richtext-lexical`)
- **Database Layer**: PostgreSQL via `@payloadcms/db-postgres` with Drizzle ORM and versioned migrations
- **Routing**:
  - English: `/(english)` route group (`/`, `/services`, `/products`, `/projects`, `/about`, `/insights`, `/contact`)
  - Arabic: `/(arabic)` route group with RTL (`/ar`, `/ar/services`, `/ar/products`, `/ar/projects`, `/ar/about`, `/ar/insights`, `/ar/contact`)
  - Admin Dashboard: `/(payload)` route group at `/admin`
  - CMS REST & GraphQL APIs: `/api/[...slug]`, `/api/graphql`
  - On-Demand Cache Invalidation: `/api/cache/projects`
  - Authenticated Draft Preview: `/api/preview`

---

## Local Development Setup

### 1. Requirements
- Node.js >= 20.9.0 (v22 recommended)
- PostgreSQL 16 (or Docker Compose)

### 2. Environment Configuration
Copy `.env.example` to `.env.local` and configure your credentials:
```bash
cp .env.example .env.local
```

Key environment variables:
- `NEXT_PUBLIC_SITE_URL`: Canonical site origin (default: `https://inheritixai.com`)
- `DATABASE_URI`: PostgreSQL connection string (e.g. `postgresql://postgres:postgres@127.0.0.1:5432/inheritix`)
- `PAYLOAD_SECRET`: 48+ character cryptographically secure secret
- `PREVIEW_SECRET`: Secret token for draft preview authorization

### 3. Start PostgreSQL Database
Using Docker Compose (recommended):
```bash
docker compose up -d
```
Or start your local PostgreSQL service and create the database `inheritix`:
```sql
CREATE DATABASE inheritix;
```

### 4. Database Migrations
Schema changes ship **only** through versioned migrations in `src/migrations/` (automatic dev schema push is disabled in `src/payload.config.ts`).
```bash
npm run migrate          # apply pending migrations
npm run migrate:status   # list applied / pending migrations
npm run migrate:create <name>   # after changing collections/globals: generate a migration from the config
npm run migrate:check    # drift check: creates a "drift_check" migration only if config and migrations differ
```
All Payload CLI commands run through `scripts/payload.mjs`, which guards against an observed intermittent startup stall of the stock Payload 3.90.2 CLI on this Node 22/Windows setup (the stock bin sometimes exited 0 without doing anything; root cause unconfirmed). Do not call `npx payload migrate` directly in CI.

### 5. Accounts and Content Seed
Create or rotate CMS accounts — credentials come from the environment (`INHERITIX_ADMIN_*`, `INHERITIX_EDITOR_*`) or an interactive hidden prompt. There are no default passwords and nothing secret is printed:
```bash
npm run bootstrap:users
```
The command also audits every account for the published default passwords from the original baseline and locks any match (exit code 2) until a new password is supplied.

Populate approved content (idempotent; never creates users):
```bash
npm run seed
```
- Records are created only when their slug is missing; globals are initialised only if never saved. Re-running never overwrites editorial changes.
- Services, products and the first article are published. Incomplete articles and the two sample projects are drafts (`noIndex`).
- Any error aborts with a non-zero exit code.

### 6. Development Server
Start the Next.js development server:
```bash
npm run dev
```
- Public Website (English): `http://localhost:8443/`
- Public Website (Arabic): `http://localhost:8443/ar`
- Payload Admin: `http://localhost:8443/admin`

---

## Content Model

### Collections
1. **Users** (`users`): Authentication collection with `admin` and `editor` roles. Only admins can manage users and permissions.
2. **Media** (`media`): File uploads stored in `public/media/` with localized `alt` and `description` text.
3. **Clients** (`clients`): Client organizations with logo, localized logo description, and website.
4. **Projects** (`projects`): Client case studies and projects with draft/published versioning, slug redirect tracking, cover images, sector, year, services, reorderable external links, and modular content blocks (`intro`, `richText`, `image`, `metrics`, `quote`, `cta`).
5. **Products** (`products`): Inheritix proprietary products (LOGISTTEX, Fen El Menu) with workflow steps, value metrics, device mockups, and FAQs.
6. **Services** (`services`): Core capabilities (Custom software, SaaS, ERP, Mobile apps, AI automation, WordPress) with problem/deliverables/process sections.
7. **Posts** (`posts`): Insights and articles with author byline, table of contents, reading time, and typography covers.
8. **Categories** (`categories`): Topic tags for articles.
9. **Authors** (`authors`): Editorial contributors.
10. **Redirects** (`redirects`): Permanent 308 redirects with loop prevention.

### Globals
- **SiteSettings** (`site-settings`): Site name, logos and favicon, validated brand colors (mapped to the `--blue`, `--cyan`, `--navy` design tokens), default SEO, social links, footer invitation.
- **Navigation** (`navigation`): Header navigation links and call-to-action button.
- **HomePage** (`page-home`): Hero copy and CTAs, section order, per-section visibility, product/story card selections, approach phases, perspective image, SEO.
- **AboutPage** (`page-about`): Manifesto, core principles, architectural visual.
- **ContactPage** (`page-contact`): Direct contact email, note, and Milestone 3 boundary notice.
- **ListingPages** (`listing-pages`): Headers for Services, Products, Projects, and Insights listings.
- **SiteLabels** (`site-labels`): Common UI button and link labels.

---

## Production Deployment & Storage

### Media Storage
In local development, uploads are persisted to `public/media/`. In production, configure an S3/Cloudflare R2 adapter via `@payloadcms/storage-s3`.

### Production Build
```bash
npm run build
npm run start
```

### Milestone Boundaries
- **Milestone One (Completed)**: Visual design baseline, route scaffolding, development fixtures.
- **Milestone Two (Completed, verified against PostgreSQL)**: Payload CMS 3.x, PostgreSQL migrations, secure account bootstrap, admin dashboard, content modeling, CMS-driven pages and branding, authorized drafts/preview, slug redirects, SEO and sitemap. Verification report and field-to-render checklist: `docs/milestone-two-verification.md`.
- **Milestone Three (Upcoming)**: Contact submission database persistence, automated email delivery pipeline (Resend integration), and analytics dashboard.

---

## Engineering Rules (Milestone Two)

- **Public data access** goes through `src/cms/queries.ts`: every Local API call uses `overrideAccess: false`. Drafts are served only when Next draft mode is on *and* the request carries a valid admin/editor session (rechecked per render).
- **Failures are not content**: database/query errors throw `ContentInfrastructureError` (logged, HTTP 500). Never return placeholder content on error. Sample project fixtures appear only with `INHERITIX_DEV_FIXTURES=true` outside production.
- **Cache invalidation** is handled by collection/global hooks in `src/payload/hooks/revalidate.ts`; slug changes of *published* records create flattened 308 redirects (`src/payload/hooks/slugRedirects.ts`).
- **Rich text** renders through `src/components/ui/RichTextContent.tsx` (Payload's Lexical renderer). After adding fields with custom admin components run `npm run generate:importmap` and `npm run generate:types`.
- **No hardcoded visitor copy**: every visible string comes from a collection, a page global, or **Site Labels** (headings, buttons, aria labels, article CTA, 404/500 copy). Components render CMS values only and hide an element whose value is empty — never fall back to text in code. Starter copy lives in `src/content/starter-copy.ts` (field defaults, seed, and the `content_controls` migration). Exceptions: the dashboard/phone mockup illustrations (design components), the development-fixture notice, and a minimal 500 message used only when the CMS itself is unreachable.
- **Redirect status codes**: only 308 and 307 are offered, because public routes redirect from React Server Components (`permanentRedirect`/`redirect`).
- **Deploy order**: apply migrations and switch to the matching build together. An older build writing to a newer schema can reset newly added localized columns to their English column defaults (observed during verification).
- **Verification**: `npm run test:content-controls` checks CMS-driven copy, intentional-empty hiding and redirect statuses (restores everything it changes). `npm run test:integration` (requires a running server and `INHERITIX_*` credentials) exercises auth, uploads, drafts/preview, publishing, redirects, articles, branding and the homepage over HTTP.
