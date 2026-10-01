/**
 * Environment configuration and validation for Inheritix
 */

export interface AppEnv {
  SITE_URL: string
  DATABASE_URI: string
  PAYLOAD_SECRET: string
  PREVIEW_SECRET: string
  IS_PRODUCTION: boolean
  IS_DEVELOPMENT: boolean
}

export function getAppEnv(): AppEnv {
  const isProduction = process.env.NODE_ENV === "production"
  const isDevelopment = !isProduction

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://inheritixai.com"

  const databaseUri =
    process.env.DATABASE_URI ||
    "postgresql://postgres:postgres@127.0.0.1:5432/inheritix"

  const payloadSecret =
    process.env.PAYLOAD_SECRET ||
    "inheritix-default-payload-secret-development-only-replace-in-production"

  const previewSecret =
    process.env.PREVIEW_SECRET ||
    "inheritix-default-preview-secret-development-only-replace-in-production"

  if (isProduction) {
    if (!process.env.PAYLOAD_SECRET || process.env.PAYLOAD_SECRET.includes("replace")) {
      throw new Error(
        "CRITICAL: PAYLOAD_SECRET must be set to a secure random value in production.",
      )
    }
    if (!process.env.DATABASE_URI) {
      throw new Error(
        "CRITICAL: DATABASE_URI is required in production.",
      )
    }
  }

  return {
    SITE_URL: siteUrl.replace(/\/+$/, ""),
    DATABASE_URI: databaseUri,
    PAYLOAD_SECRET: payloadSecret,
    PREVIEW_SECRET: previewSecret,
    IS_PRODUCTION: isProduction,
    IS_DEVELOPMENT: isDevelopment,
  }
}
