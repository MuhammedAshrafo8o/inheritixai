import { NextResponse } from "next/server"
import { getPayloadClient } from "@/cms/queries"
import { getPrivateEmailSettings } from "@/email/smtp"
import { requireAdmin } from "@/inquiries/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const payload = await getPayloadClient()
  const admin = await requireAdmin(request, payload)
  if (!admin) return NextResponse.json({ ok: false, message: "Administrator authentication and same-origin access are required." }, { status: 403 })
  const { id } = await context.params
  try {
    const settings = await getPrivateEmailSettings(payload)
    if (!settings.notificationsEnabled) return NextResponse.json({ ok: false, message: "Enable notifications before queueing a retry." }, { status: 409 })
    const inquiry = await payload.findByID({ collection: "inquiry-records" as never, id, overrideAccess: true, depth: 0 }) as unknown as { notificationStatus?: string; notificationEvents?: unknown[] }
    if (!new Set(["failed", "uncertain"]).has(String(inquiry.notificationStatus))) {
      return NextResponse.json({ ok: false, message: "Only failed or uncertain notifications can be retried." }, { status: 409 })
    }
    await payload.update({
      collection: "inquiry-records" as never,
      id,
      data: { notificationStatus: "pending", notificationAttempts: 0, notificationNextAttemptAt: new Date().toISOString(), notificationLockedAt: null, notificationFailureCode: null, notificationEvents: [...(inquiry.notificationEvents || []), { occurredAt: new Date().toISOString(), status: "manual-retry", code: "administrator" }] } as never,
      overrideAccess: true,
      context: { inquirySystemOperation: true },
    })
    return NextResponse.json({ ok: true, message: "Notification retry queued." })
  } catch {
    return NextResponse.json({ ok: false, message: "The inquiry was not found or could not be updated." }, { status: 404 })
  }
}
