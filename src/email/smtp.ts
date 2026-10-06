import net from "node:net"
import nodemailer, { type Transporter } from "nodemailer"
import type { Payload } from "payload"
import { decryptSmtpPassword } from "./crypto"
import { SMTP_SECRET_KEY } from "@/payload/globals/EmailSettings"
import { getServerEnv } from "@/env"

export interface PrivateEmailSettings {
  notificationsEnabled: boolean
  smtpHost: string
  smtpPort: number
  encryptionMode: "implicit-tls" | "starttls" | "none"
  smtpUsername: string
  passwordConfigured: boolean
  senderName: string
  senderEmail: string
  notificationRecipient: string
  submissionLimitPerHour: number
  adminTestLimitPerHour: number
}

function str(value: unknown) { return typeof value === "string" ? value.trim() : "" }

export async function getNotificationSettings(payload: Payload): Promise<PrivateEmailSettings> {
  const raw = await payload.findGlobal({ slug: "email-settings" as never, overrideAccess: true, depth: 0 }) as Record<string, unknown>
  return {
    notificationsEnabled: raw.notificationsEnabled === true,
    smtpHost: str(raw.smtpHost), smtpPort: Number(raw.smtpPort || 587),
    encryptionMode: (raw.encryptionMode === "implicit-tls" || raw.encryptionMode === "none" ? raw.encryptionMode : "starttls"),
    smtpUsername: str(raw.smtpUsername), passwordConfigured: raw.passwordConfigured === true,
    senderName: str(raw.senderName), senderEmail: str(raw.senderEmail), notificationRecipient: str(raw.notificationRecipient),
    submissionLimitPerHour: Number(raw.submissionLimitPerHour || 10), adminTestLimitPerHour: Number(raw.adminTestLimitPerHour || 5),
  }
}

export async function getPrivateEmailSettings(payload: Payload): Promise<PrivateEmailSettings & { smtpPassword?: string }> {
  const settings: PrivateEmailSettings & { smtpPassword?: string } = await getNotificationSettings(payload)
  if (settings.passwordConfigured) {
    const secret = await payload.find({ collection: "email-secrets" as never, where: { key: { equals: SMTP_SECRET_KEY } }, limit: 1, overrideAccess: true, depth: 0 })
    const ciphertext = str((secret.docs[0] as unknown as { ciphertext?: unknown })?.ciphertext)
    if (!ciphertext) throw new Error("smtp-credential-missing")
    settings.smtpPassword = decryptSmtpPassword(ciphertext)
  }
  return settings
}

function isLoopback(host: string) {
  return host === "localhost" || host === "127.0.0.1" || host === "::1" || net.isIP(host) > 0 && host.startsWith("127.")
}

export function createSmtpTransport(settings: PrivateEmailSettings & { smtpPassword?: string }): Transporter {
  if (!settings.smtpHost || !Number.isInteger(settings.smtpPort)) throw new Error("smtp-configuration-incomplete")
  if (settings.encryptionMode === "none" && (!getServerEnv().ALLOW_INSECURE_LOCAL_SMTP || !isLoopback(settings.smtpHost))) {
    throw new Error("plaintext-smtp-not-permitted")
  }
  const auth = settings.smtpUsername
    ? { user: settings.smtpUsername, pass: settings.smtpPassword ?? "" }
    : undefined
  return nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.encryptionMode === "implicit-tls",
    requireTLS: settings.encryptionMode === "starttls",
    ignoreTLS: settings.encryptionMode === "none",
    auth,
    tls: { rejectUnauthorized: true, minVersion: "TLSv1.2" },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 30_000,
    disableFileAccess: true,
    disableUrlAccess: true,
  })
}

export type TransportStage = "pre-data" | "data-transmitting" | "data-transmitted" | "accepted" | "unknown"

export type SmtpOutcome = "retryable-transient" | "permanent-failure" | "uncertain"

export interface SanitizedSmtpError {
  code: string
  retryable: boolean
  outcome: SmtpOutcome
}

export function createTrackedSmtpTransport(
  settings: PrivateEmailSettings & { smtpPassword?: string },
  tracker?: { stage: TransportStage }
): Transporter {
  const transport = createSmtpTransport(settings)
  if (tracker) {
    tracker.stage = "pre-data"
    transport.use("stream", (mail, next) => {
      try {
        const origCreateReadStream = mail.message.createReadStream.bind(mail.message)
        mail.message.createReadStream = ((options?: Parameters<typeof origCreateReadStream>[0]) => {
          tracker.stage = "data-transmitting"
          const stream = origCreateReadStream(options)
          stream.on("end", () => {
            tracker.stage = "data-transmitted"
          })
          return stream
        }) as typeof origCreateReadStream
      } catch {
        tracker.stage = "unknown"
      }
      next()
    })
  }
  return transport
}

export function sanitizeSmtpError(error: unknown, stage?: TransportStage): SanitizedSmtpError {
  const candidate = error as { code?: unknown; responseCode?: unknown; command?: unknown }
  const code = String(candidate?.code || "").toUpperCase()
  const responseCode = Number(candidate?.responseCode || 0)

  // 1. Explicit permanent rejection
  if (["EAUTH", "EENVELOPE", "EMESSAGE"].includes(code) || responseCode >= 500) {
    return { code: code === "EAUTH" ? "smtp-auth" : "smtp-permanent", retryable: false, outcome: "permanent-failure" }
  }

  // 2. Pre-connection configuration or mailbox format errors
  if (error instanceof Error && ["smtp-credential-missing", "smtp-configuration-incomplete", "plaintext-smtp-not-permitted", "smtp-invalid-mailbox"].includes(error.message)) {
    return { code: error.message, retryable: false, outcome: "permanent-failure" }
  }

  // 3. Potential acceptance with missing final acknowledgment: complete message DATA transmitted
  if (stage === "data-transmitted") {
    return { code: "uncertain-data-transmitted", retryable: false, outcome: "uncertain" }
  }

  // 4. Transport stage could not be established: conservative uncertain classification
  if (stage === "unknown") {
    return { code: "uncertain-stage-unknown", retryable: false, outcome: "uncertain" }
  }

  // 5. Known pre-delivery transient failures
  if (["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "EDNS", "ESOCKET"].includes(code) || (responseCode >= 400 && responseCode < 500)) {
    return { code: "smtp-temporary", retryable: true, outcome: "retryable-transient" }
  }

  return { code: "smtp-unknown", retryable: true, outcome: "retryable-transient" }
}

export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!)
}

export function safeMailbox(name: string, address: string) {
  if (/[\r\n]/.test(name) || /[\r\n]/.test(address)) throw new Error("smtp-invalid-mailbox")
  return { name: name.slice(0, 120), address: address.slice(0, 254) }
}
