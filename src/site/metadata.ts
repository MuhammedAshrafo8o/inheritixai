import type { Metadata } from "next"
import type { Locale } from "@/content/types"
import type { Media, SiteSetting } from "@/payload-types"

export type SeoInput =
  | {
      title?: string | null
      description?: string | null
      ogImage?: number | Media | null
      noIndex?: boolean | null
    }
  | null
  | undefined

export function mediaOf(value: unknown): Media | null {
  return value && typeof value === "object" && "url" in value ? (value as Media) : null
}

/** "/projects" → "/ar/projects" for Arabic; external URLs pass through. */
export function localizedHref(path: string | null | undefined, locale: Locale, fallback = "/") {
  const href = path || fallback
  if (!href.startsWith("/") || href.startsWith("//")) return href
  const [pathname = "/", query] = href.split("?")
  const stripped = pathname === "/ar" ? "/" : pathname.startsWith("/ar/") ? pathname.slice(3) : pathname
  const localized = locale === "ar" ? `/ar${stripped === "/" ? "" : stripped}` : stripped
  return query ? `${localized}?${query}` : localized
}

/**
 * Builds page metadata from CMS SEO fields with fallbacks to page content and
 * site defaults. Language alternates are emitted only for `availableLocales`;
 * a locale rendered with fallback content points its canonical at an
 * available translation and is not indexed.
 */
export function buildMetadata({
  locale,
  path,
  seo,
  fallbackTitle,
  fallbackDescription,
  siteSettings,
  availableLocales = ["en", "ar"],
  absoluteTitle = false,
  type = "website",
}: {
  locale: Locale
  /** Locale-neutral path, e.g. "/projects/foo" */
  path: string
  seo?: SeoInput
  fallbackTitle?: string | null
  fallbackDescription?: string | null
  siteSettings?: SiteSetting | null
  availableLocales?: Locale[]
  absoluteTitle?: boolean
  type?: "website" | "article"
}): Metadata {
  const siteName = siteSettings?.siteName || "INHERITIX"
  const title = seo?.title || fallbackTitle || siteSettings?.defaultSeo?.title || siteName
  const description =
    seo?.description || fallbackDescription || siteSettings?.defaultSeo?.description || undefined
  const translated = availableLocales.includes(locale)
  const canonicalLocale: Locale = translated ? locale : availableLocales[0] ?? "en"
  const canonical = localizedHref(path, canonicalLocale)

  const languages: Record<string, string> = {}
  if (availableLocales.length > 1 || !translated) {
    for (const l of availableLocales) languages[l] = localizedHref(path, l)
    if (availableLocales.includes("en")) languages["x-default"] = localizedHref(path, "en")
  }

  const image = mediaOf(seo?.ogImage) ?? mediaOf(siteSettings?.defaultSeo?.ogImage)
  const images = image?.url
    ? [{ url: image.url, width: image.width ?? undefined, height: image.height ?? undefined, alt: image.alt ?? title }]
    : undefined
  const noIndex = Boolean(seo?.noIndex) || !translated

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: {
      canonical,
      languages: Object.keys(languages).length ? languages : undefined,
    },
    robots: noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      siteName,
      type,
      locale: locale === "ar" ? "ar_JO" : "en_US",
      alternateLocale: availableLocales.filter((l) => l !== locale).map((l) => (l === "ar" ? "ar_JO" : "en_US")),
      images,
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title,
      description,
      images: images?.map((i) => i.url),
    },
  }
}
