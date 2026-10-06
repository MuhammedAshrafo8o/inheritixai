import { randomBytes } from "node:crypto"
import { NextResponse } from "next/server"
import { commitTransaction, createLocalReq, initTransaction, killTransaction } from "payload"
import { getPayloadClient } from "@/cms/queries"
import { getNotificationSettings } from "@/email/smtp"
import { clientIP, consumeRateLimit, isSameOrigin, privacyHash } from "@/inquiries/security"
import { inquiryPayloadHash, InquiryValidationError, MAX_INQUIRY_BODY_BYTES, parseInquiryInput } from "@/inquiries/schema"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function json(code: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: status < 400, code, ...extra }, { status })
}

function reference() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "")
  return `INQ-${date}-${randomBytes(5).toString("hex").toUpperCase()}`
}

async function existingSubmission(payload: Awaited<ReturnType<typeof getPayloadClient>>, idempotencyKey: string) {
  const existing = await payload.find({
    collection: "inquiry-records" as never,
    where: { idempotencyKey: { equals: idempotencyKey } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  return existing.docs[0] as unknown as { payloadHash?: string; publicReference?: string } | undefined
}

async function selection(payload: Awaited<ReturnType<typeof getPayloadClient>>, collection: "products" | "services", id: string, locale: "en" | "ar") {
  try {
    const localized = await payload.findByID({ collection, id, locale, fallbackLocale: false, draft: false, overrideAccess: false, depth: 0 }) as unknown as Record<string, unknown>
    if (localized?._status !== "published") return null
    const labelField = collection === "products" ? "name" : "title"
    let label = typeof localized[labelField] === "string" ? localized[labelField].trim() : ""
    if (!label && locale === "ar") {
      const english = await payload.findByID({ collection, id, locale: "en", fallbackLocale: false, draft: false, overrideAccess: false, depth: 0 }) as unknown as Record<string, unknown>
      label = typeof english[labelField] === "string" ? english[labelField].trim() : ""
    }
    return label ? { id: localized.id, label } : null
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json("ORIGIN_REJECTED", 403)
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return json("UNSUPPORTED_MEDIA_TYPE", 415)
  const advertised = Number(request.headers.get("content-length") || 0)
  if (advertised > MAX_INQUIRY_BODY_BYTES) return json("PAYLOAD_TOO_LARGE", 413)

  let raw: unknown
  try {
    const bytes = new Uint8Array(await request.arrayBuffer())
    if (bytes.byteLength > MAX_INQUIRY_BODY_BYTES) return json("PAYLOAD_TOO_LARGE", 413)
    raw = JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return json("INVALID_JSON", 400)
  }

  let input
  try {
    input = parseInquiryInput(raw)
  } catch (error) {
    if (error instanceof InquiryValidationError) return json(error.code, 400, { fields: error.fields })
    return json("INVALID_INPUT", 400)
  }

  // Accessible honeypot: bots receive a generic acceptance response, but no PII
  // or notification intent is persisted.
  if (input.website) return json("RECEIVED", 202)

  const hash = inquiryPayloadHash(input)
  try {
    const payload = await getPayloadClient()
    const prior = await existingSubmission(payload, input.idempotencyKey)
    if (prior) return prior.payloadHash === hash ? json("RECEIVED", 200, { reference: prior.publicReference }) : json("IDEMPOTENCY_CONFLICT", 409)

    // Submission persistence must not depend on decrypting or connecting to SMTP.
    const settings = await getNotificationSettings(payload)
    const bucket = `submission:${privacyHash(clientIP(request))}:${new Date().toISOString().slice(0, 13)}`
    const rate = await consumeRateLimit(payload, bucket, settings.submissionLimitPerHour)
    if (!rate.allowed) {
      const response = json("RATE_LIMITED", 429)
      response.headers.set("Retry-After", String(rate.retryAfter))
      return response
    }

    const selectedProduct = input.type === "demo" && input.productId ? await selection(payload, "products", input.productId, input.locale) : null
    const selectedService = input.type === "project" && input.serviceId ? await selection(payload, "services", input.serviceId, input.locale) : null
    if (input.type === "demo" && !selectedProduct) return json("INVALID_INPUT", 400, { fields: { productId: "unavailable" } })
    if (input.type === "project" && !selectedService) return json("INVALID_INPUT", 400, { fields: { serviceId: "unavailable" } })

    const publicReference = reference()
    const req = await createLocalReq({ context: { inquirySubmission: true } }, payload)
    const ownsTransaction = await initTransaction(req)
    try {
      await payload.create({
        collection: "inquiry-records" as never,
        data: {
          publicReference,
          idempotencyKey: input.idempotencyKey,
          payloadHash: hash,
          inquiryType: input.type,
          name: input.name,
          email: input.email,
          message: input.message,
          submissionLocale: input.locale,
          submittedAt: new Date().toISOString(),
          product: selectedProduct?.id,
          service: selectedService?.id,
          selectionLabelSnapshot: selectedProduct?.label || selectedService?.label,
          sourcePath: input.sourcePath,
          attribution: input.attribution,
          workflowStatus: "new",
          unread: true,
          notificationStatus: settings.notificationsEnabled ? "pending" : "disabled",
          notificationAttempts: 0,
          notificationNextAttemptAt: settings.notificationsEnabled ? new Date().toISOString() : undefined,
        } as never,
        overrideAccess: true,
        req,
      })
      if (ownsTransaction) await commitTransaction(req)
      return json("RECEIVED", 201, { reference: publicReference })
    } catch (error) {
      if (ownsTransaction) await killTransaction(req)
      // A concurrent request can lose the database uniqueness race after its
      // initial lookup. Read the committed winner regardless of how Payload
      // wrapped the PostgreSQL 23505; this also covers a very short visibility
      // delay without ever attempting a second insert.
      for (let attempt = 0; attempt < 10; attempt += 1) {
        try {
          const doc = await existingSubmission(payload, input.idempotencyKey)
          if (doc) return doc.payloadHash === hash ? json("RECEIVED", 200, { reference: doc.publicReference }) : json("IDEMPOTENCY_CONFLICT", 409)
        } catch { /* Preserve the original persistence failure below. */ }
        await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)))
      }
      throw error
    }
  } catch (error) {
    console.error("[inquiries] submission persistence failed", error instanceof Error ? error.name : "unknown")
    return json("TEMPORARY_FAILURE", 503)
  }
}
