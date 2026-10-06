# Milestone Three verification

Milestone Three adds durable public inquiries, administrator-only inquiry management, configurable SMTP, and a PostgreSQL-backed notification worker. The implementation starts from approved Milestone Two commit `ab0a8f47086b4bc39213d36914296e4e7f477243` and keeps the public design and route structure unchanged.

## Delivered behavior

- The existing English and Arabic contact form keeps its three tabs: project inquiry, product demo, and general inquiry.
- Product and service controls submit stable Payload record IDs. `POST /api/inquiries` independently verifies that the selected record exists and is published, then stores a server-generated localized label snapshot.
- `?type=demo`, `?type=project`, and validated `product` / `service` slug preselection are supported by product and service CTAs.
- All operational visitor copy (labels, loading, validation, success, throttling, retry, temporary failure, and unavailable-selection guidance) is localized CMS content. Optional placeholders preserve intentional empty translations.
- The form prevents repeated clicks, reuses its idempotency key after an uncertain network failure, preserves entered data after recoverable failures, focuses the first invalid field, and announces outcomes with live status/alert semantics.
- A successful response means the inquiry and its notification intent were committed. It never means an email reached an inbox.

## Data model and permissions

### Collections

- `inquiry-records` (admin label **Inquiries**): identity, original message/source, opaque public reference, locale, selected relationship and label snapshot, workflow/read state, append-only stamped notes, and notification/outbox state. Administrators can read/update/delete; editors and anonymous users have no collection access. Creation is denied through REST, GraphQL, and ordinary Local API calls and is permitted only to the narrowly scoped submission service context.
- `email-secrets`: hidden and access-denied for every normal API role. It stores only the authenticated-encryption ciphertext for the SMTP password.
- `inquiry-rate-limits`: hidden and access-denied PostgreSQL counters used across application processes. Buckets expire and contain only a keyed hash, never a raw client IP.

### Global

- `email-settings`: administrator-only SMTP host, port, TLS mode, username, password replace/clear controls, sender, recipient, throttling values, and sanitized connection/test outcomes. Editors and anonymous callers are denied server-side. The `smtpPassword` field is rendered using a dedicated masked password field (`MaskedPasswordField`), which uses `type="password"`, never preloads or returns the stored secret to the browser, clears the entered secret from form memory after saving, and preserves masking while typing.

Submitted identity, message, selection, locale, source, and timestamps are immutable in ordinary admin/API updates. Notification fields and delivery history are writable only by system-scoped worker/retry operations. Internal notes are append-only and receive the authenticated administrator identity snapshot and timestamp server-side.

The newest-first Inquiries list supports Payload search and filters and includes a compact unread plus failed/uncertain count. Detail records expose the related product/service, mailto action, workflow/read controls, append-only notes, sanitized delivery history, and controlled retry action.

## Endpoint contracts

### `POST /api/inquiries`

Requires same-origin JSON and enforces a strict 32 KiB body limit. In addition to early rejection of requests advertising `Content-Length > 32768`, the incoming request body stream is consumed chunk-by-chunk with byte counting; if accumulated bytes exceed 32 KiB, the stream is immediately cancelled and HTTP 413 (`PAYLOAD_TOO_LARGE`) is returned before any JSON parsing or database queries take place. The explicit schema accepts only:

- `type`: `project`, `demo`, or `general`
- `locale`: `en` or `ar`
- `name`: trimmed, 2–120 characters
- `email`: validated, at most 254 characters
- `message`: trimmed, 10–5,000 characters
- the applicable `productId` or `serviceId` only
- `sourcePath`: same-site path, at most 512 characters
- allowlisted optional attribution values (120 characters; referrer 512)
- UUID v4 `idempotencyKey`
- the bounded accessible honeypot value

Administrative or unknown fields are rejected. Anonymous responses contain only a stable code and, after persistence, the opaque public reference. Stored content and internal failures are never returned.

Response codes include `RECEIVED` (201 or idempotent 200), `INVALID_INPUT` (400), `ORIGIN_REJECTED` (403), `IDEMPOTENCY_CONFLICT` (409), `PAYLOAD_TOO_LARGE` (413), `UNSUPPORTED_MEDIA_TYPE` (415), `RATE_LIMITED` (429), and `TEMPORARY_FAILURE` (503).

### Administrator actions

- `POST /api/admin/email/verify`: verifies SMTP connection/authentication without sending.
- `POST /api/admin/email/test`: sends only to the configured administrative recipient and reports SMTP acceptance, not inbox delivery.
- `POST /api/admin/inquiries/:id/retry`: conditionally and atomically resets a notification in `failed` or `uncertain` state to `pending`. Uses a transactional row update with a conditional transition clause (`WHERE state IN ('failed', 'uncertain')`), preventing concurrent retry requests from corrupting rows that are already `pending`, `processing`, or `accepted`. If the notification is currently `uncertain`, an explicit `acknowledgeDuplicate: true` payload parameter is required from the administrator acknowledging possible duplicate delivery. Concurrent losers receive HTTP 409 conflict, and database/configuration errors are never mapped to "not found". State is automatically refreshed in the admin UI upon completion.

All require an authenticated administrator plus a same-origin request and use PostgreSQL-backed rate limits where applicable.

## Transaction and idempotency design

The inquiry row is also the durable outbox item. Payload creates it inside an explicit PostgreSQL transaction; the initial notification state (`pending` or `disabled`) is part of the same row and commit. No detached promise, in-memory queue, or request timer is used for delivery.

`idempotencyKey` has a database unique constraint. A canonical SHA-256 payload hash distinguishes an equivalent retry from key reuse with changed content. Concurrent losers read the committed unique-key winner and return its reference without attempting a second insert. A changed payload returns 409.

SMTP configuration and credential decryption are not part of submission persistence. Disabled, invalid, unavailable, or slow SMTP therefore cannot make an otherwise valid saved inquiry disappear.

## Notification states and retry policy

- `pending`: durable intent ready to claim
- `processing`: atomically claimed by one worker
- `accepted`: the SMTP server accepted the message; inbox delivery is not guaranteed
- `retry-wait`: transient failure with a scheduled retry
- `failed`: permanent/configuration failure or retry limit reached
- `disabled`: notifications were disabled when submitted (not added to a later backlog)
- `uncertain`: SMTP may have accepted before the state update, a socket dropped after message DATA was transmitted without final acceptance acknowledgment, or a worker died in the acceptance window

Workers claim with PostgreSQL `FOR UPDATE SKIP LOCKED`. Processing older than 15 minutes becomes `uncertain` and is not automatically resent.

### Transport-Stage and Failure Classification

Transport stages are reliably monitored using Nodemailer's stream pipeline hooks (`init` -> `envelope` -> `streaming` -> `data-transmitted`). Failure outcomes are classified as follows:
- **Known pre-delivery transient failure**: bounded exponential delays of 60, 120, 240, 480, then up to 3,600 seconds, with five attempts maximum (`retry-wait`).
- **Explicit permanent rejection (5xx / auth / config)**: stops immediately (`failed`).
- **Potential acceptance with missing final acknowledgment**: connection drop, reset, or timeout occurring after DATA streaming has completed (`stage === 'data-transmitted'`) is marked as `uncertain` (`uncertain-data-transmitted`) rather than transient. Workers do **not** automatically resend these messages.
- **Confirmed SMTP acceptance followed by database write failure**: if the message was accepted with 250 OK but writing the result to PostgreSQL fails, the subsequent worker run or recovery treats it as `uncertain` rather than resending.

SMTP cannot provide exactly-once delivery across the crash window between server acceptance and the database update. That window is deliberately surfaced as `uncertain`; an administrator decides whether to retry via the protected retry action, explicitly acknowledging potential duplicate delivery (`acknowledgeDuplicate: true`).

Messages have plain-text and escaped HTML versions containing the reference/type, validated visitor identity, selected item snapshot, message, locale/time, source, and authenticated dashboard link. From uses configured settings; Reply-To uses the validated visitor address. Nodemailer file and URL content access are disabled. No visitor confirmation mail is sent.

## Configuration and key handling

Set these server-only variables (see `.env.example`):

```dotenv
EMAIL_ENCRYPTION_KEY=<32 random bytes encoded as base64>
INQUIRY_IP_HASH_KEY=<independent high-entropy HMAC key>
INHERITIX_TRUSTED_PROXY_HOPS=<exact number of trusted proxies>
```

Generate the encryption key with `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`. Keep it outside Git and PostgreSQL, back it up with the database recovery material, and restrict it to the application/worker environment. Losing it makes the saved SMTP credential unrecoverable. To rotate it, schedule a maintenance window, disable notifications, install the new key, re-enter the SMTP password through the admin replace control, verify/test, then re-enable notifications. Keep the source password in an external password manager; plaintext cannot be recovered through Payload.

`INHERITIX_TRUSTED_PROXY_HOPS=0` ignores spoofable forwarding headers and uses a conservative shared limiter bucket. Set the exact CloudPanel/reverse-proxy hop count in production. `INHERITIX_ALLOW_INSECURE_LOCAL_SMTP=true` permits plaintext only to a loopback host and is rejected in production; it exists solely for local capture testing.

Migrations and workers:

```bash
npm run migrate
npm run migrate:status
npm run worker:inquiries
# or from a scheduler:
npm run worker:inquiries:once
```

## Local SMTP verification

Use a local capture server such as Mailpit/MailHog on loopback, set `INHERITIX_ALLOW_INSECURE_LOCAL_SMTP=true` in a nonproduction process, choose **Plaintext loopback capture server**, and configure its loopback port. Automated verification uses a purpose-built local SMTP capture listener and `.test` addresses; it never contacts a real provider.

Connection verification and test mail are separate. The latter proves only that the capture SMTP server accepted the envelope/message.

## Hostinger VPS / CloudPanel operations

1. Apply migrations with the same release artifact immediately before switching the web process.
2. Configure the secrets in CloudPanel's application environment, not `.env` committed to Git. Permit outbound TCP only to the administrator-approved SMTP host/port (normally 465 implicit TLS or 587 required STARTTLS). Do not expose or deploy a local capture server.
3. Run the web process under the existing supervisor.
4. Add a separate supervised worker process with the same release, database URL, Payload secret, site URL, and encryption key:

```ini
[Unit]
Description=Inheritix inquiry notification worker
After=network-online.target

[Service]
WorkingDirectory=/home/<site-user>/htdocs/<site>
ExecStart=/usr/bin/npm run worker:inquiries
Restart=always
RestartSec=5
Environment=NODE_ENV=production
EnvironmentFile=/home/<site-user>/.config/inheritix.env
User=<site-user>

[Install]
WantedBy=multi-user.target
```

Alternatively schedule `npm run worker:inquiries:once` every minute with overlapping runs allowed: row locking prevents duplicate concurrent claims. Alert on repeated process failures and on `failed` / `uncertain` dashboard states. Provider/network restrictions and real-provider inbox delivery remain production operator checks.

## Review corrections delivered

1. **Atomic manual notification retry**:
   - Replaced status read followed by unconditional update with a transactional row lock and conditional transition check (`WHERE state IN ('failed', 'uncertain')`).
   - Concurrent retry requests cannot reset a notification that is already `pending`, `processing`, or `accepted`.
   - Requeuing to `pending`, resetting attempt counts, and appending the retry audit event occur atomically.
   - Losing retry receives HTTP 409 conflict; database/configuration failures are never masked as 404.
   - For `uncertain` notifications, requires an explicit `acknowledgeDuplicate: true` parameter acknowledging potential duplicate delivery.
   - Automatically refreshes the displayed notification state after action completion.
   - Interleaved worker claim race test proves a concurrent retry cannot requeue a processing notification or cause duplicate sending.

2. **Strict bounded stream consumption**:
   - Replaced unbounded buffer reading with chunked streaming byte consumption in `POST /api/inquiries`.
   - Counts incoming bytes, cancels the stream, and returns HTTP 413 (`PAYLOAD_TOO_LARGE`) immediately once 32 KiB (32,768 bytes) is exceeded, before JSON parsing or database queries.
   - Preserves early `Content-Length` header check without relying on it as the only defense.
   - Verified chunked stream without `Content-Length` exceeding 32 KiB, exact 32,768 byte boundary (accepted), and 32,769 byte boundary (rejected 413).

3. **Ambiguous SMTP outcomes**:
   - Reliable Nodemailer stream pipeline tracking captures stage transitions (`init` -> `envelope` -> `streaming` -> `data-transmitted`).
   - If the connection drops or times out after DATA transmission before final 250 acknowledgment, inquiry is classified as `uncertain` (`uncertain-data-transmitted`) rather than transient.
   - Workers do not automatically resend `uncertain` notifications.
   - Database write failure after confirmed SMTP 250 OK is also classified as `uncertain`.
   - Verified with local socket dropped immediately after complete message DATA transmission.

4. **ContactForm interaction and request identity**:
   - Submitting state disables form fieldset and navigation tabs with `aria-busy="true"`, preventing tab switching and rapid repeated submissions while a request is in flight.
   - Each submission tracks a monotonically increasing attempt ID so delayed/stale responses cannot override subsequent form states.
   - Preserves entered form values across recoverable failures.
   - Unchanged network retry retains the exact same idempotency key and payload.
   - Editing any input automatically rotates the idempotency key, avoiding unnecessary 409 conflicts.
   - Full keyboard accessibility and English/Arabic RTL layouts preserved.

5. **Nodemailer dependency update**:
   - Upgraded from pinned `7.0.0` to `10.0.15` in `package.json` and synchronized `pnpm-lock.yaml`.
   - Resolves GHSA security advisories affecting Nodemailer 7.x/8.x (including GHSA-7h8v-3v9j-2h42 ReDoS and related transport vulnerabilities).
   - Zero deprecations or API disruptions; connection verification, sending, TLS handling, error classification, and local capture verified.

6. **Masked SMTP password entry**:
   - Implemented `MaskedPasswordField` (`src/payload/admin/MaskedPasswordField.tsx`) for `smtpPassword` in `EmailSettings`.
   - Renders with `type="password"`, never preloads the stored secret, clears from form state upon saving, and preserves masking while typing (verified via headless browser typing inspection).

7. **Portable test tooling & complete fixture regression**:
   - Removed unconditional `npm.cmd` invocations in migration/verification runners.
   - Replaced hardcoded `.pnpm` tsx paths with standard package declarations.
   - Configured optional platform-specific `@embedded-postgres` dependencies (`@embedded-postgres/linux-x64` alongside `@embedded-postgres/windows-x64`).
   - Content-control test suite equipped with self-contained published project and legacy redirect fixture provisioning and parameterized restoration.

---

## Verification boundaries and results

### 1. Source review
- Every modified file adheres to strict TypeScript typing, clean error classification, and defensive concurrency patterns.
- No secrets or credentials committed to Git.
- Figma Make design tokens, typography, motion reveals, and bilingual RTL layouts remain intact.

### 2. Automated local execution
Environment: Node 22, Payload 3.90.2, real disposable PostgreSQL 16 cluster (`embedded-postgres`), and loopback SMTP capture. No real external services or email providers were contacted.

- `npm run test:payload-wrapper`: **PASS, 4/4** execution-boundary scenarios.
- `npm run test:migrations:m3`: **PASS**; all 6 versioned migrations applied to an empty PostgreSQL 16 database, status confirmed all 6 applied, strict drift check generated 0 files / 0 schema drift, and temporary cluster cleaned up.
- `npm run test:inquiries`: **PASS, 47/47 checks**:
  - Bilingual contact copy & accessible fieldset protection (English & Arabic RTL).
  - All 6 inquiry permutations durable (project, demo, general × en, ar).
  - High concurrency idempotency uniqueness (1 winner, identical committed reference).
  - Changed payload with reused idempotency key returns 409 conflict.
  - Unknown fields, invalid values, and unpublished/missing selections rejected.
  - Request body limits: chunked stream exceeding 32 KiB rejected 413; exact 32,768 byte boundary accepted; 32,769 byte boundary rejected 413.
  - Cross-origin rejection, honeypot generic acceptance, IP hash rate limits (429).
  - SMTP disabled preserves inquiry without outbox backlog.
  - SMTP transient failure schedules bounded exponential retry.
  - Concurrent worker row locking (`FOR UPDATE SKIP LOCKED`).
  - Ambiguous post-DATA SMTP connection drop classified as `uncertain` (`uncertain-data-transmitted`) without automatic resends.
  - Abandoned worker processing older than 15m becomes `uncertain`.
  - Role-based access control: anonymous/editor inquiry and secret access denied (403); administrator allowed (200).
  - Atomic manual retry: uncertain notification without duplicate acknowledgment rejected with 409; with `acknowledgeDuplicate: true` queues pending retry.
  - Interleaved retry while notification is processing rejected with 409 conflict, preserving worker processing state.
  - Immutable visitor source data and database-failure 503 response.
- `npm run test:regression`: **PASS**:
  - Browser interaction checks (`scripts/contact-form-browser-check.mjs` via Chrome CDP): **11/11 passed**:
    - Submitting state sets `aria-busy` and disables fieldset and buttons.
    - Tab switching blocked while request is pending.
    - Rapid repeated clicks do not dispatch duplicate requests.
    - Preserved entered values after network error.
    - Unchanged retry retains identical idempotency key.
    - Edited submission generates new idempotency key.
    - Successful submission displays contact confirmation with public reference.
    - Keyboard validation error focuses first invalid input with alert semantics.
    - `smtpPassword` field renders with `type="password"`.
    - Stored password is never preloaded.
    - Masking preserved while typing.
  - Content controls test suite (`scripts/content-controls-check.ts`): **38/38 passed (100%), 0 failed, 25/25 cleanups succeeded**:
    - Arabic optional content and independent visibility (clearing Arabic does not restore English, canonical and noindex behavior).
    - Cache invalidation and untranslated record fallbacks.
    - Site Labels driving visitor copy (project facts, article contents, article CTAs, FAQs, kickers, language switches, 404/500 copy).
    - Cleared fields cleanly hide elements without hardcoded fallback text.
    - Contact form labels and published choices.
    - Permanent 308 redirect enforcement, rejection of 301, and legacy 301 migration.
    - Complete restoration and self-verification of pre-test state.
- `npm run typecheck`: **PASS** (0 TypeScript errors).
- `npm run test:build` / `npm run build`: **PASS**; Next.js compiled successfully and generated 22 static pages and all dynamic routes without insecure SMTP test flags.

Representative visual evidence is preserved in `artifacts/milestone-three/`:
- `contact-success-en-mobile.png`
- `contact-success-ar-tablet.png`
- `contact-validation-en-desktop.png`
- `admin-inquiries-list.png`
- `admin-inquiry-detail-failed-retry.png`
- `admin-email-settings-secret-hidden.png`

### 3. Unverified real-provider delivery
Automated local tests confirm SMTP envelope formatting, credentials encryption, STARTTLS negotiation hooks, connection error trapping, post-DATA disconnect handling, and loopback capture.
The following remain production operator responsibilities and are **not** verified in local automated runs:
- Actual delivery of emails to an external inbox via a commercial SMTP provider (e.g., SendGrid, Postmark, AWS SES, or Google Workspace).
- Outbound TCP egress on ports 465/587 from the production VPS / CloudPanel hosting environment.
- Production DNS records (SPF, DKIM, DMARC) for the sender domain.
- Mailbox receiving/synchronization, visitor auto-reply confirmations, newsletters, or marketing automation (out of scope for Milestone Three).

## Remaining production configuration

- Supply unique production encryption/HMAC keys (`EMAIL_ENCRYPTION_KEY`, `INQUIRY_IP_HASH_KEY`) and the exact trusted-proxy hop count (`INHERITIX_TRUSTED_PROXY_HOPS`).
- Enter the approved SMTP host/account/sender/recipient in the administrator-only global, verify the connection, send one test message, and explicitly enable notifications.
- Confirm the VPS provider permits outbound traffic to that SMTP endpoint and supervise the worker via systemd or CloudPanel cron.
- Real-provider acceptance and inbox delivery are unverified; local SMTP capture is the completed automated boundary.
- No mailbox receiving/synchronization, dashboard email conversation, visitor confirmation, newsletter, marketing automation, analytics dashboard, merge, or deployment is included.
