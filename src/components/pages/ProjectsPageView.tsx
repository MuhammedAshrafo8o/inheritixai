import React, { Suspense } from "react"
import { PageHero } from "../ui/PageHero"
import { ProjectFilterGrid } from "../projects/ProjectFilterGrid"
import type { Locale } from "@/content/types"

interface ProjectsPageViewProps {
  lang: Locale
  projects: Array<Record<string, unknown>>
  totalDocs: number
  totalPages: number
  currentPage: number
  listingHeader?: {
    kicker?: string
    title?: string
    intro?: string
  }
}

export function ProjectsPageView({
  lang,
  projects,
  totalDocs,
  totalPages,
  currentPage,
  listingHeader,
}: ProjectsPageViewProps) {
  const isAr = lang === "ar"

  const kicker = listingHeader?.kicker || (isAr ? "المشاريع" : "PROJECTS")
  const title =
    listingHeader?.title ||
    (isAr ? "أنظمة رقمية مصممة للعمل الحقيقي." : "Digital systems designed for real work.")
  const intro =
    listingHeader?.intro ||
    (isAr
      ? "تخطيطات جاهزة لعرض المشاريع المعتمدة بعد ربط بيانات Payload."
      : "Production-ready layouts for approved projects once Payload is connected.")

  const formattedProjects = projects.map((p) => ({
    id: p.id as string | number,
    slug: p.slug as string,
    title: (p.title as string) || (p.slug as string),
    summary: (p.summary as string) || "",
    sector: (p.sector as string) || "",
    year: (p.year as string) || "2026",
    cardImage: p.cardImage as { url?: string; alt?: string; width?: number; height?: number },
    featured: Boolean(p.featured),
    isDevelopmentFixture: Boolean(p.isDevelopmentFixture),
  }))

  return (
    <main>
      <PageHero kicker={kicker} title={title} intro={intro} />

      <section
        className="projects-index page-pad"
        aria-labelledby="projects-heading"
      >
        <h2 id="projects-heading" className="sr-only">
          {isAr ? "قائمة المشاريع" : "Project list"}
        </h2>

        <Suspense fallback={null}>
          <ProjectFilterGrid
            lang={lang}
            initialProjects={formattedProjects}
            totalDocs={totalDocs}
            totalPages={totalPages}
            currentPage={currentPage}
          />
        </Suspense>
      </section>
    </main>
  )
}
