/**
 * Server environment configuration and validation for Inheritix.
 *
 * This module is imported by `payload.config.ts`, so every entry point that
 * initialises Payload (Next.js server, admin, REST/GraphQL, CLI migrations,
 * seed and bootstrap scripts) validates the same configuration. There are no
 * baked-in fallback secrets or database credentials.
 */

export interface ServerEnv {
  SITE_URL: string
  DATABASE_URI: string
  PAYLOAD_SECRET: string
  PREVIEW_SECRET: string | undefined
  IS_PRODUCTION: boolean
  /** Explicit opt-in for illustrative project fixtures (never in production). */
  DEV_FIXTURES: boolean
  /** 32-byte base64 key used only for SMTP credential encryption. */
  EMAIL_ENCRYPTION_KEY: string | undefined
  /** HMAC key for privacy-preserving inquiry rate-limit buckets. */
  INQUIRY_IP_HASH_KEY: string
  /** Number of trusted reverse proxies immediately in front of the app. */
  TRUSTED_PROXY_HOPS: number
  /** Development-only opt-in for a loopback, plaintext SMTP capture server. */
  ALLOW_INSECURE_LOCAL_SMTP: boolean
}

const PLACEHOLDER_PATTERN = /replace-with|changeme|change-me|default-.*-secret|development-only/i
const MIN_SECRET_LENGTH = 32

export class EnvironmentConfigError extends Error {
  constructor(problems: string[]) {
    super(
      `Inheritix environment configuration is invalid:\n${problems
        .map((p) => `  - ${p}`)
        .join("\n")}\nSee .env.example for the required variables.`,
    )
    this.name = "EnvironmentConfigError"
  }
}

function validateSecret(name: string, value: string | undefined, problems: string[]) {
  if (!value) {
    problems.push(`${name} is required.`)
    return
  }
  if (PLACEHOLDER_PATTERN.test(value)) {
    problems.push(`${name} still contains a placeholder value; generate a random secret.`)
  } else if (value.length < MIN_SECRET_LENGTH) {
    problems.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters.`)
  }
}

function validEncryptionKey(value: string | undefined) {
  if (!value) return false
  try {
    return Buffer.from(value, "base64").length === 32
  } catch {
    return false
  }
}

let cached: ServerEnv | null = null

export function getServerEnv(): ServerEnv {
  if (cached) return cached

  const isProduction = process.env.NODE_ENV === "production"
  const problems: string[] = []

  const databaseUri = process.env.DATABASE_URI?.trim()
  if (!databaseUri) {
    problems.push("DATABASE_URI is required (postgresql://user:password@host:port/database).")
  } else if (!/^postgres(ql)?:\/\//.test(databaseUri)) {
    problems.push("DATABASE_URI must be a postgresql:// connection string.")
  }

  const payloadSecret = process.env.PAYLOAD_SECRET?.trim()
  validateSecret("PAYLOAD_SECRET", payloadSecret, problems)

  const previewSecret = process.env.PREVIEW_SECRET?.trim() || undefined
  if (isProduction) {
    validateSecret("PREVIEW_SECRET", previewSecret, problems)
  } else if (previewSecret) {
    const previewProblems: string[] = []
    validateSecret("PREVIEW_SECRET", previewSecret, previewProblems)
    problems.push(...previewProblems)
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim()
  if (isProduction && !siteUrl) {
    problems.push("NEXT_PUBLIC_SITE_URL is required in production.")
  }

  const devFixtures = process.env.INHERITIX_DEV_FIXTURES === "true"
  if (isProduction && devFixtures) {
    problems.push("INHERITIX_DEV_FIXTURES must not be enabled in production.")
  }

  const emailEncryptionKey = process.env.EMAIL_ENCRYPTION_KEY?.trim() || undefined
  if (isProduction && !validEncryptionKey(emailEncryptionKey)) {
    problems.push("EMAIL_ENCRYPTION_KEY is required in production and must decode to exactly 32 bytes.")
  } else if (emailEncryptionKey && !validEncryptionKey(emailEncryptionKey)) {
    problems.push("EMAIL_ENCRYPTION_KEY must be base64 that decodes to exactly 32 bytes.")
  }

  const inquiryIpHashKey = process.env.INQUIRY_IP_HASH_KEY?.trim() || payloadSecret || ""
  if (isProduction && !process.env.INQUIRY_IP_HASH_KEY?.trim()) {
    problems.push("INQUIRY_IP_HASH_KEY is required in production and must be distinct from PAYLOAD_SECRET.")
  } else if (process.env.INQUIRY_IP_HASH_KEY?.trim()) {
    validateSecret("INQUIRY_IP_HASH_KEY", inquiryIpHashKey, problems)
    if (inquiryIpHashKey === payloadSecret) {
      problems.push("INQUIRY_IP_HASH_KEY must be distinct from PAYLOAD_SECRET.")
    }
  }

  const trustedProxyRaw = process.env.INHERITIX_TRUSTED_PROXY_HOPS?.trim() || "0"
  const trustedProxyHops = Number(trustedProxyRaw)
  if (!Number.isInteger(trustedProxyHops) || trustedProxyHops < 0 || trustedProxyHops > 10) {
    problems.push("INHERITIX_TRUSTED_PROXY_HOPS must be an integer from 0 to 10.")
  }

  const allowInsecureLocalSmtp = process.env.INHERITIX_ALLOW_INSECURE_LOCAL_SMTP === "true"
  if (isProduction && allowInsecureLocalSmtp) {
    problems.push("INHERITIX_ALLOW_INSECURE_LOCAL_SMTP must not be enabled in production.")
  }

  if (problems.length > 0) throw new EnvironmentConfigError(problems)

  cached = {
    SITE_URL: (siteUrl || "http://localhost:8443").replace(/\/+$/, ""),
    DATABASE_URI: databaseUri!,
    PAYLOAD_SECRET: payloadSecret!,
    PREVIEW_SECRET: previewSecret,
    IS_PRODUCTION: isProduction,
    DEV_FIXTURES: devFixtures && !isProduction,
    EMAIL_ENCRYPTION_KEY: emailEncryptionKey,
    INQUIRY_IP_HASH_KEY: inquiryIpHashKey,
    TRUSTED_PROXY_HOPS: Number.isInteger(trustedProxyHops) ? trustedProxyHops : 0,
    ALLOW_INSECURE_LOCAL_SMTP: allowInsecureLocalSmtp && !isProduction,
  }
  return cached
}

/** Public site origin, safe to use in metadata and sitemap generation. */
export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8443").replace(/\/+$/, "")
}
