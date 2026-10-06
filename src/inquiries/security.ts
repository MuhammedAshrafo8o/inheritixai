import { createHmac } from "node:crypto"
import { sql } from "@payloadcms/db-postgres"
import type { Payload } from "payload"
import { getServerEnv } from "@/env"
import { isAdmin as isAdminAccess, type AuthenticatedCmsUser } from "@/cms/access"

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const fetchSite = request.headers.get("sec-fetch-site")
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return false
  if (!origin) return false
  try {
    const expected = new URL(getServerEnv().SITE_URL)
    const received = new URL(origin)
    if (received.origin === expected.origin) return true
    return !getServerEnv().IS_PRODUCTION && received.hostname === "localhost" && expected.hostname === "localhost"
  } catch {
    return false
  }
}

function normalizedIP(value: string | null) {
  const candidate = value?.trim().replace(/^\[|\]$/g, "") || "unknown"
  return candidate.length <= 64 && /^[0-9a-fA-F:.]+$/.test(candidate) ? candidate.toLowerCase() : "unknown"
}

export function clientIP(request: Request) {
  const hops = getServerEnv().TRUSTED_PROXY_HOPS
  if (hops > 0) {
    const chain = (request.headers.get("x-forwarded-for") || "").split(",").map((part) => part.trim()).filter(Boolean)
    const index = chain.length - hops
    if (index >= 0) return normalizedIP(chain[index])
  }
  // There is no trustworthy socket address on the Web Request object. When no
  // proxy hop count is configured, deliberately ignore spoofable forwarding
  // headers and place callers in the conservative shared bucket.
  return "unknown"
}

export function privacyHash(value: string) {
  return createHmac("sha256", getServerEnv().INQUIRY_IP_HASH_KEY).update(value).digest("base64url")
}

type RateResult = { allowed: boolean; retryAfter: number; count: number }

/** Atomic PostgreSQL upsert shared by every process; expired windows reset in place. */
export async function consumeRateLimit(payload: Payload, bucket: string, limit: number, windowSeconds = 3600): Promise<RateResult> {
  const now = new Date()
  const expires = new Date(now.getTime() + windowSeconds * 1000)
  await payload.db.drizzle.execute(sql`
    DELETE FROM "inquiry_rate_limits" WHERE "expires_at" <= ${now.toISOString()}
  `)
  const result = await payload.db.drizzle.execute(sql`
    INSERT INTO "inquiry_rate_limits" ("bucket_key", "count", "expires_at", "created_at", "updated_at")
    VALUES (${bucket}, 1, ${expires.toISOString()}, ${now.toISOString()}, ${now.toISOString()})
    ON CONFLICT ("bucket_key") DO UPDATE SET
      "count" = CASE WHEN "inquiry_rate_limits"."expires_at" <= ${now.toISOString()} THEN 1 ELSE "inquiry_rate_limits"."count" + 1 END,
      "expires_at" = CASE WHEN "inquiry_rate_limits"."expires_at" <= ${now.toISOString()} THEN ${expires.toISOString()} ELSE "inquiry_rate_limits"."expires_at" END,
      "updated_at" = ${now.toISOString()}
    RETURNING "count", "expires_at"
  `)
  const row = (Array.isArray(result) ? result[0] : (result as { rows?: unknown[] }).rows?.[0]) as { count?: number; expires_at?: string | Date } | undefined
  const count = Number(row?.count ?? limit + 1)
  const retryAfter = Math.max(1, Math.ceil((new Date(row?.expires_at ?? expires).getTime() - Date.now()) / 1000))
  return { allowed: count <= limit, retryAfter, count }
}

export async function requireAdmin(request: Request, payload: Payload): Promise<AuthenticatedCmsUser | null> {
  if (!isSameOrigin(request)) return null
  const { user } = await payload.auth({ headers: request.headers })
  if (!user) return null
  const allowed = isAdminAccess({ req: { user } } as never)
  return allowed ? (user as unknown as AuthenticatedCmsUser) : null
}
