import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  GlobalAfterChangeHook,
  PayloadRequest,
} from "payload"
import { revalidatePath } from "next/cache"

/** Public route prefix for each routable collection. */
export const ROUTABLE_COLLECTIONS = {
  projects: "/projects",
  posts: "/insights",
  services: "/services",
  products: "/products",
} as const

export type RoutableCollection = keyof typeof ROUTABLE_COLLECTIONS

export function publicPath(collection: RoutableCollection, slug: string, locale: "en" | "ar") {
  return `${locale === "ar" ? "/ar" : ""}${ROUTABLE_COLLECTIONS[collection]}/${slug}`
}

function canRevalidate(req: PayloadRequest) {
  return !req.context?.disableRevalidate
}

/**
 * Calls Next's revalidatePath. Outside a Next.js request (CLI seed/bootstrap)
 * there is no incremental cache to purge, which Next reports by throwing an
 * invariant error — that case is expected and logged at debug level only.
 */
function safeRevalidate(req: PayloadRequest, path: string, type?: "layout" | "page") {
  try {
    revalidatePath(path, type)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (/static generation store|Invariant|outside a request scope/i.test(message)) {
      req.payload.logger.debug({ msg: "Skipped revalidation outside Next.js runtime", path })
      return
    }
    req.payload.logger.error({ msg: "Cache revalidation failed", path, err: error })
  }
}

function revalidateDocument(
  req: PayloadRequest,
  collection: RoutableCollection,
  slugs: Array<string | null | undefined>,
) {
  const base = ROUTABLE_COLLECTIONS[collection]
  const paths = new Set<string>(["/", "/ar", base, `/ar${base}`])
  for (const slug of slugs) {
    if (!slug) continue
    paths.add(publicPath(collection, slug, "en"))
    paths.add(publicPath(collection, slug, "ar"))
  }
  for (const path of paths) safeRevalidate(req, path)
  req.payload.logger.info({ msg: "Revalidated public paths", collection, paths: [...paths] })
}

/** Targeted invalidation for routable collections (listing, detail, home, sitemap). */
export function revalidateRoutableAfterChange(
  collection: RoutableCollection,
): CollectionAfterChangeHook {
  return ({ doc, previousDoc, req }) => {
    if (!canRevalidate(req)) return doc
    // Draft-only saves never change public output.
    if (doc?._status === "draft" && previousDoc?._status !== "published") return doc
    revalidateDocument(req, collection, [doc?.slug, previousDoc?.slug])
    return doc
  }
}

export function revalidateRoutableAfterDelete(
  collection: RoutableCollection,
): CollectionAfterDeleteHook {
  return ({ doc, req }) => {
    if (canRevalidate(req)) revalidateDocument(req, collection, [doc?.slug])
    return doc
  }
}

/** Shared records (media, clients, authors, categories, redirects) appear across many pages. */
export const revalidateAllAfterChange: CollectionAfterChangeHook = ({ doc, req }) => {
  if (canRevalidate(req)) safeRevalidate(req, "/", "layout")
  return doc
}

export const revalidateAllAfterDelete: CollectionAfterDeleteHook = ({ doc, req }) => {
  if (canRevalidate(req)) safeRevalidate(req, "/", "layout")
  return doc
}

/** Globals (navigation, settings, page copy) affect the shared layout. */
export const revalidateGlobalAfterChange: GlobalAfterChangeHook = ({ doc, req, global }) => {
  if (canRevalidate(req)) {
    safeRevalidate(req, "/", "layout")
    req.payload.logger.info({ msg: "Revalidated site layout", global: global.slug })
  }
  return doc
}
