import { cache } from "react"
import { draftMode, headers } from "next/headers"
import { getPayload, type Payload, type Where } from "payload"
import config from "@/payload.config"
import type { Locale } from "@/content/types"
import { isCmsEditor } from "./access"
import type {
  ListingPage,
  Media,
  Navigation,
  PageAbout,
  PageContact,
  PageHome,
  Post,
  Product,
  Project,
  Service,
  SiteLabel,
  SiteSetting,
  User,
} from "@/payload-types"

/**
 * Public data access for the website.
 *
 * - Every Local API call runs with `overrideAccess: false`, so collection access
 *   control decides what is visible (anonymous visitors only see published docs).
 * - Drafts are served only when Next draft mode is on AND the request still
 *   carries a valid admin/editor Payload session (rechecked on every render, so
 *   logging out immediately ends draft visibility).
 * - Missing content returns null/[] (→ 404 or empty state). Database or query
 *   failures throw ContentInfrastructureError (→ logged, HTTP 500) and are never
 *   converted into placeholder content.
 */

export class ContentInfrastructureError extends Error {
  constructor(operation: string, cause: unknown) {
    super(`CMS ${operation} failed: ${cause instanceof Error ? cause.message : String(cause)}`, { cause })
    this.name = "ContentInfrastructureError"
  }
}

let payloadPromise: Promise<Payload> | null = null

export function getPayloadClient() {
  if (!payloadPromise) {
    payloadPromise = getPayload({ config }).catch((error) => {
      payloadPromise = null
      throw error
    })
  }
  return payloadPromise
}

async function run<T>(operation: string, fn: (payload: Payload) => Promise<T>): Promise<T> {
  try {
    const payload = await getPayloadClient()
    return await fn(payload)
  } catch (error) {
    if (error instanceof ContentInfrastructureError) throw error
    // Next.js control-flow signals (notFound/redirect/dynamic bailout) must pass through.
    if (error && typeof error === "object" && "digest" in error) throw error
    console.error(`[cms] ${operation} failed`, error)
    throw new ContentInfrastructureError(operation, error)
  }
}

export type Viewer = { draft: boolean; user: User | null }

/** Resolves who is viewing. Draft mode alone never grants draft access. */
export const getViewer = cache(async (): Promise<Viewer> => {
  const draft = await draftMode()
  if (!draft.isEnabled) return { draft: false, user: null }
  const { user } = await run("session check", async (payload) =>
    payload.auth({ headers: await headers() }),
  )
  if (!isCmsEditor(user)) return { draft: false, user: null }
  return { draft: true, user: user as User }
})

async function accessArgs() {
  const viewer = await getViewer()
  return {
    overrideAccess: false as const,
    user: viewer.user ?? undefined,
    draft: viewer.draft,
  }
}

// ─── Globals ────────────────────────────────────────────────────────────────

function globalReader<T>(slug: Parameters<Payload["findGlobal"]>[0]["slug"]) {
  return cache(async (locale: Locale): Promise<T> =>
    run(`global ${slug} (${locale})`, async (payload) =>
      (await payload.findGlobal({ slug, locale, depth: 2, overrideAccess: false })) as T,
    ),
  )
}

export const getSiteSettings = globalReader<SiteSetting>("site-settings")
export const getNavigation = globalReader<Navigation>("navigation")
export const getHomePage = globalReader<PageHome>("page-home")
export const getAboutPage = globalReader<PageAbout>("page-about")
export const getContactPage = globalReader<PageContact>("page-contact")
export const getListingPages = globalReader<ListingPage>("listing-pages")
export const getSiteLabels = globalReader<SiteLabel>("site-labels")

// ─── Routable collections ───────────────────────────────────────────────────

type RoutableSlug = "services" | "products" | "projects" | "posts"

async function findBySlug<T>(collection: RoutableSlug, slug: string, locale: Locale): Promise<T | null> {
  const access = await accessArgs()
  return run(`${collection} "${slug}" (${locale})`, async (payload) => {
    const result = await payload.find({
      collection,
      locale,
      where: { slug: { equals: slug } },
      limit: 1,
      depth: 2,
      ...access,
    })
    return (result.docs[0] as T | undefined) ?? null
  })
}

export const getServiceBySlug = cache((slug: string, locale: Locale) =>
  findBySlug<Service>("services", slug, locale),
)
export const getProductBySlug = cache((slug: string, locale: Locale) =>
  findBySlug<Product>("products", slug, locale),
)
export const getProjectBySlug = cache((slug: string, locale: Locale) =>
  findBySlug<Project>("projects", slug, locale),
)
export const getPostBySlug = cache((slug: string, locale: Locale) =>
  findBySlug<Post>("posts", slug, locale),
)

export const getPublishedServices = cache(async (locale: Locale) => {
  const access = await accessArgs()
  return run(`services list (${locale})`, async (payload) => {
    const result = await payload.find({
      collection: "services",
      locale,
      sort: "displayOrder",
      pagination: false,
      depth: 1,
      ...access,
    })
    return result.docs
  })
})

export const getPublishedProducts = cache(async (locale: Locale) => {
  const access = await accessArgs()
  return run(`products list (${locale})`, async (payload) => {
    const result = await payload.find({
      collection: "products",
      locale,
      sort: "displayOrder",
      pagination: false,
      depth: 1,
      ...access,
    })
    return result.docs
  })
})

export const getPublishedPosts = cache(async (locale: Locale, limit = 12) => {
  const access = await accessArgs()
  return run(`posts list (${locale})`, async (payload) => {
    const result = await payload.find({
      collection: "posts",
      locale,
      sort: "-publishedAt",
      limit,
      depth: 1,
      ...access,
    })
    return result.docs
  })
})

export interface ProjectQueryOptions {
  sector?: string
  page?: number
  limit?: number
}

export type ProjectListing = {
  docs: Array<Project | DevelopmentFixtureProject>
  totalDocs: number
  totalPages: number
  page: number
  sectors: string[]
  isDevelopmentFixture: boolean
}

export async function getPublishedProjects(
  locale: Locale,
  { sector, page = 1, limit = 12 }: ProjectQueryOptions = {},
): Promise<ProjectListing> {
  const access = await accessArgs()
  const where: Where | undefined = sector && sector !== "all" ? { sector: { equals: sector } } : undefined

  const listing = await run(`projects list (${locale})`, async (payload) => {
    const [result, all] = await Promise.all([
      payload.find({
        collection: "projects",
        locale,
        where,
        sort: "displayOrder",
        page,
        limit,
        depth: 1,
        ...access,
      }),
      payload.find({
        collection: "projects",
        locale,
        pagination: false,
        depth: 0,
        select: { sector: true },
        ...access,
      }),
    ])
    const sectors = [...new Set(all.docs.map((doc) => doc.sector).filter(Boolean))] as string[]
    return {
      docs: result.docs as ProjectListing["docs"],
      totalDocs: result.totalDocs,
      totalPages: Math.max(1, result.totalPages),
      page: result.page ?? 1,
      sectors,
      isDevelopmentFixture: false,
    }
  })

  if (listing.totalDocs === 0 && !where && developmentFixturesEnabled()) {
    return developmentFixtureListing(locale)
  }
  return listing
}

/** Published projects selected as "related", in editor order; unpublished picks are skipped. */
export function resolveRelatedProjects(project: Project, viewer: Viewer) {
  const related = (project.relatedProjects ?? []).filter(
    (item): item is Project => typeof item === "object" && item !== null,
  )
  return viewer.draft ? related : related.filter((item) => item._status === "published")
}

export const getFeaturedProjects = cache(async (locale: Locale, limit = 3) => {
  const access = await accessArgs()
  return run(`featured projects (${locale})`, async (payload) => {
    const result = await payload.find({
      collection: "projects",
      locale,
      where: { featured: { equals: true } },
      sort: "displayOrder",
      limit,
      depth: 1,
      ...access,
    })
    return result.docs
  })
})

// ─── Translation availability (hreflang) ────────────────────────────────────

const TITLE_FIELD: Record<RoutableSlug, string> = {
  projects: "title",
  posts: "title",
  services: "title",
  products: "tagline",
}

/**
 * Which locales have their own (non-fallback) content for a record. Used so
 * language alternates are only advertised when a real translation exists.
 */
export const getTranslatedLocales = cache(
  async (collection: RoutableSlug, id: number | string): Promise<Locale[]> => {
    const access = await accessArgs()
    return run(`${collection} ${id} translations`, async (payload) => {
      const field = TITLE_FIELD[collection]
      const locales: Locale[] = []
      for (const locale of ["en", "ar"] as const) {
        const doc = (await payload.findByID({
          collection,
          id,
          locale,
          fallbackLocale: false,
          depth: 0,
          select: { [field]: true },
          ...access,
        })) as unknown as Record<string, unknown>
        if (typeof doc?.[field] === "string" && (doc[field] as string).trim()) locales.push(locale)
      }
      return locales
    })
  },
)

// ─── Redirects ──────────────────────────────────────────────────────────────

export async function getRedirectForPath(pathname: string) {
  const { resolveStoredRedirect } = await import("./redirects")
  return run(`redirect lookup ${pathname}`, (payload) => resolveStoredRedirect(payload, pathname))
}

// ─── Sitemap ────────────────────────────────────────────────────────────────

export type SitemapRecord = {
  collection: RoutableSlug
  slug: string
  updatedAt: string
  locales: Locale[]
}

/** All published, indexable records across every page of results. */
export async function getSitemapRecords(): Promise<SitemapRecord[]> {
  return run("sitemap records", async (payload) => {
    const records: SitemapRecord[] = []
    for (const collection of ["services", "products", "projects", "posts"] as const) {
      const field = TITLE_FIELD[collection]
      const translated = new Map<string, Set<Locale>>()
      for (const locale of ["en", "ar"] as const) {
        let page = 1
        for (;;) {
          const result = await payload.find({
            collection,
            locale,
            fallbackLocale: false,
            where: {
              or: [{ "seo.noIndex": { equals: false } }, { "seo.noIndex": { exists: false } }],
            },
            sort: "id",
            page,
            limit: 100,
            depth: 0,
            select: { slug: true, updatedAt: true, [field]: true },
            overrideAccess: false,
            draft: false,
          })
          for (const doc of result.docs as unknown as Array<Record<string, string>>) {
            const key = `${doc.slug}|${doc.updatedAt}`
            if (!translated.has(key)) translated.set(key, new Set())
            if (typeof doc[field] === "string" && doc[field].trim()) translated.get(key)!.add(locale)
          }
          if (!result.hasNextPage) break
          page += 1
        }
      }
      for (const [key, locales] of translated) {
        const [slug, updatedAt] = key.split("|") as [string, string]
        if (locales.size > 0) records.push({ collection, slug, updatedAt, locales: [...locales] })
      }
    }
    return records
  })
}

// ─── Development fixtures (explicit opt-in only) ────────────────────────────

export type DevelopmentFixtureProject = {
  id: string
  slug: string
  title: string
  summary: string
  sector: string
  year: string
  cardImage: Pick<Media, "url" | "alt" | "width" | "height">
  isDevelopmentFixture: true
}

function developmentFixturesEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.INHERITIX_DEV_FIXTURES === "true"
}

/** Fixture detail page (explicit dev opt-in, only when no CMS record has the slug). */
export async function getDevelopmentFixtureProject(slug: string, locale: Locale) {
  if (!developmentFixturesEnabled()) return null
  const { projectFixtures } = await import("@/content/development-fixtures")
  const found = projectFixtures.find((p) => p.slug === slug)
  if (!found) return null
  return {
    id: found.id,
    slug: found.slug,
    title: found.title[locale],
    summary: found.summary[locale],
    sector: found.sector[locale],
    year: found.year,
    services: found.services.map((s) => ({ name: s[locale] })),
    heroImage: { url: found.heroImage.src, alt: found.heroImage.alt[locale], width: 1600, height: 1200 },
    blocks: found.blocks.map((block) =>
      block.blockType === "cta"
        ? { ...block, actionLabel: block.action.label, actionHref: block.action.href[locale] }
        : block,
    ),
    isDevelopmentFixture: true as const,
  }
}

async function developmentFixtureListing(locale: Locale): Promise<ProjectListing> {
  const { projectFixtures } = await import("@/content/development-fixtures")
  const docs: DevelopmentFixtureProject[] = projectFixtures.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title[locale],
    summary: p.summary[locale],
    sector: p.sector[locale],
    year: p.year,
    cardImage: {
      url: p.cardImage.src,
      alt: p.cardImage.alt[locale],
      width: p.cardImage.width,
      height: p.cardImage.height,
    },
    isDevelopmentFixture: true,
  }))
  return {
    docs,
    totalDocs: docs.length,
    totalPages: 1,
    page: 1,
    sectors: [...new Set(docs.map((d) => d.sector))],
    isDevelopmentFixture: true,
  }
}
