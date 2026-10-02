import React from "react"
import Link from "next/link"
import { Action } from "../ui/Action"
import { SectionHead } from "../ui/SectionHead"
import { RichTextContent } from "../ui/RichTextContent"
import type { Locale } from "@/content/types"
import type { Project, SiteLabel } from "@/payload-types"
import { localizedHref, mediaOf } from "@/site/metadata"

type ProjectLike = Partial<Omit<Project, "id" | "blocks" | "services" | "heroImage">> & {
  id?: number | string
  slug: string
  title?: string | null
  isDevelopmentFixture?: boolean
  heroImage?: unknown
  blocks?: unknown
  services?: unknown
}

interface ProjectDetailPageViewProps {
  lang: Locale
  project: ProjectLike
  labels: SiteLabel
  relatedProjects?: Project[]
  isDraftPreview?: boolean
}

type ContentBlock = { id?: string | null; blockType: string; [key: string]: unknown }

/** Localized fields arrive as strings from Payload; development fixtures carry {en, ar}. */
function textOf(value: unknown, lang: Locale): string {
  if (!value) return ""
  if (typeof value === "string") return value
  if (typeof value === "object") {
    const rec = value as Record<string, string>
    return rec[lang] || rec.en || ""
  }
  return String(value)
}

export function ProjectDetailPageView({
  lang,
  project,
  labels,
  relatedProjects = [],
  isDraftPreview = false,
}: ProjectDetailPageViewProps) {
  const isAr = lang === "ar"
  const href = (path: string) => localizedHref(path, lang)

  const title = project.title || project.slug
  const summary = project.intro || project.summary || ""
  const techStack = (project.techStack ?? []).map((t) => t.technology).filter(Boolean)
  const sector = project.sector || ""
  const year = project.year || ""
  const services = (Array.isArray(project.services) ? project.services : []) as Array<{ name?: string | null }>
  const heroImage = mediaOf(project.heroImage) ?? (project.heroImage as { url?: string; alt?: string } | undefined)
  const client = typeof project.client === "object" && project.client ? project.client : undefined
  const clientLogo = mediaOf(client?.logo)
  const externalLinks = project.externalLinks ?? []
  const blocks = (Array.isArray(project.blocks) ? project.blocks : []) as ContentBlock[]
  const serviceNames = services.map((s) => s.name || "").filter(Boolean).join(" · ")
  // Fact rows render only when both the label and the value exist.
  const facts = (
    [
      [labels.sector, sector],
      [labels.services, serviceNames],
      [labels.year, year],
      [labels.technology, techStack.join(" · ")],
    ] as Array<[string | null | undefined, string]>
  ).filter((row): row is [string, string] => Boolean(row[0] && row[1]))

  return (
    <main>
      <section className="project-hero page-pad">
        {project.isDevelopmentFixture && (
          <div className="fixture-notice" role="note">
            <strong>{isAr ? "نموذج تطوير" : "Development fixture"}</strong>
            <span>
              {isAr
                ? "محتوى توضيحي لا يمثل عملاً معتمدًا لعميل."
                : "Illustrative content — not approved or published client work."}
            </span>
          </div>
        )}
        {isDraftPreview && project._status !== "published" && (labels.draftPreview || labels.draftPreviewNote) && (
          <div className="fixture-notice" role="note">
            {labels.draftPreview && <strong>{labels.draftPreview}</strong>}
            {labels.draftPreviewNote && <span>{labels.draftPreviewNote}</span>}
          </div>
        )}

        <div className="project-hero-copy reveal">
          {(sector || year) && <span className="eyebrow">{[sector, year].filter(Boolean).join(" · ")}</span>}
          <h1>{title}</h1>
          {summary && <p>{summary}</p>}

          {client && (
            <div
              className="project-client-meta"
              style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "1.5rem" }}
            >
              {clientLogo?.url && (
                <img
                  src={clientLogo.url}
                  alt={client.logoDescription || clientLogo.alt || client.name}
                  style={{
                    maxHeight: "32px",
                    width: "auto",
                    filter: client.displayMode === "monochrome" ? "grayscale(1)" : undefined,
                  }}
                />
              )}
              <strong>{client.name}</strong>
              {client.website && labels.visitClientSite && (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--blue)", textDecoration: "underline" }}
                >
                  {labels.visitClientSite}
                </a>
              )}
            </div>
          )}

          {externalLinks.length > 0 && (
            <div
              className="project-external-links"
              style={{ marginTop: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}
            >
              {externalLinks.map((link) => (
                <a key={link.id ?? link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="action">
                  <span>{link.label}</span>
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
              width={(heroImage as { width?: number }).width || 1600}
              height={(heroImage as { height?: number }).height || 1200}
            />
          </div>
        )}

        {facts.length > 0 && (
          <dl className="project-services reveal">
            {facts.map(([term, value]) => (
              <div key={term}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <div className="project-blocks page-pad">
        {blocks.map((block, idx) => {
          const key = block.id || String(idx)

          if (block.blockType === "metrics") {
            const items = (block.items as Array<{ id?: string; value: unknown; label: unknown }>) || []
            return (
              <section className="project-metrics reveal" key={key}>
                {items.map((item, itemIdx) => (
                  <div key={item.id ?? itemIdx}>
                    <strong>{textOf(item.value, lang)}</strong>
                    <span>{textOf(item.label, lang)}</span>
                  </div>
                ))}
              </section>
            )
          }

          if (block.blockType === "image") {
            const img = mediaOf(block.image)
            const caption = textOf(block.caption, lang)
            return (
              <figure className="project-block-image reveal" key={key}>
                {img?.url && (
                  <img src={img.url} alt={img.alt || title} width={img.width || 1200} height={img.height || 800} />
                )}
                {caption && <figcaption>{caption}</figcaption>}
              </figure>
            )
          }

          if (block.blockType === "quote") {
            const attribution = textOf(block.attribution, lang)
            return (
              <figure className="project-quote reveal" key={key}>
                <blockquote>{textOf(block.quote, lang)}</blockquote>
                {attribution && <figcaption>{attribution}</figcaption>}
              </figure>
            )
          }

          if (block.blockType === "cta") {
            const body = textOf(block.body, lang)
            const actionHref = textOf(block.actionHref, lang)
            const actionLabel = textOf(block.actionLabel, lang)
            return (
              <section className="project-block project-block-cta reveal" key={key}>
                <h2>{textOf(block.heading, lang)}</h2>
                {body && <p>{body}</p>}
                {actionHref && actionLabel && (
                  <Action to={href(actionHref)} light>
                    {actionLabel}
                  </Action>
                )}
              </section>
            )
          }

          if (block.blockType === "intro") {
            const eyebrow = textOf(block.eyebrow, lang)
            const heading = textOf(block.heading, lang)
            const body = textOf(block.body, lang)
            return (
              <section className="project-block reveal" key={key}>
                {eyebrow && <span className="eyebrow">{eyebrow}</span>}
                {heading && <h2>{heading}</h2>}
                {body && <p>{body}</p>}
              </section>
            )
          }

          if (block.blockType === "richText") {
            const heading = textOf(block.heading, lang)
            const body = typeof block.body === "object" && block.body && !("root" in block.body)
              ? textOf(block.body, lang)
              : block.body
            return (
              <section className="project-block project-block-richtext reveal" key={key}>
                {heading && <h2>{heading}</h2>}
                <RichTextContent value={body} />
              </section>
            )
          }

          return null
        })}
      </div>

      {relatedProjects.length > 0 && (
        <section className="related-projects page-pad">
          <SectionHead label={labels.relatedProjectsLabel} title={labels.relatedProjectsTitle} />
          <div className="projects-grid projects-grid-related">
            {relatedProjects.map((item) => {
              const relUrl = href(`/projects/${item.slug}`)
              const relCard = mediaOf(item.cardImage)
              return (
                <article className="project-card reveal" key={item.id}>
                  <Link href={relUrl} className="project-card-visual">
                    {relCard?.url ? (
                      <img
                        src={relCard.url}
                        alt={relCard.alt || item.title}
                        width={relCard.width || 800}
                        height={relCard.height || 600}
                      />
                    ) : (
                      <div className="project-card-placeholder" />
                    )}
                  </Link>
                  <div className="project-card-meta">
                    <span>{item.sector}</span>
                    <span>{item.year}</span>
                  </div>
                  <h2>
                    <Link href={relUrl}>{item.title}</Link>
                  </h2>
                  <p>{item.summary}</p>
                  {labels.viewProject && <Action to={relUrl}>{labels.viewProject}</Action>}
                </article>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
