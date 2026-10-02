import type { Payload, PayloadRequest } from "payload"

export const MAX_REDIRECT_HOPS = 10

export type ResolvedRedirect = {
  to: string
  statusCode: 307 | 308
  hops: number
}

/** Normalises a public path: leading slash, no trailing slash, no query/hash. */
export function normalizePath(value: string) {
  const [withoutHash] = value.split("#")
  const [pathname] = (withoutHash ?? "").split("?")
  let path = (pathname ?? "").trim()
  if (!path.startsWith("/")) path = `/${path}`
  if (path.length > 1) path = path.replace(/\/+$/, "")
  return path || "/"
}

export function isInternalPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//")
}

type RedirectRow = { id: number | string; from: string; to: string; statusCode?: string | null }

async function findByFrom(payload: Payload, from: string, req?: PayloadRequest) {
  const result = await payload.find({
    collection: "redirects",
    where: { from: { equals: from } },
    limit: 1,
    depth: 0,
    pagination: false,
    overrideAccess: false,
    req,
  })
  return (result.docs[0] as RedirectRow | undefined) ?? null
}

/**
 * Follows stored redirects from `path` to the final destination.
 * Returns null when no redirect applies. Cycles and over-long chains are
 * reported and treated as "no redirect" so a misconfiguration can never send
 * visitors into an infinite loop.
 */
export async function resolveStoredRedirect(
  payload: Payload,
  path: string,
): Promise<ResolvedRedirect | null> {
  const start = normalizePath(path)
  const seen = new Set<string>([start])
  let current = start
  let statusCode: ResolvedRedirect["statusCode"] = 308
  let hops = 0

  while (hops < MAX_REDIRECT_HOPS) {
    const row = await findByFrom(payload, current)
    if (!row) break
    hops += 1
    if (hops === 1) statusCode = row.statusCode === "307" ? 307 : 308
    if (!isInternalPath(row.to)) return { to: row.to, statusCode, hops }
    const next = normalizePath(row.to)
    if (seen.has(next)) {
      payload.logger.error({ msg: "Redirect loop detected; ignoring redirect", path: start, chain: [...seen, next] })
      return null
    }
    seen.add(next)
    current = next
  }

  if (hops >= MAX_REDIRECT_HOPS) {
    payload.logger.error({ msg: "Redirect chain too long; ignoring redirect", path: start })
    return null
  }
  return hops > 0 ? { to: current, statusCode, hops } : null
}

/**
 * True when saving `from -> to` would close a cycle through existing redirects
 * (A -> B -> C -> A), not just the trivial A -> A case.
 */
export async function wouldCreateRedirectLoop(
  req: PayloadRequest,
  from: string,
  to: string,
  ownId?: number | string,
) {
  if (!isInternalPath(to)) return false
  const origin = normalizePath(from)
  let current = normalizePath(to)
  const seen = new Set<string>()

  for (let hops = 0; hops <= MAX_REDIRECT_HOPS; hops += 1) {
    if (current === origin) return true
    if (seen.has(current)) return true
    seen.add(current)
    const result = await req.payload.find({
      collection: "redirects",
      where: { from: { equals: current } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      req,
    })
    const row = result.docs[0] as RedirectRow | undefined
    if (!row || (ownId !== undefined && String(row.id) === String(ownId))) return false
    if (!isInternalPath(row.to)) return false
    current = normalizePath(row.to)
  }
  return true
}
