import React from "react"
import Link from "next/link"
import { Action } from "../ui/Action"
import { SectionHead } from "../ui/SectionHead"
import type { Locale } from "@/content/types"

interface ProjectDetailPageViewProps {
  lang: Locale
  project: Record<string, unknown>
  relatedProjects?: Array<Record<string, unknown>>
}

interface ContentBlock {
  id?: string
  blockType: string
  [key: string]: unknown
}

export function ProjectDetailPageView({
  lang,
  project,
  relatedProjects = [],
}: ProjectDetailPageViewProps) {
  const isAr = lang === "ar"
  const prefix = isAr ? "/ar" : ""

  const title = (project.title as string) || (project.slug as string)
  const summary = (project.summary as string) || ""
  const sector = (project.sector as string) || ""
  const year = (project.year as string) || "2026"
  const services = (project.services as Array<{ name?: string } | string>) || []
  const heroImage = project.heroImage as { url?: string; alt?: string; width?: number; height?: number }
  const client = project.client as { name?: string; logo?: { url?: string; alt?: string }; website?: string; displayMode?: string } | undefined
  const externalLinks = (project.externalLinks as Array<{ label: string; url: string }>) || []
  const blocks = (project.blocks as ContentBlock[]) || []
  const isFixture = Boolean(project.isDevelopmentFixture)

  const getText = (val: unknown): string => {
    if (!val) return ""
    if (typeof val === "string") return val
    if (typeof val === "object" && val !== null) {
      const rec = val as Record<string, string>
      return rec[lang] || rec.en || rec.ar || ""
    }
    return String(val)
  }

  return (
    <main>
      <section className="project-hero page-pad">
        {isFixture && (
          <div className="fixture-notice" role="note">
            <strong>{isAr ? "نموذج تطوير" : "Development fixture"}</strong>
            <span>
              {isAr
                ? "محتوى توضيحي لا يمثل عملاً معتمدًا لعميل."
                : "Illustrative content — not approved or published client work."}
            </span>
          </div>
        )}

        <div className="project-hero-copy reveal">
          <span className="eyebrow">{sector} · {year}</span>
          <h1>{title}</h1>
          <p>{summary}</p>

          {/* Client info & external links */}
          {client && (
            <div className="project-client-meta" style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}>
              {client.logo?.url && (
                <img
                  src={client.logo.url}
                  alt={client.name || "Client logo"}
                  style={{ maxHeight: "32px", width: "auto" }}
                />
              )}
              {client.name && <strong>{client.name}</strong>}
              {client.website && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--accent, #00CCFF)", textDecoration: "underline" }}
                >
                  {isAr ? "الموقع الإلكتروني للعميل" : "Visit client site"}
                </a>
              )}
            </div>
          )}

          {externalLinks.length > 0 && (
            <div className="project-external-links" style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              {externalLinks.map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="action action-light"
                >
                  <span>{getText(link.label)}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {heroImage?.url && (
          <div className="project-hero-image reveal">
            <img
              src={heroImage.url}
              alt={heroImage.alt || title}
              width={heroImage.width || 1600}
              height={heroImage.height || 1200}
            />
          </div>
        )}

        <dl className="project-services reveal">
          <div>
            <dt>{isAr ? "القطاع" : "Sector"}</dt>
            <dd>{sector}</dd>
          </div>
          <div>
            <dt>{isAr ? "الخدمات" : "Services"}</dt>
            <dd>
              {services
                .map((s) => (typeof s === "string" ? s : s.name || ""))
                .filter(Boolean)
                .join(" · ")}
            </dd>
          </div>
          <div>
            <dt>{isAr ? "السنة" : "Year"}</dt>
            <dd>{year}</dd>
          </div>
        </dl>
      </section>

      {/* Modular Story Blocks */}
      <div className="project-blocks page-pad">
        {blocks.map((block, idx) => {
          const key = block.id || String(idx)

          if (block.blockType === "metrics") {
            const items = (block.items as Array<{ value: unknown; label: unknown }>) || []
            return (
              <section className="project-metrics reveal" key={key}>
                {items.map((item, itemIdx) => (
                  <div key={itemIdx}>
                    <strong>{getText(item.value)}</strong>
                    <span>{getText(item.label)}</span>
                  </div>
                ))}
              </section>
            )
          }

          if (block.blockType === "image") {
            const img = block.image as { url?: string; alt?: string; width?: number; height?: number }
            const caption = getText(block.caption)
            return (
              <figure className="project-block-image reveal" key={key}>
                {img?.url && (
                  <img
                    src={img.url}
                    alt={img.alt || title}
                    width={img.width || 1200}
                    height={img.height || 800}
                  />
                )}
                {caption && <figcaption>{caption}</figcaption>}
              </figure>
            )
          }

          if (block.blockType === "quote") {
            const quote = getText(block.quote)
            const attribution = getText(block.attribution)
            return (
              <figure className="project-quote reveal" key={key}>
                <blockquote>{quote}</blockquote>
                {attribution && <figcaption>{attribution}</figcaption>}
              </figure>
            )
          }

          if (block.blockType === "cta") {
            const heading = getText(block.heading)
            const body = getText(block.body)
            const actionLabel = getText(block.actionLabel) || (isAr ? "ناقش مشروعك" : "Discuss your project")
            const actionHref = (block.actionHref as string) || `${prefix}/contact`
            return (
              <section className="project-block project-block-cta reveal" key={key}>
                <h2>{heading}</h2>
                {body && <p>{body}</p>}
                <Action to={actionHref} light>
                  {actionLabel}
                </Action>
              </section>
            )
          }

          if (block.blockType === "intro" || block.blockType === "richText") {
            const eyebrow = getText(block.eyebrow)
            const heading = getText(block.heading)
            const body = getText(block.body)
            return (
              <section className="project-block reveal" key={key}>
                {eyebrow && <span className="eyebrow">{eyebrow}</span>}
                {heading && <h2>{heading}</h2>}
                {body && <p>{body}</p>}
              </section>
            )
          }

          return null
        })}
      </div>

      {/* Related Projects */}
      {relatedProjects.length > 0 && (
        <section className="related-projects page-pad">
          <SectionHead
            label={isAr ? "مشاريع مرتبطة" : "Related projects"}
            title={isAr ? "استكشف المزيد" : "Continue exploring"}
          />
          <div className="projects-grid projects-grid-related">
            {relatedProjects.map((item) => {
              const relSlug = item.slug as string
              const relTitle = (item.title as string) || relSlug
              const relSummary = (item.summary as string) || ""
              const relSector = (item.sector as string) || ""
              const relYear = (item.year as string) || "2026"
              const relCard = item.cardImage as { url?: string; alt?: string; width?: number; height?: number }
              const relUrl = `${prefix}/projects/${relSlug}`

              return (
                <article className="project-card reveal" key={item.id as string}>
                  <Link href={relUrl} className="project-card-visual">
                    {relCard?.url ? (
                      <img
                        src={relCard.url}
                        alt={relCard.alt || relTitle}
                        width={relCard.width || 800}
                        height={relCard.height || 600}
                      />
                    ) : (
                      <div className="project-card-placeholder" />
                    )}
                  </Link>
                  <div className="project-card-meta">
                    <span>{relSector}</span>
                    <span>{relYear}</span>
                  </div>
                  <h2>
                    <Link href={relUrl}>{relTitle}</Link>
                  </h2>
                  <p>{relSummary}</p>
                  <Action to={relUrl}>
                    {isAr ? "عرض المشروع" : "View project"}
                  </Action>
                </article>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
