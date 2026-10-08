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

- `email-settings`: administrator-only SMTP host, port, TLS mode, username, password replace/clear controls, sender, recipient, throttling values, and sanitized connection/test outcomes. Editors and anonymous callers are denied server-side. The `smtpPassword` field is rendered using a dedicated masked password field (`MaskedPasswordField`), which uses `type="password"`, never preloads or returns the stored secret to the browser, and preserves masking while typing. Source review confirms that the component clears its local value when Payload reports a new document update time; the browser check in this milestone verifies masking and the initially empty value, not a successful save/clear round trip.

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
- `POST /api/admin/inquiries/:id/retry`: atomically resets an eligible notification to `pending`. Inside one PostgreSQL transaction it selects the inquiry with `SELECT ... FOR UPDATE`, checks the locked row is still `failed` or `uncertain`, updates that locked ID, and inserts the `manual-retry` audit event before commit. The `UPDATE` is by ID and does not contain a second status predicate; safety comes from the preceding row lock plus the state check in the same transaction. If the locked state is `uncertain`, `acknowledgeDuplicate: true` is required. A concurrent loser acquires the lock after the winner commits, observes `pending`, and receives HTTP 409. Database/configuration errors are not mapped to 404, and the admin UI refreshes the displayed state after completion.

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

### Message-stream signal and failure classification

The tracker begins at `pre-data`. A Nodemailer `stream` plugin wraps the source message stream: creating that stream sets `data-transmitting`, and the source stream's `end` event sets `data-transmitted`. This does **not** directly observe SMTP protocol initialization, the envelope exchange, bytes arriving at the remote server, or remote acceptance. `accepted` is set only after `sendMail()` resolves and reports an accepted recipient. Failure outcomes are classified as follows:
- **Known pre-delivery transient failure**: bounded exponential delays of 60, 120, 240, 480, then up to 3,600 seconds, with five attempts maximum (`retry-wait`).
- **Explicit permanent rejection (5xx / auth / config)**: stops immediately (`failed`).
- **Ambiguous failure after the source stream ended**: a connection failure after the message source stream's `end` event is conservatively marked `uncertain` (`uncertain-data-transmitted`). The signal does not prove remote receipt or acceptance; it only establishes that enough client-side progress occurred that an automatic resend could duplicate delivery. Workers do **not** automatically resend these messages.
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
   - Uses `SELECT ... FOR UPDATE`, evaluates the status from the locked row, updates that row by ID, and appends the audit event in the same transaction. The `UPDATE` itself has no status predicate.
   - Concurrent retry requests cannot reset a notification that is already `pending`, `processing`, or `accepted`.
   - Requeuing to `pending`, resetting attempt counts, and appending the retry audit event occur atomically.
   - Losing retry receives HTTP 409 conflict; database/configuration failures are never masked as 404.
   - For `uncertain` notifications, requires an explicit `acknowledgeDuplicate: true` parameter acknowledging potential duplicate delivery.
   - Automatically refreshes the displayed notification state after action completion.
   - The regression holds the row with an independent transaction, starts two authenticated retry requests, and waits until `pg_stat_activity` shows two distinct route connections blocked on the marked retry lock query. Releasing the barrier yields one 200 winner and one 409 loser; this replaces the old sequential state-rejection check.
   - A separate internal-only test barrier pauses `processNextInquiryNotification` immediately after the production worker claim. A stale retry observes `processing` and returns 409; releasing the worker produces exactly one captured SMTP message, one attempt, one manual-retry event, and one accepted event.

2. **Strict bounded stream consumption**:
   - Replaced unbounded buffer reading with chunked streaming byte consumption in `POST /api/inquiries`.
   - Counts incoming bytes, cancels the stream, and returns HTTP 413 (`PAYLOAD_TOO_LARGE`) immediately once 32 KiB (32,768 bytes) is exceeded, before JSON parsing or database queries.
   - Preserves early `Content-Length` header check without relying on it as the only defense.
   - Verified chunked stream without `Content-Length` exceeding 32 KiB, exact 32,768 byte boundary (accepted), and 32,769 byte boundary (rejected 413).

3. **Ambiguous SMTP outcomes**:
   - The Nodemailer stream plugin observes only source-message stream creation and end (`pre-data` -> `data-transmitting` -> `data-transmitted`); it does not observe protocol init/envelope stages or prove that a remote server received the source bytes.
   - If transport fails after the source stream ends, the worker conservatively classifies the result as `uncertain` (`uncertain-data-transmitted`) rather than risking an automatic duplicate.
   - Workers do not automatically resend `uncertain` notifications.
   - Database write failure after confirmed SMTP 250 OK is also classified as `uncertain`.
   - Verified with the local capture socket closing after it received the SMTP DATA terminator; this exercises the conservative classification but is not evidence of external-provider acceptance or inbox delivery.

4. **ContactForm interaction and request identity**:
   - Submitting state disables form fieldset and navigation tabs with `aria-busy="true"`, preventing tab switching and rapid repeated submissions while a request is in flight.
   - Each submission tracks a monotonically increasing attempt ID so delayed/stale responses cannot override subsequent form states.
   - Preserves entered form values across recoverable failures.
   - Unchanged network retry retains the exact same idempotency key and payload.
   - Editing any input automatically rotates the idempotency key, avoiding unnecessary 409 conflicts.
   - A headless-browser check uses a trusted DevTools keyboard activation event and verifies that the validation alert appears and focus moves to the first invalid field. This is keyboard submission evidence, not a claim that every tab-navigation path was manually exercised.

5. **Nodemailer dependency update**:
   - Upgraded from pinned `7.0.0` to `10.0.15` in `package.json` and synchronized `pnpm-lock.yaml`.
   - Resolves GHSA security advisories affecting Nodemailer 7.x/8.x (including GHSA-7h8v-3v9j-2h42 ReDoS and related transport vulnerabilities).
   - Zero deprecations or API disruptions; connection verification, sending, TLS handling, error classification, and local capture verified.

6. **Masked SMTP password entry**:
   - Implemented `MaskedPasswordField` (`src/payload/admin/MaskedPasswordField.tsx`) for `smtpPassword` in `EmailSettings`.
   - Renders with `type="password"`, never preloads the stored secret, and preserves masking while typing (verified via headless browser inspection). Clearing after a successful save is source-reviewed but was not exercised by that typing-only browser check.

7. **Portable test tooling & complete fixture regression**:
   - Removed unconditional `npm.cmd` invocations in migration/verification runners.
   - Replaced hardcoded `.pnpm` tsx paths with standard package declarations.
   - Configured optional platform-specific `@embedded-postgres` dependencies (`@embedded-postgres/linux-x64` alongside `@embedded-postgres/windows-x64`).
   - Browser discovery accepts `CHROME_PATH`, checks common Chrome/Chromium/Edge locations on Windows and Linux, validates executability, and fails nonzero on startup, navigation, login, missing-field, or required-check failures. It does not disable the browser sandbox.
   - Disposable PostgreSQL runs generate temporary database, admin/editor, Payload, preview, encryption, and HMAC credentials in process memory, pass them through the child environment, and never use normal development credentials.
   - Content-control test suite equipped with self-contained published project and legacy redirect fixture provisioning and parameterized restoration.

---

## Verification boundaries and results

### 1. Source review
- The final diff was reviewed for unrelated files, generated test artifacts, browser/profile paths, and credential literals.
- The browser test has no fallback account password. Disposable database and administrator/editor passwords are generated per run and remain in process memory/environment.
- Figma Make design tokens, typography, motion reveals, and bilingual RTL layouts remain intact.

### 2. Automated local execution for the four review corrections
Environment actually executed: Microsoft Windows NT `10.0.26100.0`, Node `v22.16.0`, Chrome `154.0.8037.98`, Payload 3.90.2, disposable PostgreSQL 16 (`embedded-postgres`), and loopback SMTP capture. No real external service or email provider was contacted. Linux browser discovery was implemented and source-reviewed but was **not executed on Linux**.

- `node scripts/with-disposable-postgres.mjs npx.cmd tsx scripts/inquiries-check.ts` â€” **exit 0, 50/50 checks passed**:
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
  - When the local capture server closes after receiving the DATA terminator and the source stream has ended, the worker conservatively records `uncertain-data-transmitted` and does not automatically resend.
  - Abandoned worker processing older than 15m becomes `uncertain`.
  - Role-based access control: anonymous/editor inquiry and secret access denied (403); administrator allowed (200).
  - Uncertain notification without duplicate acknowledgment rejected with 409.
  - Two retry requests were observed concurrently blocked on the same row through two distinct PostgreSQL connection PIDs; after barrier release, exactly one returned 200 and one returned 409, with one pending transition and one retry event.
  - The production worker claim was paused by an internal-only barrier; the overlapping stale retry returned 409, then the worker completed with one SMTP capture, one attempt, one retry event, and one accepted event.
  - Immutable visitor source data and database-failure 503 response.
- `node scripts/with-disposable-postgres.mjs node scripts/run-regression-suite.mjs` â€” **exit 0**:
  - Browser interaction checks (`scripts/contact-form-browser-check.mjs` via Chrome CDP): **12/12 required checks passed**:
    - Submitting state sets `aria-busy` and disables fieldset and buttons.
    - Tab switching blocked while request is pending.
    - Rapid repeated clicks do not dispatch duplicate requests.
    - Preserved entered values after network error.
    - Unchanged retry retains identical idempotency key.
    - Edited submission generates new idempotency key.
    - Successful submission displays contact confirmation with public reference.
    - Trusted browser keyboard submission displays the validation alert and focuses the first invalid input.
    - Generated disposable administrator authentication succeeds.
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
- `npm.cmd run typecheck` â€” **exit 0**, 0 TypeScript errors.
- `npm.cmd run build` â€” compilation and type validation succeeded, then the command **exited 1** during prerender because the developer `.env.local` points to an inactive PostgreSQL instance at `127.0.0.1:5433`; this was an environment failure, not recorded as a passing build.
- `npm.cmd run test:build` â€” **exit 0** against a fresh disposable PostgreSQL 16 database; all six migrations applied, seed completed, Next.js compiled, and all 22 static pages were generated without the insecure local-SMTP flag.

The strict failure behavior was also directly observed during harness correction: two restricted-sandbox attempts (default Chrome and explicit Edge) exited 1 with **0/12** required checks because their GPU subprocesses could not start; no SKIP was converted to a pass. A first unrestricted Chrome run exited 1 with **11/12** while the keyboard barrier was being corrected. The final unrestricted run above exited 0 with all 12 required checks and all 38 content checks. Chrome's browser sandbox was never disabled.

- With ephemeral administrator environment values and `CHROME_PATH=C:\definitely-missing\chrome.exe`, `node scripts/contact-form-browser-check.mjs` exited **1** before browser startup with a clear executable-validation error. The ephemeral password is intentionally omitted from this report and was not printed by the harness.

### 3. Earlier Milestone Three evidence retained, not rerun for this correction

The reviewed commit `c45a2a16940e616bad812dd8c34e5e0cd27c4ea4` recorded `npm run test:payload-wrapper` at **4/4** and `npm run test:migrations:m3` with all six migrations applied and no drift. Those gates were not repeated because these four corrections do not change schema, migrations, or the Payload CLI handshake. The current regression run nevertheless applied all six migrations successfully to its fresh disposable database before testing.

Representative visual evidence is preserved in `artifacts/milestone-three/`:
- `contact-success-en-mobile.png`
- `contact-success-ar-tablet.png`
- `contact-validation-en-desktop.png`
- `admin-inquiries-list.png`
- `admin-inquiry-detail-failed-retry.png`
- `admin-email-settings-secret-hidden.png`

### 4. Unverified production boundaries
Local automation confirms loopback SMTP command handling/capture, message rendering, credential encryption/redaction, connection error handling, and conservative classification after the local server receives the DATA terminator. It does **not** verify a real TLS or STARTTLS negotiation, external-provider acceptance, or inbox delivery.
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
