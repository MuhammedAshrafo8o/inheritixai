import { APIError, type GlobalConfig } from "payload"
import { isAdmin } from "../../cms/access"
import { encryptSmtpPassword } from "../../email/crypto"

const SECRET_KEY = "smtp-password"

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : ""
}

export const EmailSettings: GlobalConfig = {
  slug: "email-settings",
  label: "Email Settings",
  admin: {
    group: "Operations",
    description: "Private SMTP configuration for inquiry notifications. SMTP acceptance is not inbox delivery.",
  },
  access: {
    read: isAdmin,
    update: isAdmin,
  },
  hooks: {
    beforeValidate: [
      async ({ data, originalDoc, req }) => {
        if (!data) return data
        const enabled = data.notificationsEnabled === true
        const encryption = data.encryptionMode
        if (encryption === "none" && process.env.NODE_ENV === "production") {
          throw new APIError("Plaintext SMTP is not available in production.", 400)
        }
        if (enabled) {
          const required = ["smtpHost", "senderName", "senderEmail", "notificationRecipient"] as const
          const missing = required.filter((field) => !text(data[field] ?? originalDoc?.[field]))
          const port = Number(data.smtpPort ?? originalDoc?.smtpPort)
          if (!Number.isInteger(port) || port < 1 || port > 65535) missing.push("smtpPort" as never)
          if (missing.length) {
            throw new APIError(`Complete the required email settings before enabling notifications: ${missing.join(", ")}.`, 400)
          }
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, originalDoc, req }) => {
        if (!data) return data
        const outcomeFields = ["lastConnectionTestStatus", "lastConnectionTestAt", "lastConnectionTestCode", "lastTestEmailStatus", "lastTestEmailAt", "lastTestEmailCode"]
        if (req.context?.emailSettingsSystemOperation !== true) {
          for (const field of outcomeFields) {
            if (field in data && JSON.stringify(data[field] ?? null) !== JSON.stringify(originalDoc?.[field] ?? null)) {
              throw new APIError("SMTP test outcomes can only be changed by the protected test actions.", 403)
            }
          }
        }
        const newPassword = typeof data.smtpPassword === "string" ? data.smtpPassword : ""
        const clearPassword = data.clearSmtpPassword === true
        if (newPassword && clearPassword) throw new APIError("Replace and clear cannot be selected together.", 400)

        if (newPassword) {
          if (newPassword.length > 1024) throw new APIError("SMTP password is too long.", 400)
          const encrypted = encryptSmtpPassword(newPassword)
          const existing = await req.payload.find({
            collection: "email-secrets" as never,
            where: { key: { equals: SECRET_KEY } },
            limit: 1,
            overrideAccess: true,
            req,
          }) as unknown as { docs: Array<{ id: string | number }> }
          if (existing.docs[0]) {
            await req.payload.update({
              collection: "email-secrets" as never,
              id: existing.docs[0].id,
              data: { ciphertext: encrypted } as never,
              overrideAccess: true,
              req,
            })
          } else {
            await req.payload.create({
              collection: "email-secrets" as never,
              data: { key: SECRET_KEY, ciphertext: encrypted } as never,
              overrideAccess: true,
              req,
            })
          }
          data.passwordConfigured = true
        } else if (clearPassword) {
          await req.payload.delete({
            collection: "email-secrets" as never,
            where: { key: { equals: SECRET_KEY } },
            overrideAccess: true,
            req,
          })
          data.passwordConfigured = false
          data.notificationsEnabled = false
        } else {
          data.passwordConfigured = originalDoc?.passwordConfigured === true
        }
        delete data.smtpPassword
        delete data.clearSmtpPassword
        return data
      },
    ],
  },
  fields: [
    {
      name: "notificationsEnabled",
      type: "checkbox",
      defaultValue: false,
      admin: { description: "New inquiries create pending notification work only while enabled." },
    },
    { type: "collapsible", label: "SMTP transport", fields: [
      { name: "smtpHost", type: "text", maxLength: 253 },
      { name: "smtpPort", type: "number", min: 1, max: 65535, defaultValue: 587 },
      {
        name: "encryptionMode",
        type: "select",
        defaultValue: "starttls",
        required: true,
        options: [
          { label: "STARTTLS (required)", value: "starttls" },
          { label: "Implicit TLS", value: "implicit-tls" },
          { label: "Plaintext loopback capture server (development only)", value: "none" },
        ],
      },
      { name: "smtpUsername", type: "text", maxLength: 320 },
      {
        name: "smtpPassword",
        type: "text",
        virtual: true,
        access: { read: () => false },
        admin: { description: "Leave blank to preserve the current password. A supplied value replaces it." },
      },
      {
        name: "clearSmtpPassword",
        type: "checkbox",
        virtual: true,
        access: { read: () => false },
        admin: { description: "Clear the stored credential and disable notifications." },
      },
      {
        name: "passwordConfigured",
        type: "checkbox",
        defaultValue: false,
        admin: { readOnly: true, description: "Indicates whether an encrypted password is stored." },
      },
    ] },
    { type: "collapsible", label: "Message envelope", fields: [
      { name: "senderName", type: "text", maxLength: 120 },
      { name: "senderEmail", type: "email", validate: (value: string | null | undefined) => !value || value.length <= 254 || "Email must be 254 characters or fewer." },
      { name: "notificationRecipient", type: "email", validate: (value: string | null | undefined) => !value || value.length <= 254 || "Email must be 254 characters or fewer." },
    ] },
    { type: "collapsible", label: "Inquiry protection", fields: [
      { name: "submissionLimitPerHour", type: "number", min: 1, max: 1000, defaultValue: 10, required: true },
      { name: "adminTestLimitPerHour", type: "number", min: 1, max: 100, defaultValue: 5, required: true },
    ] },
    { type: "collapsible", label: "Last checks", fields: [
      { name: "lastConnectionTestStatus", type: "select", options: ["never", "succeeded", "failed"], defaultValue: "never", admin: { readOnly: true } },
      { name: "lastConnectionTestAt", type: "date", admin: { readOnly: true } },
      { name: "lastConnectionTestCode", type: "text", admin: { readOnly: true } },
      { name: "lastTestEmailStatus", type: "select", options: ["never", "accepted", "failed"], defaultValue: "never", admin: { readOnly: true } },
      { name: "lastTestEmailAt", type: "date", admin: { readOnly: true } },
      { name: "lastTestEmailCode", type: "text", admin: { readOnly: true } },
    ] },
    {
      name: "smtpActions",
      type: "ui",
      admin: { components: { Field: "@/payload/admin/EmailSettingsActions#EmailSettingsActions" } },
    },
  ],
}

export const SMTP_SECRET_KEY = SECRET_KEY
