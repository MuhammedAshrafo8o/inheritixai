import React, { Suspense } from "react"
import { PageHero } from "../ui/PageHero"
import { ProjectFilterGrid } from "../projects/ProjectFilterGrid"
import type { Locale } from "@/content/types"
import type { SiteLabel } from "@/payload-types"
import type { ProjectListing } from "@/cms/queries"
import { mediaOf } from "@/site/metadata"

interface ProjectsPageViewProps {
  lang: Locale
  listing: ProjectListing
  currentSector: string
  listingHeader?: { kicker?: string | null; title?: string | null; intro?: string | null } | null
  labels: SiteLabel
}

export function ProjectsPageView({ lang, listing, currentSector, listingHeader, labels }: ProjectsPageViewProps) {

  const projects = listing.docs.map((p) => {
    const card = "isDevelopmentFixture" in p ? p.cardImage : mediaOf(p.cardImage)
    return {
      id: p.id,
      slug: p.slug,
      title: p.title || p.slug,
      summary: p.summary || "",
      sector: p.sector || "",
      year: p.year || "",
      cardImage: card?.url
        ? { url: card.url, alt: card.alt || "", width: card.width ?? undefined, height: card.height ?? undefined }
        : undefined,
      isDevelopmentFixture: "isDevelopmentFixture" in p,
    }
  })

  return (
    <main>
      <PageHero
        kicker={listingHeader?.kicker || ""}
        title={listingHeader?.title || ""}
        intro={listingHeader?.intro || ""}
      />

      <section
        className="projects-index page-pad"
        aria-labelledby={labels.projectList ? "projects-heading" : undefined}
      >
        {labels.projectList && (
          <h2 id="projects-heading" className="sr-only">
            {labels.projectList}
          </h2>
        )}

        <Suspense fallback={null}>
          <ProjectFilterGrid
            lang={lang}
            initialProjects={projects}
            sectors={listing.sectors}
            currentSector={currentSector}
            totalPages={listing.totalPages}
            currentPage={listing.page}
            labels={{
              allProjects: labels.allProjects || "",
              previousPage: labels.previousPage || "",
              nextPage: labels.nextPage || "",
              viewProject: labels.viewProject || "",
              filterProjects: labels.filterProjects || "",
              projectPages: labels.projectPages || "",
            }}
          />
        </Suspense>
      </section>
    </main>
  )
}
