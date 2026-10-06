import { NextResponse } from "next/server"
import { getPayloadClient } from "@/cms/queries"
import { createSmtpTransport, getPrivateEmailSettings, safeMailbox, sanitizeSmtpError } from "@/email/smtp"
import { consumeRateLimit, privacyHash, requireAdmin } from "@/inquiries/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const payload = await getPayloadClient()
  const admin = await requireAdmin(request, payload)
  if (!admin) return NextResponse.json({ ok: false, message: "Administrator authentication and same-origin access are required." }, { status: 403 })
  const settings = await getPrivateEmailSettings(payload)
  const rate = await consumeRateLimit(payload, `admin-email-test:${privacyHash(String(admin.id))}:${new Date().toISOString().slice(0, 13)}`, settings.adminTestLimitPerHour)
  if (!rate.allowed) return NextResponse.json({ ok: false, message: "Test messages are temporarily rate limited." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } })
  try {
    const transport = createSmtpTransport(settings)
    const info = await transport.sendMail({
      from: safeMailbox(settings.senderName, settings.senderEmail),
      to: safeMailbox("Inheritix notifications", settings.notificationRecipient),
      subject: "[Inheritix] SMTP test",
      text: "This is an administrator-requested SMTP acceptance test from the Inheritix CMS. Acceptance does not confirm inbox delivery.",
      html: "<p>This is an administrator-requested SMTP acceptance test from the Inheritix CMS.</p><p>SMTP acceptance does not confirm inbox delivery.</p>",
      disableFileAccess: true,
      disableUrlAccess: true,
    })
    if (Array.isArray(info.accepted) && info.accepted.length === 0) throw Object.assign(new Error("No recipients accepted"), { code: "EENVELOPE" })
    await payload.updateGlobal({ slug: "email-settings" as never, data: { lastTestEmailStatus: "accepted", lastTestEmailAt: new Date().toISOString(), lastTestEmailCode: null } as never, overrideAccess: true, context: { emailSettingsSystemOperation: true } })
    return NextResponse.json({ ok: true, message: "SMTP accepted the test message. Inbox delivery is not confirmed." })
  } catch (error) {
    const result = sanitizeSmtpError(error)
    await payload.updateGlobal({ slug: "email-settings" as never, data: { lastTestEmailStatus: "failed", lastTestEmailAt: new Date().toISOString(), lastTestEmailCode: result.code } as never, overrideAccess: true, context: { emailSettingsSystemOperation: true } })
    return NextResponse.json({ ok: false, message: `SMTP did not accept the test message (${result.code}).` }, { status: 502 })
  }
}
