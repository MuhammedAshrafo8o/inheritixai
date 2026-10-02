import type { MetadataRoute } from "next"
import {
  getAboutPage,
  getContactPage,
  getHomePage,
  getListingPages,
  getSitemapRecords,
} from "@/cms/queries"
import type { Locale } from "@/content/types"
import { getSiteUrl } from "@/env"
import { localizedHref } from "@/site/metadata"

// Always generated from the database at request time so publish/unpublish and
// noIndex changes are reflected immediately (on-demand revalidation does not
// reliably purge the static sitemap metadata route).
export const dynamic = "force-dynamic"

const ROUTE_PREFIX = {
  services: "/services",
  products: "/products",
  projects: "/projects",
  posts: "/insights",
} as const

function entry(path: string, locales: Locale[], lastModified?: string, priority = 0.7): MetadataRoute.Sitemap {
  const base = getSiteUrl()
  const languages: Record<string, string> = {}
  if (locales.length > 1) {
    for (const l of locales) languages[l] = `${base}${localizedHref(path, l)}`
    if (locales.includes("en")) languages["x-default"] = `${base}${localizedHref(path, "en")}`
  }
  return locales.map((locale) => ({
    url: `${base}${localizedHref(path, locale)}`,
    lastModified: lastModified ? new Date(lastModified) : undefined,
    priority,
    alternates: locales.length > 1 ? { languages } : undefined,
  }))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [records, home, about, contact, listings] = await Promise.all([
    getSitemapRecords(),
    getHomePage("en"),
    getAboutPage("en"),
    getContactPage("en"),
    getListingPages("en"),
  ])

  const both: Locale[] = ["en", "ar"]
  const entries: MetadataRoute.Sitemap = []
  const staticPages: Array<[string, { seo?: { noIndex?: boolean | null } | null } | null | undefined, number]> = [
    ["/", home, 1],
    ["/services", listings.services, 0.8],
    ["/products", listings.products, 0.8],
    ["/projects", listings.projects, 0.8],
    ["/insights", listings.insights, 0.8],
    ["/about", about, 0.6],
    ["/contact", contact, 0.6],
  ]
  for (const [path, doc, priority] of staticPages) {
    if (!doc?.seo?.noIndex) entries.push(...entry(path, both, undefined, priority))
  }

  for (const record of records) {
    entries.push(...entry(`${ROUTE_PREFIX[record.collection]}/${record.slug}`, record.locales, record.updatedAt))
  }
  return entries
}
