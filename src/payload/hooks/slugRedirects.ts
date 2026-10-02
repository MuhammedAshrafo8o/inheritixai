import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, PayloadRequest } from "payload"
import { publicPath, type RoutableCollection } from "./revalidate"

const contextKey = (collection: string, id: number | string) => `publishedSlugChange:${collection}:${id}`

type SlugChange = { previous: string; next: string }

/**
 * Before a document is *published*, compare against the currently published
 * row (the main table — draft saves only write versions) to detect a change
 * of public URL. Draft-only edits and first publications never create redirects.
 */
export function detectPublishedSlugChange(
  collection: RoutableCollection,
  options: { trackHistory?: boolean } = {},
): CollectionBeforeChangeHook {
  return async ({ data, originalDoc, operation, req }) => {
    if (operation !== "update" || !originalDoc?.id) return data
    if (data?._status !== "published") return data

    const published = (await req.payload.db.findOne({
      collection,
      where: { id: { equals: originalDoc.id } },
      req,
    })) as { _status?: string; slug?: string } | null

    const nextSlug = (data.slug ?? originalDoc.slug) as string | undefined
    if (published?._status !== "published" || !published.slug || !nextSlug) return data
    if (published.slug === nextSlug) return data

    req.context[contextKey(collection, originalDoc.id)] = {
      previous: published.slug,
      next: nextSlug,
    } satisfies SlugChange

    if (options.trackHistory) {
      const history = Array.isArray(originalDoc.previousSlugs) ? originalDoc.previousSlugs : []
      const known = new Set(history.map((row: { slug?: string }) => row.slug))
      if (!known.has(published.slug)) {
        data.previousSlugs = [...history.map(({ slug }: { slug?: string }) => ({ slug })), { slug: published.slug }]
      }
    }
    return data
  }
}

async function upsertRedirect(req: PayloadRequest, from: string, to: string) {
  // The new live URL must never be redirected away.
  await req.payload.delete({
    collection: "redirects",
    where: { from: { equals: to } },
    overrideAccess: true,
    req,
  })

  // Flatten chains: anything that pointed at the old URL now points at the new one.
  await req.payload.update({
    collection: "redirects",
    where: { to: { equals: from } },
    data: { to },
    overrideAccess: true,
    req,
  })

  const existing = await req.payload.find({
    collection: "redirects",
    where: { from: { equals: from } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    req,
  })
  if (existing.docs[0]) {
    await req.payload.update({
      collection: "redirects",
      id: existing.docs[0].id,
      data: { to, statusCode: "308" },
      overrideAccess: true,
      req,
    })
  } else {
    await req.payload.create({
      collection: "redirects",
      data: { from, to, statusCode: "308", source: "slug-change" },
      overrideAccess: true,
      req,
    })
  }
}

export function createPublishedSlugRedirects(collection: RoutableCollection): CollectionAfterChangeHook {
  return async ({ doc, req }) => {
    const change = req.context[contextKey(collection, doc.id)] as SlugChange | undefined
    if (!change || doc._status !== "published") return doc
    delete req.context[contextKey(collection, doc.id)]

    for (const locale of ["en", "ar"] as const) {
      await upsertRedirect(
        req,
        publicPath(collection, change.previous, locale),
        publicPath(collection, change.next, locale),
      )
    }
    req.payload.logger.info({
      msg: "Created slug redirects for published URL change",
      collection,
      from: change.previous,
      to: change.next,
    })
    return doc
  }
}
