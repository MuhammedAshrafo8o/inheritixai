import type { Locale, Project } from "@/content/types"
import { projectPublicWhere } from "./access"

export type PayloadProjectReader = {
  find(args: {
    collection: "projects"
    locale: Locale
    where: Record<string, unknown>
    limit?: number
    depth?: number
    draft: false
  }): Promise<{ docs: Project[] }>
}

export async function getPublishedProjects(
  payload: PayloadProjectReader,
  locale: Locale,
) {
  return payload.find({
    collection: "projects",
    locale,
    where: projectPublicWhere(),
    depth: 1,
    draft: false,
  })
}

export async function getPublishedFeaturedProjects(
  payload: PayloadProjectReader,
  locale: Locale,
) {
  return payload.find({
    collection: "projects",
    locale,
    where: projectPublicWhere({ featured: { equals: true } }),
    depth: 1,
    draft: false,
  })
}

export async function getPublishedRelatedProjects(
  payload: PayloadProjectReader,
  locale: Locale,
  relatedProjectIds: string[],
) {
  if (relatedProjectIds.length === 0) return { docs: [] }
  return payload.find({
    collection: "projects",
    locale,
    where: projectPublicWhere({ id: { in: relatedProjectIds } }),
    limit: relatedProjectIds.length,
    depth: 1,
    draft: false,
  })
}
