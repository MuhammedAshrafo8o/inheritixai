import { APIError, type CollectionBeforeChangeHook, type CollectionBeforeValidateHook, type CollectionConfig } from "payload"
import { isAdmin } from "../../cms/access"

const immutableFields = [
  "publicReference",
  "idempotencyKey",
  "payloadHash",
  "inquiryType",
  "name",
  "email",
  "message",
  "submissionLocale",
  "product",
  "service",
  "selectionLabelSnapshot",
  "sourcePath",
  "attribution",
  "submittedAt",
] as const

const systemOnlyFields = [
  "notificationStatus",
  "notificationAttempts",
  "notificationNextAttemptAt",
  "notificationLockedAt",
  "notificationFailureCode",
  "notificationLastAttemptAt",
  "notificationAcceptedAt",
  "notificationEvents",
] as const

function relationID(value: unknown) {
  if (value && typeof value === "object" && "id" in value) return String((value as { id: unknown }).id)
  return value == null ? null : String(value)
}

function comparable(key: string, value: unknown) {
  if (key === "product" || key === "service") return relationID(value)
  return JSON.stringify(value ?? null)
}

const protectSubmittedData: CollectionBeforeChangeHook = ({ data, operation, originalDoc, req }) => {
  if (operation === "create") {
    if (req.context?.inquirySubmission !== true) throw new APIError("Inquiries can only be created by the public submission service.", 403)
    return data
  }
  if (req.context?.inquirySystemOperation === true) return data
  for (const field of immutableFields) {
    if (field in data && comparable(field, data[field]) !== comparable(field, originalDoc?.[field])) {
      throw new APIError(`Submitted field “${field}” is immutable.`, 400)
    }
  }
  for (const field of systemOnlyFields) {
    if (field in data && comparable(field, data[field]) !== comparable(field, originalDoc?.[field])) {
      throw new APIError(`Notification field "${field}" can only be changed by the notification service.`, 403)
    }
  }
  return data
}

const protectAndStampNotes: CollectionBeforeValidateHook = ({ data, operation, originalDoc, req }) => {
  if (!data || operation !== "update" || req.context?.inquirySystemOperation === true || !("internalNotes" in data)) return data
  const previous = Array.isArray(originalDoc?.internalNotes) ? originalDoc.internalNotes : []
  const incoming = Array.isArray(data.internalNotes) ? data.internalNotes : []
  if (incoming.length < previous.length) throw new APIError("Existing internal notes cannot be removed.", 400)
  for (let index = 0; index < previous.length; index += 1) {
    const before = previous[index]
    const after = incoming[index]
    if (
      !after
      || String(after.note) !== String(before.note)
      || String(relationID(after.author)) !== String(relationID(before.author))
      || String(after.authorLabel) !== String(before.authorLabel)
    ) {
      throw new APIError("Existing internal notes cannot be edited.", 400)
    }
    after.createdAt = before.createdAt
  }
  for (let index = previous.length; index < incoming.length; index += 1) {
    if (!String(incoming[index]?.note ?? "").trim()) throw new APIError("Internal notes cannot be empty.", 400)
    incoming[index].author = req.user?.id
    incoming[index].authorLabel = String((req.user as unknown as { name?: string; email?: string } | null)?.name || (req.user as unknown as { email?: string } | null)?.email || "Administrator")
    incoming[index].createdAt = new Date().toISOString()
  }
  data.internalNotes = incoming
  return data
}

export const Inquiries: CollectionConfig = {
  slug: "inquiry-records",
  defaultSort: "-submittedAt",
  labels: { singular: "Inquiry", plural: "Inquiries" },
  admin: {
    group: "Operations",
    useAsTitle: "publicReference",
    defaultColumns: ["publicReference", "inquiryType", "name", "workflowStatus", "unread", "notificationStatus", "submittedAt"],
    listSearchableFields: ["publicReference", "name", "email"],
    description: "Private visitor inquiries. Submitted data is immutable; workflow fields and append-only notes are administrative.",
    components: { beforeList: ["@/payload/admin/InquirySummary#InquirySummary"] },
  },
  access: {
    read: isAdmin,
    create: () => false,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: { beforeValidate: [protectAndStampNotes], beforeChange: [protectSubmittedData] },
  fields: [
    { name: "publicReference", type: "text", required: true, unique: true, index: true, admin: { readOnly: true } },
    { name: "idempotencyKey", type: "text", required: true, unique: true, index: true, admin: { hidden: true } },
    { name: "payloadHash", type: "text", required: true, admin: { hidden: true } },
    {
      name: "inquiryType",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Project inquiry", value: "project" },
        { label: "Product demo", value: "demo" },
        { label: "General inquiry", value: "general" },
      ],
      admin: { readOnly: true },
    },
    { name: "name", type: "text", required: true, index: true, admin: { readOnly: true } },
    { name: "email", type: "email", required: true, index: true, admin: { readOnly: true } },
    { name: "message", type: "textarea", required: true, admin: { readOnly: true } },
    { name: "submissionLocale", type: "select", required: true, options: [{ label: "English", value: "en" }, { label: "Arabic", value: "ar" }], admin: { readOnly: true } },
    { name: "submittedAt", type: "date", required: true, index: true, admin: { readOnly: true } },
    { name: "product", type: "relationship", relationTo: "products", admin: { readOnly: true, condition: (data) => data.inquiryType === "demo" } },
    { name: "service", type: "relationship", relationTo: "services", admin: { readOnly: true, condition: (data) => data.inquiryType === "project" } },
    { name: "selectionLabelSnapshot", type: "text", admin: { readOnly: true } },
    { name: "sourcePath", type: "text", required: true, admin: { readOnly: true } },
    {
      name: "attribution",
      type: "group",
      admin: { readOnly: true },
      fields: [
        { name: "utmSource", type: "text" },
        { name: "utmMedium", type: "text" },
        { name: "utmCampaign", type: "text" },
        { name: "referrer", type: "text" },
      ],
    },
    {
      name: "workflowStatus",
      type: "select",
      required: true,
      defaultValue: "new",
      index: true,
      options: [
        { label: "New", value: "new" },
        { label: "In progress", value: "in-progress" },
        { label: "Closed", value: "closed" },
        { label: "Spam", value: "spam" },
      ],
    },
    { name: "unread", type: "checkbox", defaultValue: true, required: true, index: true },
    {
      name: "internalNotes",
      type: "array",
      labels: { singular: "Internal note", plural: "Internal notes" },
      fields: [
        { name: "note", type: "textarea", required: true, maxLength: 5000 },
        { name: "author", type: "relationship", relationTo: "users", admin: { readOnly: true } },
        { name: "authorLabel", type: "text", required: true, admin: { readOnly: true } },
        { name: "createdAt", type: "date", required: true, admin: { readOnly: true } },
      ],
    },
    {
      name: "notificationStatus",
      type: "select",
      required: true,
      index: true,
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "SMTP accepted", value: "accepted" },
        { label: "Retry scheduled", value: "retry-wait" },
        { label: "Failed", value: "failed" },
        { label: "Disabled at submission", value: "disabled" },
        { label: "Uncertain", value: "uncertain" },
      ],
      admin: { readOnly: true },
    },
    { name: "notificationAttempts", type: "number", required: true, defaultValue: 0, min: 0, admin: { readOnly: true } },
    { name: "notificationNextAttemptAt", type: "date", index: true, admin: { readOnly: true } },
    { name: "notificationLockedAt", type: "date", index: true, admin: { readOnly: true } },
    { name: "notificationFailureCode", type: "text", admin: { readOnly: true } },
    { name: "notificationLastAttemptAt", type: "date", admin: { readOnly: true } },
    { name: "notificationAcceptedAt", type: "date", admin: { readOnly: true } },
    {
      name: "notificationEvents",
      type: "array",
      admin: { readOnly: true, description: "Sanitized delivery history; no SMTP responses or credentials are stored." },
      fields: [
        { name: "occurredAt", type: "date", required: true },
        { name: "status", type: "text", required: true },
        { name: "code", type: "text" },
      ],
    },
    {
      name: "inquiryActions",
      type: "ui",
      admin: { components: { Field: "@/payload/admin/InquiryActions#InquiryActions" } },
    },
  ],
}
