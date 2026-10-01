import type { Locale } from "@/content/types"

export type ProjectMutation =
  | { event: "publish" | "unpublish" | "delete"; slug: string }
  | { event: "slug-change"; slug: string; previousSlug: string }

const locales: Locale[] = ["en", "ar"]

function projectPath(slug: string, locale: Locale) {
  return `${locale === "ar" ? "/ar" : ""}/projects/${slug}`
}

export function projectInvalidationTargets(mutation: ProjectMutation) {
  const paths = new Set<string>(["/projects", "/ar/projects", "/", "/ar"])
  const tags = new Set<string>([
    "projects",
    "projects:featured",
    "projects:related",
  ])

  for (const locale of locales) {
    paths.add(projectPath(mutation.slug, locale))
    tags.add(`project:${mutation.slug}:${locale}`)

    if (mutation.event === "slug-change") {
      paths.add(projectPath(mutation.previousSlug, locale))
      tags.add(`project:${mutation.previousSlug}:${locale}`)
    }
  }

  return { paths: [...paths], tags: [...tags] }
}

export type RedirectRecord = {
  from: string
  to: string
  locale: Locale
  statusCode: 308
}

export function redirectsForPublishedSlugChange(
  previousSlug: string,
  nextSlug: string,
): RedirectRecord[] {
  return locales.map((locale) => ({
    from: projectPath(previousSlug, locale),
    to: projectPath(nextSlug, locale),
    locale,
    statusCode: 308,
  }))
}
