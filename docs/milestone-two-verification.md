# Milestone Two — Completion & Verification Report

Baseline reviewed: `MuhammedAshrafo8o/inheritixai` @ `fe32d46`. Work branch: `milestone-two-completion`.
Verified on 2026-10-02 against a dedicated PostgreSQL database with automatic schema push disabled. Nothing was deployed.

## Verification environment

| Item | Value |
|---|---|
| Node | v22.16.0 (`engines: >=20.9.0`, `.mise.toml`: 22) |
| Payload / Next | 3.90.2 / 15.4.11 |
| PostgreSQL | 14.18 — dedicated user-owned cluster in WSL Ubuntu, port 5433, database `inheritix_m2` (Docker is not installed on this machine; docs recommend 16) |
| Server under test | `npm run build && npm run start` (production mode), `http://localhost:8443` |

## Workflow results

| Workflow | Result | Evidence |
|---|---|---|
| Admin and editor login and permissions | **PASSED** (10/10) | integration log; screenshots 01, 11 |
| Client creation and logo upload | **PASSED** (5/5) | integration log |
| Project draft creation and authorized preview | **PASSED** (11/11) | integration log; screenshot 09 |
| Anonymous draft denial (incl. after logout, cross-site) | **PASSED** | integration log; screenshot 10 |
| Publish, edit, reorder blocks, replace images | **PASSED** (16/16) | integration log |
| Slug redirect and unpublish behavior | **PASSED** (13/13) | integration log |
| Two distinct articles with rendered content and metadata | **PASSED** (17/17) | integration log; screenshots 07, 08, 20 |
| Branding and homepage changes through the dashboard | **PASSED** (16/16) | integration log (REST); screenshots 12–16 (admin UI) |
| Image upload and rich-text editing in the actual admin UI | **PASSED** | screenshots 03–06 |
| Seed rerun preserving manual edits | **PASSED** | `seed-rerun.log` (0 created, 24 kept; edits intact) |
| Infrastructure failure surfacing | **PASSED** | see "Database outage" below |

Full suite: **83/83** on a freshly migrated + seeded database (`integration-check-fresh-db.log`), **88/88** on the final build (`integration-check-final.log`, adds intro/tech stack/featured-project checks).

Content-controls follow-up (same day, see the dedicated section below): focused checks **26/26** (`content-controls-check.log`) and the full suite re-run **88/88** on the updated build (`integration-check-content-controls.log`).

Independent-localization and CLI-safety correction (same branch, starting from `4bc01a27fc91b9123bb1da5a5c27407bef83dd23`): focused content checks **31/31**, migration preservation check **passed**, wrapper regression checks **3/3**, typecheck **passed**, and production build **passed**. The broad 88-case suite was not repeated because the correction affects localized reads/visibility controls and CLI supervision; the affected database and HTTP paths were exercised directly.

Execution handshake and whole-record listing fallback correction (same branch, starting from `601ccb2cb9205e53fbffb0c807aa9a2fd657edad`): parent–child execution handshake in `scripts/payload.mjs` with explicit acknowledgment before invoking `bin()`, cancellation of preparation timeout, prevention of execution on missing acknowledgment/disconnect/timeout, and non-retry after acknowledgment delivery; genuine whole-record English listing fallback via `preferExactTranslations()` with `fallbackLocale: false` for records missing their Arabic translation marker; wrapper regression checks **4/4** (including delayed acknowledgment near the preparation timeout), focused content checks **32/32** (including untranslated record with populated Arabic optional field verified to use English on both listing card and detail page), typecheck **passed**, and production build **passed** (22 static pages generated).

## Commands and exact results

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 — 22 static/ISR routes, detail/listing/sitemap routes dynamic |
| `npm run migrate` on an empty DB (0 tables) | `20261002_013702_milestone_two_schema` migrated (5073 ms) |
| `npm run migrate:check` | no drift (no migration generated) |
| `npm run migrate` on the populated DB | `20261002_022010_home_story_card_source` migrated (50 ms); row counts unchanged before/after (projects 4, posts 3, media 9, redirects 5, users 2) |
| `npm run seed` (fresh) | exit 0, 27 created |
| `npm run seed` (rerun after edits) | exit 0, 0 created, 24 kept |
| `npm run seed` with unreachable DB | exit 1, `ECONNREFUSED`, no success message |
| `npm run bootstrap:users` with no admin and no credentials | exit 1, "No admin credentials supplied…" |
| `npm run bootstrap:users` with a simulated legacy-default admin | exit 2, account locked (`passwordRotationRequired = t`) |
| `npm run bootstrap:users` with credentials | exit 0, admin password replaced, editor created |
| Env validation (placeholder secret / production missing values) | `EnvironmentConfigError` listing each problem |
| Legacy Payload CLI stress (`migrate:status` ×15 via the original wrapper) | historical result only; its output-based retry assumption was removed by the execution-boundary correction below |
| `npm run migrate` (content controls) on the populated DB | `20261002_083916_content_controls` migrated (1500 ms); a legacy `301` redirect converted to `308`; starter copy stored in EN/AR only where content had relied on code fallbacks; record counts unchanged (pg_dump backup taken first, kept outside the repo) |
| `npm run migrate` + `npm run seed` on a new empty DB | all 3 migrations applied; seed created 28 records/globals including the new fields in both locales; database dropped afterwards |
| `npm run test:content-controls` | 26/26 passed |
| `npm run test:integration` (after content controls) | 88/88 passed |
| `npm run seed` (rerun after content controls) | exit 0, 0 created, 24 kept |
| `npm run test:payload-wrapper` | 3/3 passed: slow silent execution ran once; only pre-execution preparation retried; post-boundary mutating failure ran once and required migration-status inspection |
| `npm run test:localized-visibility-db -- capture` / `-- verify` | captured the populated DB state; after migration every homepage/story visibility value and article CTA visibility matched in both `en` and `ar` |
| `npm run migrate` (localized visibility controls) | `20261002_093640_localized_visibility_controls` migrated (83 ms) |
| `npm run test:content-controls` (localization correction) | 31/31 passed |
| `npm run typecheck` (localization correction) | exit 0 |
| `npm run build` (localization correction) | exit 0 — compiled successfully, 22 static pages generated |
| `npm run test:payload-wrapper` (handshake correction) | 4/4 passed: slow silent execution ran once; pre-execution preparation retried; delayed acknowledgment near preparation timeout cancels the timer and executes safely; post-boundary mutating failure ran once and required migration-status inspection |
| `npm run test:content-controls` (handshake & whole-record fallback) | 37/37 passed: includes untranslated record with populated Arabic optional field verified to use English on both listing card and detail page; plus parameterized restore round-trip and simulated mismatch detection |
| `npm run typecheck` (handshake & whole-record fallback) | exit 0 |
| `npm run build` (handshake & whole-record fallback) | exit 0 — compiled successfully in 107s, 22 static pages generated |
| `npm run test:content-controls` (test-cleanup fix, final) | **38/38 passed** — includes required cache invalidation before inspection, 23/23 cleanup tasks succeeded, project Arabic row verified against its original (every column), in-script apostrophe/empty/NULL round-trip, simulated mismatch detected, and the sub-test's own restore verified (`test-cleanup-content-controls.log`) |
| `npm run test:restore-fixtures` (test-cleanup fix) | **21/21 passed** — six restoration scenarios after a simulated assertion failure, plus the cleanup-runner check (`test-cleanup-restore-fixtures.log`) |
| `test:content-controls` with `PREVIEW_SECRET` blank / rejected | both **exit 1** as intended: fails before inspecting any page, remaining cleanup still runs (5/6 tasks), the failed post-restore invalidation is reported, and the project row is verified as restored (`test-cleanup-invalidation-negative.log`) |
| `npm run typecheck` (test-cleanup fix) | exit 0 |

### Database outage (PostgreSQL stopped under the running server)

| Path | Status |
|---|---|
| `/projects/…`, `/insights/…`, `/services/…`, `/projects`, `/sitemap.xml` | **500**, `[cms] … failed … ECONNREFUSED` logged; no content or placeholder in body |
| `/` | 200 — statically generated page serving its last successful render (ISR), not placeholder content |
| After restarting PostgreSQL | all 200 again without restarting the app |
| 500 view in a browser with PostgreSQL stopped (re-checked after content controls) | shows the minimal "CMS unreachable" message plus the error reference once the label API returns 500; the editable Site Labels copy is used whenever the CMS answers |

## Findings → changes

1. **Accounts & configuration** — removed hardcoded passwords and password logging; `npm run bootstrap:users` takes credentials from env or a hidden prompt; password policy enforced in a Users hook (length, character classes, legacy defaults blocked forever); legacy-default accounts detected by offline hash check and locked; `beforeLogin` blocks locked accounts; `src/env.ts` is imported by `payload.config.ts`, so every entry point validates `DATABASE_URI`/`PAYLOAD_SECRET` (and `PREVIEW_SECRET`/`NEXT_PUBLIC_SITE_URL` in production) with no fallbacks.
2. **Migrations** — the hand-written migration (never applied anywhere; no PostgreSQL existed on this machine) did not match Payload's schema (`_en/_ar` columns instead of `_locales` tables, no blocks/arrays/rels/version tables). Replaced by migrations generated with Payload 3.90.2: 116 tables covering `_locales`, arrays, `_rels`, all six block types, globals, `users_sessions`, and `_*_v` version tables. `push: false`.
3. **Seeding** — runs through Payload's CLI (loads `.env*`), initialises globals only once, creates records only by missing slug, keeps sample projects/incomplete articles as drafts, seeds Arabic, fails visibly.
4. **Dashboard wiring** — see checklist below. Brand colors map to the existing tokens (`--blue`, `--cyan`, `--navy`) and are re-validated before reaching CSS; defaults changed to the approved design values (the previous defaults `#0066FF/#060A11` did not match the design).
5. **Rendering** — Lexical via `@payloadcms/richtext-lexical/react`; admin import map generated (`importMap.ts`, 24 entries); post section bodies are now rich text.
6. **Publishing & redirects** — change/delete hooks revalidate affected paths; published-slug changes create flattened 308 redirects for EN and AR (draft renames create none; renaming back removes the stale redirect); multi-step loops rejected; stored redirects resolved on every public 404 path; drafts require draft mode *and* a live admin/editor session on each render; all public Local API calls use `overrideAccess: false`.
7. **SEO** — localized title/description/OG image/noIndex on routable collections and page globals; sitemap paginates, excludes noIndex/unpublished; `hreflang` only for locales with their own content; untranslated locale pages are `noindex` with canonical to the translated version.
8. **Failures** — `ContentInfrastructureError` + error boundaries; development fixtures only with `INHERITIX_DEV_FIXTURES=true` outside production.

## Content-controls follow-up

| Requirement | Change |
|---|---|
| Visitor-facing headings, labels, article CTA, 404/500 copy → CMS | **Site Labels** gained tabs: Navigation & accessibility (language-switch text, nav/menu aria labels), Projects (fact labels, client-site link, related heading, list/filter/pagination aria labels, draft-preview notice), Articles (contents label, more-insights heading, article CTA group with a visibility toggle), Services & products (service kicker, on-this-page nav, workflow/tour/FAQ heads), Error pages (404 and 500 copy). **Listing pages** gained the services card note and the insights section head. **Contact page** gained a `form` group for every form string; product/service choices now come from published Products/Services. **Products** gained `workflowTitle`. The missing-record `<title>` uses the CMS 404 title. |
| Intentional empty vs. missing initial content | Components render CMS values only and hide any element (or whole section) whose value is empty; no code fallback text remains. Starter copy lives in `src/content/starter-copy.ts` and reaches the CMS through field `defaultValue`s (new documents and never-saved globals — Payload applies defaults only to absent values, not to cleared ones), the seed (EN + AR), and the `content_controls` migration, which stored that copy for existing records that had relied on code fallbacks. From then on an empty field always means "intentionally empty". |
| Redirect status codes | Dashboard choices restricted to **308** and **307** — the codes public routes can emit from React Server Components. The migration converts stored `301` rows to `308`; the API now rejects `301` (HTTP 400). |
| Mockups | The dashboard/phone illustrations stay design components, selected by product `visualType` (see exception 1). |

Focused results (`content-controls-check.log`, 26/26): CMS labels appear and the old literals are gone (project facts, article contents label and CTA, product FAQ title, service kicker, language switch, nav aria label, 404 in EN and AR); clearing a label or field hides it with no fallback text (article contents label, article CTA toggle, service problem section and its nav link, product workflow/tour titles, About manifesto, hero CTA, service card note); contact form copy and choices come from the CMS (EN + AR); `301` rejected, `307`/`308` served as configured, the migrated legacy `301` serves `308`; every edit restored afterwards.

Verification incident (data, not code): the first focused run accidentally targeted the previous build still listening on port 8443. That older build, unaware of the new columns, rewrote the locale rows of two globals, and PostgreSQL refilled the new columns in the Arabic rows with their English column defaults. The backfill was re-applied and every check re-run against the correct build. Operational rule added to AGENTS.md: deploy the matching build together with its migrations.

## Independent localization and safe CLI correction

| Requirement | Verified implementation |
|---|---|
| Arabic optional content stays intentionally empty | All public global reads use `fallbackLocale: false`. Collection reads use exact localized documents whenever the required translation marker exists, so optional Arabic fields are not repopulated from English. |
| Explicit untranslated-content fallback | When an Arabic collection record has no required translation marker, `src/cms/queries.ts` explicitly returns the whole English record. `getTranslatedLocales` still reports only real translations, so the Arabic URL remains `noindex`, canonicals to English, and omits an Arabic hreflang. |
| Independent section/CTA controls | Homepage section visibility (seven sections), homepage story-card visibility, and article CTA visibility are localized. The generated migration copies each former shared value into every existing English and Arabic locale row before dropping the shared column. |
| Migration preservation | `test:localized-visibility-db` captured the populated database before migration and verified every copied value in both locales afterward. |
| Focused editor behavior | `test:content-controls` clears an Arabic optional label, hides the Arabic article CTA, and hides the Arabic homepage Insights section; it proves the English values remain visible and unchanged, then restores every edit. It also verifies the explicit untranslated article fallback's English canonical and `noindex`. Result: **31/31 passed**. |
| CLI execution boundary | `scripts/payload.mjs` no longer treats stdout/stderr as a startup signal. The child sends an acknowledged IPC boundary immediately before `bin()`; only preparation timeouts before that boundary are retried. A mutating failure after the boundary is never retried and reports an indeterminate outcome requiring `npm run migrate:status` and database inspection. |
| Slow silent execution | `test:payload-wrapper` holds a fixture command silent for three times the preparation timeout after the boundary and proves it executes exactly once. Separate fixtures prove pre-boundary retry and post-boundary no-retry/status guidance. |

During verification, the first `migrate:create` invocation crossed the execution boundary and was then terminated by the external 122-second command ceiling. It was not retried by the wrapper. No migration file existed; `npm run migrate:status` confirmed the three prior migrations were applied before a deliberate manual retry generated the new migration successfully. This is the intended indeterminate-outcome workflow.

## Execution handshake and whole-record listing fallback correction

| Requirement | Verified implementation |
|---|---|
| Parent–child execution handshake | `scripts/payload.mjs` child sends `payload-cli:ready-to-execute` and waits for explicit parent `payload-cli:acknowledge-execution` before invoking `bin()`. Missing acknowledgment, IPC disconnect, or parent failure prevents invoking `bin()`. |
| Preparation timeout cancellation | Before acknowledging, the parent marks execution as potentially started (`stage = "execution"`) and cancels the preparation timeout (`clearTimeout(timer)`). If preparation has already timed out (`preparationTimedOut = true`), parent never acknowledges that attempt. |
| Non-retry after acknowledgment | Once acknowledgment may have been delivered, execution is marked as potentially started (`stage = "execution"`), so mutating failures report an indeterminate outcome and are never automatically retried. |
| Delayed acknowledgment regression check | `test:payload-wrapper` verifies delayed acknowledgment near/past the preparation timeout: the timer is cancelled before acknowledging, acknowledgment is delivered safely, and execution runs exactly once without retries (**4/4 passed**). |
| Genuine whole-record English listing fallback | In `preferExactTranslations()` (`src/cms/queries.ts`), records missing their Arabic translation marker are fetched as exact English records with `fallbackLocale: false`. Listing order, pagination, access controls, and draft behavior are strictly preserved. Records with their own translation marker keep exact Arabic reads, preserving intentionally empty optional fields. |
| Untranslated optional field isolation check | `test:content-controls` exercises an untranslated record with a populated Arabic optional field (`summary` and `intro`): verified that both its listing card (`/ar/projects`) and detail page (`/ar/projects/:slug`) use the English record without leaking the Arabic optional content (**37/37 passed after test-cleanup fix**). |

## Test-cleanup fix

Scope: test reliability only (`scripts/content-controls-check.ts`, `scripts/lib/test-fixtures.ts`, `scripts/restore-fixture-check.ts`); no application code changed. Results below are from runs against a production build of `590e72c` application code.

| Requirement | Implementation | Result |
|---|---|---|
| Parameterized project-locale queries | `scripts/lib/test-fixtures.ts` binds every value through Drizzle's `sql` template (no `sql.raw`, no string interpolation). Snapshots store the whole row as JSON, so apostrophes, empty strings and NULL are preserved exactly. The previous restore turned an empty string into NULL; that is fixed. If the row was deleted meanwhile, restore re-inserts the complete original row (all columns, including its id) from a bound JSON value. | Original values stored and restored exactly in every scenario (21/21) |
| A restoration failure fails the run; remaining cleanup is still attempted | Cleanup tasks run through `runCleanup()`, which attempts every task and returns each failure. Every failure becomes a `FAIL` check and the run exits 1. HTTP restores require a 2xx response (`expectOk`). The in-script self-verification sub-test now uses the same path; previously a failure in its restore escaped the top-level `finally` without being reported. | Cleanup runner check: the task after a failing one still ran, and the failure was reported. Negative runs: 5/6 tasks ran, the failed one was reported, exit 1 |
| Project fields verified after restoration | `verifyArLocale()` compares every column of the Arabic row with the snapshot taken before the test. It runs after the main cleanup and again after the self-verification sub-test (which previously did not verify its own restore). | "project Arabic locale fields match their original values (every column)" and "project row back to its pre-test state" — both PASS |
| Cache invalidation required before inspection and after restoration | `invalidateProjectCache()` throws when `PREVIEW_SECRET` is missing or blank, on a non-200 response, or when `revalidated !== true`. It is called before the changed pages are inspected, as a cleanup task after the main restore, and after the self-verification restore. | PASS with the configured secret (paths invalidated include `/ar/projects/<slug>`). Blank secret → "impossible: PREVIEW_SECRET is not set (or blank)", exit 1. Rejected secret → "rejected: HTTP 401", exit 1 |
| Restoration with apostrophe, empty string and NULL, including a simulated assertion failure | `npm run test:restore-fixtures` (database only). Scenarios: `O'Brien's “quoted” project` / `""` / NULL; NULL / SQL-like text with quotes / `""`; all `""`; all NULL; no Arabic row; an existing row deleted mid-test. Each scenario mutates the row, throws a simulated assertion failure, cleans up, and verifies every column. Also checks that the cleanup runner continues after a failing task. The project's real Arabic row is snapshotted first and verified at the end. | **21/21 passed** |

Typecheck: `npm run typecheck` exit 0. A broad regression rerun was not needed: the focused checks found no application failure.

Observed during these runs (not caused by this change): 5 Payload CLI invocations printed nothing and hung until the hard 300-second limit killed them. That is 4 of the last 9 bounded runs, plus the first negative run. In each case the test had not yet written anything (each script prints before its first database write), so the run was simply repeated. The current wrapper (`590e72c`) has no time limit once execution has been acknowledged, so the runs above were bounded externally. The cause has not been confirmed.

## Field-to-rendered-element checklist

Legend: ✅ rendered from CMS · ⚙️ behavioral (affects output, not displayed) · ⛔ exception (see below)

### Site Settings
| Field | Rendered as |
|---|---|
| siteName | Header/footer wordmark, `<title>` template, OG site name ✅ |
| branding.logo | Header logo (replaces mark) ✅ |
| branding.logoLight | Footer logo (falls back to logo) ✅ |
| branding.favicon | `<link rel="icon">` (falls back to `/favicon.svg`) ✅ |
| brandColors.primary/accent/dark | `--blue` / `--cyan` / `--navy` tokens ✅ |
| defaultSeo.title/description/ogImage | Fallback title/description/OG image ✅ |
| socialLinks | Footer legal row ✅ |
| footerHeading/footerInvitation/footerCtaLabel | Footer lead block ✅ |
| copyright/location | Footer legal row ✅ |

### Navigation
| Field | Rendered as |
|---|---|
| items (label, href) | Header nav + footer nav, `/ar` prefixed ✅ |
| headerCta (label, href) | Header button ✅ |

### Home Page
| Field | Rendered as |
|---|---|
| heroIndex, heroTitleA, heroTitleB, heroCopy | Hero ✅ |
| heroPrimaryCta / heroSecondaryCta (label, href) | Hero links ✅ |
| sectionOrder | Order of the seven sections ✅ |
| *.visible (7 sections + story card, localized) | Section shown/hidden independently for English and Arabic ✅ |
| showcaseSection.stageLabel/stageNote | Product stage labels ✅ |
| selectedWorkSection.label/title | Section head ✅ |
| featuredProduct / secondaryProduct (+ eyebrows, productCtaLabel) | Feature + mini product cards (name, summary, mockup by visualType) ✅ |
| storyCard (source, visualIndex, visualText, eyebrow, title, description, cta) | Story card; `source: featuredProject` shows the first published featured project ✅ |
| capabilitiesSection.label/title | Section head + published services list ✅ |
| productsDarkSection.label/title/ctaPrefix | Dark section; each product's tagline, homeDescription ✅ |
| approachSection.label/title/phases | Approach grid ✅ |
| perspectiveSection (eyebrow, title, description, cta, image/imageUrl/imageAlt) | Perspective block ✅ |
| insightsSection.label/title | Section head + latest published posts ✅ |
| seo.* | Home metadata ✅ |

### About / Contact / Listing pages / Site labels
| Field | Rendered as |
|---|---|
| About: kicker, title, intro, image/imageUrl/imageAlt, manifesto*, principles, seo | About page ✅ |
| Contact: kicker, title, intro, directEmail, directNote, boundaryNotice, seo | Contact page ✅ |
| Listing pages ×4: kicker, title, intro, seo | Listing heroes + metadata ✅ |
| Contact: form group (20 strings) | Tabs, form headings, field labels and placeholders, validation messages, submit, status prefix, direct-contact label ✅; choices from published Products/Services ✅ |
| Listing pages: services.cardNote, insights.sectionLabel/sectionTitle | Service card sentence, insights section head ✅ |
| Labels — buttons: viewProject, explore, readStory, seeService, requestDemo, discussProject, allProjects, previousPage, nextPage | Buttons and pagination ✅ (exploreWork, startProject, viewProduct are kept for editors; homepage/header CTAs use their own fields and never fall back to them) |
| Labels — navigation & accessibility: backToTop, skipToContent, changeLanguage, languageToggle, mainNavigation, openMenu, closeMenu | Back-to-top, skip link, language switch text and aria label, nav and menu aria labels ✅ |
| Labels — projects: sector, services, year, technology, visitClientSite, relatedProjectsLabel/Title, projectList, filterProjects, projectPages, draftPreview, draftPreviewNote | Project facts, client link, related section, listing aria labels, editor draft notice ✅ |
| Labels — articles: contents, moreInsightsLabel/Title, articleCta (localized visible, eyebrow, title, label, href) | Article TOC heading, more-insights head, article CTA; visibility is independent by locale ✅ |
| Labels — services & products: serviceKicker, onThisPage, problemNav, deliverablesNav, processNav, nextStepNav, coreWorkflow, interfaceTour, interfaceTourTitle, faq, faqTitle | Service hero kicker and page nav; product section heads ✅ |
| Labels — error pages: notFoundEyebrow/Title/Body/Link, errorEyebrow/Title/Body/Retry | 404 page and its `<title>`; 500 views (loaded client-side) ✅ |

### Collections
| Collection | Fields rendered | Notes |
|---|---|---|
| Projects | slug, title, client (name, logo, logoDescription, website, displayMode), summary (cards), intro (hero), sector, year, services, techStack, cardImage, heroImage, externalLinks, blocks (intro, richText, image, metrics, quote, cta) in order, relatedProjects (editor order, unpublished skipped), seo ✅ | featured → homepage story card; displayOrder → sorting ⚙️; previousSlugs → redirect history ⚙️ |
| Services | number, slug, title, shortDescription, heroIntro, problem/deliverables/process/next eyebrow+heading+text, deliverables, seo ✅ | displayOrder ⚙️ |
| Products | name, badge, tagline, summary, homeDescription, heroHeadline, heroDescription, visualType, valuePoints, workflowSteps, workflowTitle, tourTitle, tourDescription, faqs, seo ✅ | displayOrder ⚙️; category ⛔ |
| Posts | title, category/categoryLabel, author (name, initials, role, avatar), publishedAt, readTime, color, excerpt, coverImage, coverLabel/Subtext/Caption, leadParagraph, sections (TOC + Lexical body + quote), seo ✅ | |
| Media | url, alt, width/height everywhere images render ✅ | description, caption ⛔ |
| Authors | name, initials, role, avatar ✅ | bio ⛔ |
| Redirects | from, to, statusCode (308 or 307) ⚙️ | |

## Remaining exceptions (not rendered / not CMS-editable)

1. **Mockup illustrations (intentional design components)** — the dashboard and phone mockups in `src/components/mockups/`, including the sample text drawn inside them ("Operations overview", "Roasted herb bowl", figures), are illustrations, not content. Editors choose which one a product uses through `visualType`; their contents are not editable and are hidden from assistive technology (`aria-hidden`).
2. **500 message when the CMS is unreachable** — the 500 views load the editable Site Labels copy from the public API. When the CMS itself cannot answer (the usual cause of a 500), a minimal built-in message is shown instead ("This page couldn’t be loaded. Please try again shortly." or its Arabic equivalent) with the error reference.
3. **Development-fixture notice** — shown only with `INHERITIX_DEV_FIXTURES=true` outside production; its wording stays in code.
4. **`products.category`, `media.description`, `media.caption`, `authors.bio`** — stored editorial metadata with no place in the approved design; not rendered.
5. **Intentional untranslated-record fallback** — exact-locale reads preserve intentionally empty Arabic optional fields. Only a record with no Arabic required translation marker explicitly falls back as a whole to English; that Arabic URL is `noindex`, canonicals to English, and advertises only its available translations.
6. **Story card default link** changed from `/projects/operations-platform` (an unapproved sample, now a draft → 404) to `/services/custom-software`.
7. **Statically generated pages during a DB outage** keep serving their last successful render (ISR); dynamic pages return 500.
8. **Payload CLI startup stall (observed behavior)** — on this machine (Payload 3.90.2, tsx 4.22.4, Node 22.16, Windows 11) the stock `payload` bin can stall during startup; the root cause remains unconfirmed. Console silence is not evidence that database work has not begun. `scripts/payload.mjs` now uses an acknowledged IPC execution boundary immediately before `bin()`, retries only preparation timeouts before that boundary, and never automatically retries a mutating command afterward. An abnormal post-boundary outcome requires `npm run migrate:status` and database inspection.
9. **PostgreSQL version** — verified on 14.18 (16 is not available locally without Docker).
10. **Contact form persistence and email delivery** remain Milestone Three, as instructed.

## Screenshots (`artifacts/m2-verification/`)

01 editor dashboard (no "+" on Users) · 02 editor post edit view · 03 Lexical field in admin · 04 publish success · 05 admin media upload drawer · 06 media created & attached · 07 public article with uploaded cover + CMS branding · 08 public article rich text (admin bold edit; before paragraph-spacing fix) · 09 editor draft preview · 10 same URL after logout → 404 · 11 admin dashboard · 12 Site Settings branding · 13 brand colors edited in admin · 14 Page Home hero tab · 15 section order tab · 16 visibility toggles · 17 public home EN · 18 public home AR (RTL) · 19 CMS-selected product cards · 20 second article rich text (list, bold)
