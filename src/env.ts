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

  if (problems.length > 0) throw new EnvironmentConfigError(problems)

  cached = {
    SITE_URL: (siteUrl || "http://localhost:8443").replace(/\/+$/, ""),
    DATABASE_URI: databaseUri!,
    PAYLOAD_SECRET: payloadSecret!,
    PREVIEW_SECRET: previewSecret,
    IS_PRODUCTION: isProduction,
    DEV_FIXTURES: devFixtures && !isProduction,
  }
  return cached
}

/** Public site origin, safe to use in metadata and sitemap generation. */
export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:8443").replace(/\/+$/, "")
}
