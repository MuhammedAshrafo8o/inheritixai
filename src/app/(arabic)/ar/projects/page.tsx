import type { Metadata } from "next"
import { getListingPages, getPublishedProjects } from "@/cms/queries"
import { ProjectsPageView } from "@/components/pages/ProjectsPageView"

export const metadata: Metadata = {
  title: "المشاريع — إينهيريتكس",
  description:
    "استكشف الأنظمة الرقمية والمنصات التشغيلية والبرمجيات المطورة لعملاء إينهيريتكس.",
  alternates: {
    canonical: "/ar/projects",
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

export default async function ArabicProjectsPage({ searchParams }: Props) {
  const { sector = "all", page = "1" } = await searchParams
  const currentPage = Math.max(1, parseInt(page, 10) || 1)

  const [listingPages, projectsResult] = await Promise.all([
    getListingPages("ar"),
    getPublishedProjects("ar", {
      filter: sector,
      page: currentPage,
      limit: 12,
    }),
  ])

  return (
    <ProjectsPageView
      lang="ar"
      projects={projectsResult.docs as Array<Record<string, unknown>>}
      totalDocs={projectsResult.totalDocs}
      totalPages={projectsResult.totalPages}
      currentPage={projectsResult.page}
      listingHeader={listingPages?.projects as { kicker?: string; title?: string; intro?: string } | undefined}
    />
  )
}
