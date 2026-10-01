import type { Metadata } from "next"
import { getListingPages, getPublishedProjects } from "@/cms/queries"
import { ProjectsPageView } from "@/components/pages/ProjectsPageView"

export const metadata: Metadata = {
  title: "Projects — Inheritix",
  description:
    "Explore digital systems, operational platforms, and software engineered for clients by Inheritix.",
  alternates: {
    canonical: "/projects",
    languages: {
      en: "/projects",
      ar: "/ar/projects",
      "x-default": "/projects",
    },
  },
}

type Props = {
  searchParams: Promise<{ sector?: string; page?: string }>
}

export default async function ProjectsPage({ searchParams }: Props) {
  const { sector = "all", page = "1" } = await searchParams
  const currentPage = Math.max(1, parseInt(page, 10) || 1)

  const [listingPages, projectsResult] = await Promise.all([
    getListingPages("en"),
    getPublishedProjects("en", {
      filter: sector,
      page: currentPage,
      limit: 12,
    }),
  ])

  return (
    <ProjectsPageView
      lang="en"
      projects={projectsResult.docs as Array<Record<string, unknown>>}
      totalDocs={projectsResult.totalDocs}
      totalPages={projectsResult.totalPages}
      currentPage={projectsResult.page}
      listingHeader={listingPages?.projects as { kicker?: string; title?: string; intro?: string } | undefined}
    />
  )
}
