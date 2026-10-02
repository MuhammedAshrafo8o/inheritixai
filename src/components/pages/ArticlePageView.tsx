import React from "react"
import Link from "next/link"
import { Action } from "../ui/Action"
import { Arrow } from "../ui/Icons"
import { SectionHead } from "../ui/SectionHead"
import { RichTextContent } from "../ui/RichTextContent"
import type { Locale } from "@/content/types"
import type { Post, SiteLabel } from "@/payload-types"
import { localizedHref } from "@/site/metadata"

interface ArticlePageViewProps {
  lang: Locale
  post: Post
  morePosts?: Post[]
  labels: SiteLabel
}

export function ArticlePageView({
  lang,
  post,
  morePosts = [],
  labels,
}: ArticlePageViewProps) {
  const isAr = lang === "ar"
  const prefix = isAr ? "/ar" : ""

  const title = post.title || post.slug
  const cta = labels.articleCta
  const categoryLabel =
    post.categoryLabel || (typeof post.category === "object" && post.category ? post.category.name : "")
  const readTime = post.readTime || ""
  const excerpt = post.excerpt || ""
  const leadParagraph = post.leadParagraph || ""
  const coverImage = typeof post.coverImage === "object" && post.coverImage ? post.coverImage : null

  const author = typeof post.author === "object" && post.author ? post.author : null
  const authorAvatar = author && typeof author.avatar === "object" && author.avatar ? author.avatar : null
  const publishedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString(isAr ? "ar-JO" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  const sections = post.sections ?? []

  return (
    <main>
      <article className="article-page">
        {/* Header */}
        <header className="article-header page-pad">
          <span className="eyebrow">{[categoryLabel, readTime].filter(Boolean).join(" · ")}</span>
          <h1>{title}</h1>
          {excerpt && <p>{excerpt}</p>}
          {(author || publishedDate) && (
            <div className="byline">
              {authorAvatar?.url ? (
                <img src={authorAvatar.url} alt="" style={{ width: "2.75rem", height: "2.75rem", borderRadius: "50%", objectFit: "cover" }} />
              ) : (
                <div aria-hidden="true">
                  {author?.initials ||
                    (author?.name ?? "")
                      .split(/s+/)
                      .map((word) => word[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                </div>
              )}
              <span>
                {author && <b>{author.name}</b>}
                {author?.role && <small>{author.role}</small>}
                {publishedDate && (
                  <small>
                    <time dateTime={post.publishedAt ?? undefined}>{publishedDate}</time>
                  </small>
                )}
              </span>
            </div>
          )}
        </header>

        {/* Cover graphic */}
        <figure className="article-cover">
          {coverImage?.url ? (
            <img
              src={coverImage.url}
              alt={coverImage.alt || ""}
              style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
            />
          ) : (
            <div className="cover-type">
              {post.coverLabel}
              <br />
              <i>{post.coverSubtext}</i>
            </div>
          )}
          {post.coverCaption && <figcaption>{post.coverCaption}</figcaption>}
        </figure>

        {/* Layout */}
        <div className="article-layout page-pad">
          {sections.length > 0 && (
            <aside>
              {labels.contents && <b>{labels.contents}</b>}
              {sections.map((sec, i) => (
                <a key={sec.id ?? i} href={`#${sec.sectionId || `section-${i}`}`}>
                  {sec.heading}
                </a>
              ))}
            </aside>
          )}

          <div className="prose">
            {leadParagraph && <p className="lead">{leadParagraph}</p>}

            {sections.map((sec, i) => (
              <React.Fragment key={sec.id ?? i}>
                <h2 id={sec.sectionId || `section-${i}`}>{sec.heading}</h2>
                <RichTextContent value={sec.body} />
                {sec.quote && <blockquote>“{sec.quote}”</blockquote>}
              </React.Fragment>
            ))}

            {/* Contextual CTA (Site Labels → Articles) */}
            {cta?.visible !== false && (cta?.eyebrow || cta?.title || (cta?.label && cta?.href)) && (
              <div className="context-link">
                {cta?.eyebrow && <span>{cta.eyebrow}</span>}
                {cta?.title && <h3>{cta.title}</h3>}
                {cta?.label && cta?.href && <Action to={localizedHref(cta.href, lang)}>{cta.label}</Action>}
              </div>
            )}
          </div>
        </div>
      </article>

      {/* More insights */}
      {morePosts.length > 0 && (
        <section className="insights page-pad">
          <SectionHead label={labels.moreInsightsLabel} title={labels.moreInsightsTitle} />
          <div className="article-grid">
            {morePosts.slice(0, 3).map((article, index) => {
              const slug = article.slug
              const color = article.color || "ink"
              const catLabel = article.categoryLabel || ""
              const artTitle = article.title || slug
              const time = article.readTime || ""

              return (
                <Link
                  key={slug}
                  href={`${prefix}/insights/${slug}`}
                  className="article-card reveal"
                >
                  <div className={`article-art ${color}`}>
                    <span>0{index + 1}</span>
                    <i />
                  </div>
                  {catLabel && <span className="eyebrow">{catLabel}</span>}
                  <h3>{artTitle}</h3>
                  <div className="article-meta">
                    {time && <span>{time}</span>}
                    <Arrow />
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </main>
  )
}
