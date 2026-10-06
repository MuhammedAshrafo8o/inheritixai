import { createHash } from "node:crypto"

export const MAX_INQUIRY_BODY_BYTES = 32 * 1024
export type InquiryType = "project" | "demo" | "general"
export type InquiryLocale = "en" | "ar"

export interface InquiryInput {
  type: InquiryType
  locale: InquiryLocale
  name: string
  email: string
  message: string
  productId?: string
  serviceId?: string
  sourcePath: string
  attribution?: { utmSource?: string; utmMedium?: string; utmCampaign?: string; referrer?: string }
  idempotencyKey: string
  website?: string
}

export type InquiryFieldErrors = Record<string, "required" | "invalid" | "too_short" | "too_long" | "unavailable">
export class InquiryValidationError extends Error {
  constructor(public fields: InquiryFieldErrors, public code = "INVALID_INPUT") { super(code) }
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,63}$/
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const ALLOWED = new Set(["type", "locale", "name", "email", "message", "productId", "serviceId", "sourcePath", "attribution", "idempotencyKey", "website"])
const ATTRIBUTION_ALLOWED = new Set(["utmSource", "utmMedium", "utmCampaign", "referrer"])

function boundedString(value: unknown, field: string, min: number, max: number, errors: InquiryFieldErrors, optional = false) {
  if (typeof value !== "string") { if (!optional) errors[field] = "required"; return "" }
  const trimmed = value.trim()
  if (!trimmed && optional) return ""
  if (trimmed.length < min) errors[field] = trimmed ? "too_short" : "required"
  else if (trimmed.length > max) errors[field] = "too_long"
  return trimmed
}

export function parseInquiryInput(value: unknown): InquiryInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InquiryValidationError({ form: "invalid" })
  const raw = value as Record<string, unknown>
  const errors: InquiryFieldErrors = {}
  for (const key of Object.keys(raw)) if (!ALLOWED.has(key)) errors.form = "invalid"
  const type = raw.type
  const locale = raw.locale
  if (!new Set(["project", "demo", "general"]).has(String(type))) errors.type = "invalid"
  if (!new Set(["en", "ar"]).has(String(locale))) errors.locale = "invalid"
  const name = boundedString(raw.name, "name", 2, 120, errors)
  const email = boundedString(raw.email, "email", 3, 254, errors).toLowerCase()
  if (email && !EMAIL.test(email)) errors.email = "invalid"
  const message = boundedString(raw.message, "message", 10, 5000, errors)
  const sourcePath = boundedString(raw.sourcePath, "sourcePath", 1, 512, errors)
  if (sourcePath && (!sourcePath.startsWith("/") || sourcePath.startsWith("//") || /[\r\n]/.test(sourcePath))) errors.sourcePath = "invalid"
  const idempotencyKey = boundedString(raw.idempotencyKey, "idempotencyKey", 36, 36, errors)
  if (idempotencyKey && !UUID.test(idempotencyKey)) errors.idempotencyKey = "invalid"
  const productId = boundedString(raw.productId, "productId", 1, 64, errors, true) || undefined
  const serviceId = boundedString(raw.serviceId, "serviceId", 1, 64, errors, true) || undefined
  if (type === "demo" && !productId) errors.productId = "required"
  if (type === "project" && !serviceId) errors.serviceId = "required"
  if (type !== "demo" && productId) errors.productId = "invalid"
  if (type !== "project" && serviceId) errors.serviceId = "invalid"

  let attribution: InquiryInput["attribution"]
  if (raw.attribution !== undefined) {
    if (!raw.attribution || typeof raw.attribution !== "object" || Array.isArray(raw.attribution)) errors.attribution = "invalid"
    else {
      const object = raw.attribution as Record<string, unknown>
      for (const key of Object.keys(object)) if (!ATTRIBUTION_ALLOWED.has(key)) errors.attribution = "invalid"
      attribution = {}
      for (const key of ATTRIBUTION_ALLOWED) {
        const maximum = key === "referrer" ? 512 : 120
        const parsed = boundedString(object[key], `attribution.${key}`, 0, maximum, errors, true)
        if (parsed) attribution[key as keyof NonNullable<InquiryInput["attribution"]>] = parsed
      }
    }
  }
  const website = boundedString(raw.website, "website", 0, 200, errors, true)
  if (Object.keys(errors).length) throw new InquiryValidationError(errors)
  return { type: type as InquiryType, locale: locale as InquiryLocale, name, email, message, productId, serviceId, sourcePath, attribution, idempotencyKey, website }
}

export function inquiryPayloadHash(input: InquiryInput) {
  const canonical = JSON.stringify({
    type: input.type, locale: input.locale, name: input.name, email: input.email, message: input.message,
    productId: input.productId ?? null, serviceId: input.serviceId ?? null, sourcePath: input.sourcePath,
    attribution: input.attribution ?? null,
  })
  return createHash("sha256").update(canonical).digest("hex")
}
