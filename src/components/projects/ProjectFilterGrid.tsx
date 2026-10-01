"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import React from "react"
import { Action } from "../ui/Action"
import { Arrow } from "../ui/Icons"

interface ProjectDoc {
  id: string | number
  slug: string
  title: string
  summary: string
  sector: string
  year: string
  cardImage?: {
    url?: string
    alt?: string
    width?: number
    height?: number
  }
  featured?: boolean
  isDevelopmentFixture?: boolean
}

interface ProjectFilterGridProps {
  lang: "en" | "ar"
  initialProjects: ProjectDoc[]
  totalDocs: number
  totalPages: number
  currentPage: number
}

const filters = [
  { value: "all", en: "All projects", ar: "كل المشاريع" },
  { value: "Enterprise operations", en: "Operations", ar: "العمليات" },
  { value: "Digital services", en: "Digital services", ar: "الخدمات الرقمية" },
]

export function ProjectFilterGrid({
  lang,
  initialProjects,
  totalPages,
  currentPage,
}: ProjectFilterGridProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSector = searchParams.get("sector") || "all"

  const updateFilters = (newSector: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newSector === "all") {
      params.delete("sector")
    } else {
      params.set("sector", newSector)
    }
    // Genuine requirement: Reset pagination when filters change
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`)
  }

  const updatePage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (nextPage <= 1) {
      params.delete("page")
    } else {
      params.set("page", String(nextPage))
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  // Client-side filtering fallback if static or fixture
  const visibleProjects = initialProjects.filter((project) => {
    if (currentSector === "all") return true
    return project.sector === currentSector
  })

  const hasFixture = visibleProjects.some((p) => p.isDevelopmentFixture)

  return (
    <>
      {hasFixture && (
        <div className="fixture-notice" role="note">
          <strong>{lang === "ar" ? "نموذج تطوير" : "Development fixture"}</strong>
          <span>
            {lang === "ar"
              ? "محتوى توضيحي لا يمثل عملاً معتمدًا لعميل."
              : "Illustrative content — not approved or published client work."}
          </span>
        </div>
      )}

      <div
        className="project-filters reveal"
        aria-label={lang === "ar" ? "تصفية المشاريع" : "Filter projects"}
      >
        {filters.map((item) => (
          <button
            type="button"
            key={item.value}
            className={currentSector === item.value ? "active" : ""}
            aria-pressed={currentSector === item.value}
            onClick={() => updateFilters(item.value)}
          >
            {item[lang]}
          </button>
        ))}
      </div>

      <div className="projects-grid" aria-live="polite">
        {visibleProjects.map((project) => {
          const detailUrl = `${lang === "ar" ? "/ar" : ""}/projects/${project.slug}`
          return (
            <article className="project-card reveal" key={project.id}>
              <Link
                href={detailUrl}
                className="project-card-visual"
              >
                {project.cardImage?.url ? (
                  <img
                    src={project.cardImage.url}
                    alt={project.cardImage.alt || project.title}
                    width={project.cardImage.width || 800}
                    height={project.cardImage.height || 600}
                  />
                ) : (
                  <div className="project-card-placeholder" />
                )}
              </Link>
              <div className="project-card-meta">
                <span>{project.sector}</span>
                <span>{project.year}</span>
              </div>
              <h2>
                <Link href={detailUrl}>
                  {project.title}
                </Link>
              </h2>
              <p>{project.summary}</p>
              <Action to={detailUrl}>
                {lang === "ar" ? "عرض المشروع" : "View project"}
              </Action>
            </article>
          )
        })}
      </div>

      {totalPages > 1 && (
        <nav
          className="project-pagination reveal"
          aria-label={lang === "ar" ? "صفحات المشاريع" : "Project pages"}
        >
          <button
            type="button"
            disabled={currentPage <= 1}
            aria-label={lang === "ar" ? "الصفحة السابقة" : "Previous page"}
            onClick={() => updatePage(currentPage - 1)}
          >
            <Arrow reverse />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              className={currentPage === p ? "active" : ""}
              aria-current={currentPage === p ? "page" : undefined}
              onClick={() => updatePage(p)}
            >
              {p}
            </button>
          ))}

          <button
            type="button"
            disabled={currentPage >= totalPages}
            aria-label={lang === "ar" ? "الصفحة التالية" : "Next page"}
            onClick={() => updatePage(currentPage + 1)}
          >
            <Arrow />
          </button>
        </nav>
      )}
    </>
  )
}
