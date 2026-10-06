import { NextResponse } from "next/server"
import { getPayloadClient } from "@/cms/queries"
import { createSmtpTransport, getPrivateEmailSettings, sanitizeSmtpError } from "@/email/smtp"
import { consumeRateLimit, privacyHash, requireAdmin } from "@/inquiries/security"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const payload = await getPayloadClient()
  const admin = await requireAdmin(request, payload)
  if (!admin) return NextResponse.json({ ok: false, message: "Administrator authentication and same-origin access are required." }, { status: 403 })
  const settings = await getPrivateEmailSettings(payload)
  const rate = await consumeRateLimit(payload, `admin-email-verify:${privacyHash(String(admin.id))}:${new Date().toISOString().slice(0, 13)}`, settings.adminTestLimitPerHour)
  if (!rate.allowed) return NextResponse.json({ ok: false, message: "SMTP checks are temporarily rate limited." }, { status: 429, headers: { "Retry-After": String(rate.retryAfter) } })
  try {
    await createSmtpTransport(settings).verify()
    await payload.updateGlobal({ slug: "email-settings" as never, data: { lastConnectionTestStatus: "succeeded", lastConnectionTestAt: new Date().toISOString(), lastConnectionTestCode: null } as never, overrideAccess: true, context: { emailSettingsSystemOperation: true } })
    return NextResponse.json({ ok: true, message: "SMTP connection and authentication succeeded. No email was sent." })
  } catch (error) {
    const result = sanitizeSmtpError(error)
    await payload.updateGlobal({ slug: "email-settings" as never, data: { lastConnectionTestStatus: "failed", lastConnectionTestAt: new Date().toISOString(), lastConnectionTestCode: result.code } as never, overrideAccess: true, context: { emailSettingsSystemOperation: true } })
    return NextResponse.json({ ok: false, message: `SMTP connection verification failed (${result.code}).` }, { status: 502 })
  }
}
