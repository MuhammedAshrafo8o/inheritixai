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

- `email-settings`: administrator-only SMTP host, port, TLS mode, username, password replace/clear controls, sender, recipient, throttling values, and sanitized connection/test outcomes. Editors and anonymous callers are denied server-side.

Submitted identity, message, selection, locale, source, and timestamps are immutable in ordinary admin/API updates. Notification fields and delivery history are writable only by system-scoped worker/retry operations. Internal notes are append-only and receive the authenticated administrator identity snapshot and timestamp server-side.

The newest-first Inquiries list supports Payload search and filters and includes a compact unread plus failed/uncertain count. Detail records expose the related product/service, mailto action, workflow/read controls, append-only notes, sanitized delivery history, and controlled retry action.

## Endpoint contracts

### `POST /api/inquiries`

Requires same-origin JSON and rejects bodies over 32 KiB before parsing. The explicit schema accepts only:

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
- `POST /api/admin/inquiries/:id/retry`: requeues the same failed/uncertain notification row; it never creates a parallel job.

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
- `uncertain`: SMTP may have accepted before the state update, or a worker died in the acceptance window

Workers claim with PostgreSQL `FOR UPDATE SKIP LOCKED`. Processing older than 15 minutes becomes `uncertain` and is not automatically resent. Transient failures use bounded exponential delays of 60, 120, 240, 480, then up to 3,600 seconds, with five attempts maximum. Configuration/permanent failures stop immediately. Outcomes store only allowlisted failure codes and timestamps.

SMTP cannot provide exactly-once delivery across the crash window between server acceptance and the database update. That window is deliberately surfaced as `uncertain`; an administrator decides whether to retry, acknowledging possible duplicate delivery.

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

## Verification results

Environment: Node 22, Payload 3.90.2, real disposable PostgreSQL 16, and loopback SMTP capture. No real mail was sent.

- `npm run test:payload-wrapper`: **PASS, 4/4** execution-boundary scenarios.
- `npm run test:migrations:m3`: **PASS**; all six registered migrations applied to an empty PostgreSQL database, status showed all six ran, strict drift check generated no file, and the temporary cluster was removed.
- `npm run test:inquiries`: **PASS, 37/37** (English/Arabic and all types, validation/limits/origin/honeypot, published selections, database uniqueness under concurrency, changed-key conflict, SMTP disabled/failure/acceptance, worker locking/restart state, role denial, secret redaction, protected admin actions, immutable source data, and database-failure response).
- `scripts/content-controls-check.ts` through the direct TS runner: **30/33 passed; cleanup 21/21 passed**. All touched localization/contact-form/CMS-copy checks passed. Three baseline fixture-dependent assertions failed because this disposable seed intentionally has no published project and no legacy 301 redirect row; no edited fixture remained afterward.
- `npm run typecheck`: **PASS**.
- `npm run build`: **PASS**; Next.js compiled and generated 22 static pages, including all Milestone Three API/admin routes.

Representative evidence is stored in `artifacts/milestone-three/`:

- `contact-success-en-mobile.png`
- `contact-success-ar-tablet.png`
- `contact-validation-en-desktop.png`
- `admin-inquiries-list.png`
- `admin-inquiry-detail-failed-retry.png`
- `admin-email-settings-secret-hidden.png`

## Remaining production configuration

- Supply unique production encryption/HMAC keys and the exact trusted-proxy hop count.
- Enter the approved SMTP host/account/sender/recipient in the administrator-only global, verify the connection, send one test message, and explicitly enable notifications.
- Confirm the VPS provider permits outbound traffic to that SMTP endpoint and supervise the worker.
- Real-provider acceptance and inbox delivery are unverified; local SMTP capture is the completed automated boundary.
- No mailbox receiving/synchronization, dashboard email conversation, visitor confirmation, newsletter, marketing automation, analytics dashboard, merge, or deployment is included.
