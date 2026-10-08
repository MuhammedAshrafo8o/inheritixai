import { sql } from "@payloadcms/db-postgres"
import type { Payload } from "payload"
import { getPayloadClient } from "@/cms/queries"
import { createTrackedSmtpTransport, escapeHtml, getPrivateEmailSettings, safeMailbox, sanitizeSmtpError, type TransportStage } from "./smtp"
import { getServerEnv } from "@/env"

export const MAX_NOTIFICATION_ATTEMPTS = 5
export const ABANDONED_AFTER_MINUTES = 15

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  return ((result as { rows?: T[] })?.rows ?? [])
}

async function systemUpdate(payload: Payload, id: string | number, data: Record<string, unknown>) {
  await payload.update({
    collection: "inquiry-records" as never,
    id,
    data: data as never,
    overrideAccess: true,
    context: { inquirySystemOperation: true },
  })
}

async function claim(payload: Payload) {
  const now = new Date().toISOString()
  await payload.db.drizzle.execute(sql`
    UPDATE "inquiry_records"
    SET "notification_status" = 'uncertain', "notification_failure_code" = 'worker-crash-window',
        "notification_locked_at" = NULL, "updated_at" = ${now}
    WHERE "notification_status" = 'processing'
      AND "notification_locked_at" < NOW() - INTERVAL '15 minutes'
  `)
  const result = await payload.db.drizzle.execute(sql`
    UPDATE "inquiry_records" SET
      "notification_status" = 'processing',
      "notification_attempts" = "notification_attempts" + 1,
      "notification_locked_at" = ${now},
      "notification_last_attempt_at" = ${now},
      "updated_at" = ${now}
    WHERE "id" = (
      SELECT "id" FROM "inquiry_records"
      WHERE "notification_status" IN ('pending', 'retry-wait')
        AND ("notification_next_attempt_at" IS NULL OR "notification_next_attempt_at" <= ${now})
      ORDER BY "notification_next_attempt_at" ASC NULLS FIRST, "submitted_at" ASC
      FOR UPDATE SKIP LOCKED LIMIT 1
    )
    RETURNING "id"
  `)
  return rowsOf<{ id: number | string }>(result)[0]?.id
}

/**
 * Internal synchronization seam for database-backed worker race tests. It is
 * deliberately available only to direct server-side callers of this module;
 * no route, Payload API, or worker command exposes it.
 */
export interface InquiryWorkerTestHooks {
  afterClaim?: (id: number | string) => Promise<void>
}

export function messageFor(doc: Record<string, unknown>) {
  const reference = String(doc.publicReference || "")
  const type = String(doc.inquiryType || "")
  const submittedAt = String(doc.submittedAt || "")
  const selected = String(doc.selectionLabelSnapshot || "—")
  const source = String(doc.sourcePath || "/")
  const locale = String(doc.submissionLocale || "en")
  const name = String(doc.name || "")
  const email = String(doc.email || "")
  const body = String(doc.message || "")
  const dashboard = `${getServerEnv().SITE_URL}/admin/collections/inquiry-records/${encodeURIComponent(String(doc.id))}`
  const lines = [
    `Inquiry ${reference}`, `Type: ${type}`, `Name: ${name}`, `Email: ${email}`,
    `Selected item: ${selected}`, `Locale: ${locale}`, `Submitted: ${submittedAt}`, `Source: ${source}`,
    "", "Message:", body, "", `Dashboard: ${dashboard}`,
  ]
  const row = (label: string, value: unknown) => `<tr><th align="left" style="padding:4px 12px 4px 0">${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`
  const html = `<h1>Inquiry ${escapeHtml(reference)}</h1><table>${row("Type", type)}${row("Name", name)}${row("Email", email)}${row("Selected item", selected)}${row("Locale", locale)}${row("Submitted", submittedAt)}${row("Source", source)}</table><h2>Message</h2><p>${escapeHtml(body).replace(/\r?\n/g, "<br>")}</p><p><a href="${escapeHtml(dashboard)}">Open inquiry in the authenticated dashboard</a></p>`
  return { subject: `[Inheritix] ${type.slice(0, 30)} — ${reference.slice(0, 40)}`, text: lines.join("\n"), html, email }
}

function withEvent(doc: Record<string, unknown>, data: Record<string, unknown>, status: string, code?: string | null) {
  const previous = Array.isArray(doc.notificationEvents) ? doc.notificationEvents : []
  return { ...data, notificationEvents: [...previous, { occurredAt: new Date().toISOString(), status, code: code || undefined }] }
}

export async function processNextInquiryNotification(provided?: Payload, testHooks?: InquiryWorkerTestHooks) {
  const payload = provided ?? await getPayloadClient()
  const id = await claim(payload)
  if (!id) return { processed: false as const }
  await testHooks?.afterClaim?.(id)
  const doc = await payload.findByID({ collection: "inquiry-records" as never, id, overrideAccess: true, depth: 0 }) as unknown as Record<string, unknown>
  const attempts = Number(doc.notificationAttempts || 1)
  let smtpAccepted = false
  const tracker: { stage: TransportStage } = { stage: "pre-data" }
  try {
    const settings = await getPrivateEmailSettings(payload)
    if (!settings.notificationsEnabled) {
      await systemUpdate(payload, id, withEvent(doc, { notificationStatus: "disabled", notificationLockedAt: null, notificationNextAttemptAt: null, notificationFailureCode: "disabled-before-delivery" }, "disabled", "disabled-before-delivery"))
      return { processed: true as const, status: "disabled" }
    }
    const content = messageFor(doc)
    const transport = createTrackedSmtpTransport(settings, tracker)
    const info = await transport.sendMail({
      from: safeMailbox(settings.senderName, settings.senderEmail),
      to: safeMailbox("Inheritix notifications", settings.notificationRecipient),
      replyTo: safeMailbox(String(doc.name || "Visitor"), content.email),
      subject: content.subject,
      text: content.text,
      html: content.html,
      disableFileAccess: true,
      disableUrlAccess: true,
    })
    smtpAccepted = Array.isArray(info.accepted) ? info.accepted.length > 0 : true
    if (!smtpAccepted) throw Object.assign(new Error("SMTP did not accept a recipient."), { code: "EENVELOPE" })
    tracker.stage = "accepted"
    await systemUpdate(payload, id, withEvent(doc, {
      notificationStatus: "accepted", notificationAcceptedAt: new Date().toISOString(),
      notificationLockedAt: null, notificationNextAttemptAt: null, notificationFailureCode: null,
    }, "accepted"))
    return { processed: true as const, status: "accepted" }
  } catch (error) {
    const classified = sanitizeSmtpError(error, tracker.stage)
    // Confirmed SMTP acceptance followed by database-write failure: uncertain
    if (smtpAccepted) {
      try {
        await systemUpdate(payload, id, withEvent(doc, {
          notificationStatus: "uncertain",
          notificationFailureCode: "accepted-state-write-failed",
          notificationLockedAt: null,
          notificationNextAttemptAt: null,
        }, "uncertain", "accepted-state-write-failed"))
      } catch { /* stale processing is converted to uncertain by the next worker */ }
      return { processed: true as const, status: "uncertain" }
    }

    // Potential acceptance with missing final acknowledgment (complete message transmitted): uncertain
    if (classified.outcome === "uncertain") {
      await systemUpdate(payload, id, withEvent(doc, {
        notificationStatus: "uncertain",
        notificationFailureCode: classified.code,
        notificationLockedAt: null,
        notificationNextAttemptAt: null,
      }, "uncertain", classified.code))
      return { processed: true as const, status: "uncertain" }
    }

    const retry = classified.retryable && classified.outcome === "retryable-transient" && attempts < MAX_NOTIFICATION_ATTEMPTS
    const delaySeconds = Math.min(3600, 60 * 2 ** Math.max(0, attempts - 1))
    await systemUpdate(payload, id, withEvent(doc, {
      notificationStatus: retry ? "retry-wait" : "failed",
      notificationFailureCode: classified.code,
      notificationLockedAt: null,
      notificationNextAttemptAt: retry ? new Date(Date.now() + delaySeconds * 1000).toISOString() : null,
    }, retry ? "retry-wait" : "failed", classified.code))
    return { processed: true as const, status: retry ? "retry-wait" : "failed" }
  }
}

export async function runInquiryWorker(options: { once?: boolean; pollMilliseconds?: number } = {}) {
  const once = options.once ?? false
  const poll = Math.max(1000, options.pollMilliseconds ?? 5000)
  do {
    const result = await processNextInquiryNotification()
    if (once) return result
    if (!result.processed) await new Promise((resolve) => setTimeout(resolve, poll))
  } while (true)
}
