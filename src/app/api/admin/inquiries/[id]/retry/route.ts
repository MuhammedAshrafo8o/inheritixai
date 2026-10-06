import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { sql } from "@payloadcms/db-postgres"
import { getPayloadClient } from "@/cms/queries"
import { getPrivateEmailSettings } from "@/email/smtp"
import { requireAdmin } from "@/inquiries/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function rowsOf<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  return ((result as { rows?: T[] })?.rows ?? [])
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await getPayloadClient()
  const admin = await requireAdmin(request, payload)
  if (!admin) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHORIZED", message: "Administrator authentication and same-origin access are required." },
      { status: 403 }
    )
  }

  let body: { acknowledgeDuplicate?: boolean } = {}
  try {
    const text = await request.text()
    if (text.trim()) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ ok: false, code: "INVALID_JSON", message: "Invalid JSON request body." }, { status: 400 })
  }

  const { id } = await context.params
  const numericId = Number(id)
  if (!Number.isInteger(numericId)) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND", message: "The inquiry was not found." }, { status: 404 })
  }

  try {
    const settings = await getPrivateEmailSettings(payload)
    if (!settings.notificationsEnabled) {
      return NextResponse.json(
        { ok: false, code: "NOTIFICATIONS_DISABLED", message: "Enable notifications before queueing a retry." },
        { status: 409 }
      )
    }

    const result = await payload.db.drizzle.transaction(async (tx) => {
      const rowsResult = await tx.execute(sql`
        SELECT id, notification_status AS "notificationStatus"
        FROM "inquiry_records"
        WHERE id = ${numericId}
        FOR UPDATE
      `)
      const rows = rowsOf<{ id: number; notificationStatus: string }>(rowsResult)
      if (rows.length === 0) {
        return { status: 404, ok: false, code: "NOT_FOUND", message: "The inquiry was not found." }
      }

      const currentStatus = String(rows[0].notificationStatus)
      if (currentStatus === "uncertain" && body.acknowledgeDuplicate !== true) {
        return {
          status: 409,
          ok: false,
          code: "DUPLICATE_ACKNOWLEDGMENT_REQUIRED",
          message: "Retrying an uncertain notification requires explicit administrator acknowledgment that delivery may be duplicated.",
        }
      }

      if (currentStatus !== "failed" && currentStatus !== "uncertain") {
        return {
          status: 409,
          ok: false,
          code: "INVALID_STATE",
          message: `Cannot retry notification in status “${currentStatus}”. Only failed or uncertain notifications can be retried.`,
        }
      }

      const now = new Date().toISOString()
      await tx.execute(sql`
        UPDATE "inquiry_records"
        SET
          "notification_status" = 'pending',
          "notification_attempts" = 0,
          "notification_next_attempt_at" = ${now},
          "notification_locked_at" = NULL,
          "notification_failure_code" = NULL,
          "updated_at" = ${now}
        WHERE id = ${numericId}
      `)

      const orderResult = await tx.execute(sql`
        SELECT COALESCE(MAX("_order"), 0) + 1 AS "nextOrder"
        FROM "inquiry_records_notification_events"
        WHERE "_parent_id" = ${numericId}
      `)
      const nextOrder = Number(rowsOf<{ nextOrder: number }>(orderResult)[0]?.nextOrder ?? 1)
      const eventId = randomBytes(12).toString("hex")

      await tx.execute(sql`
        INSERT INTO "inquiry_records_notification_events"
          ("_order", "_parent_id", "id", "occurred_at", "status", "code")
        VALUES
          (${nextOrder}, ${numericId}, ${eventId}, ${now}, 'manual-retry', 'administrator')
      `)

      return { status: 200, ok: true, code: "RETRY_QUEUED", message: "Notification retry queued." }
    })

    return NextResponse.json({ ok: result.ok, code: result.code, message: result.message }, { status: result.status })
  } catch (error) {
    console.error("[inquiry-retry] retry transition failed:", error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { ok: false, code: "INTERNAL_ERROR", message: "Failed to queue notification retry." },
      { status: 500 }
    )
  }
}
