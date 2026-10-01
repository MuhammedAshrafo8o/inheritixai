import React from "react"
import Link from "next/link"
import { Action } from "../ui/Action"
import { Arrow } from "../ui/Icons"
import { SectionHead } from "../ui/SectionHead"
import type { Locale } from "@/content/types"

interface ArticlePageViewProps {
  lang: Locale
  post: Record<string, unknown>
  morePosts?: Array<Record<string, unknown>>
}

interface ArticleSection {
  sectionId?: string
  heading: string
  body: string
  quote?: string
}

export function ArticlePageView({
  lang,
  post,
  morePosts = [],
}: ArticlePageViewProps) {
  const isAr = lang === "ar"
  const prefix = isAr ? "/ar" : ""

  const title = (post.title as string) || (post.slug as string)
  const categoryLabel = (post.categoryLabel as string) || "PRODUCT THINKING"
  const readTime = (post.readTime as string) || "7 min read"
  const excerpt = (post.excerpt as string) || ""
  const leadParagraph = (post.leadParagraph as string) || ""
  const coverLabel = (post.coverLabel as string) || "USE"
  const coverSubtext = (post.coverSubtext as string) || "FUL"
  const coverCaption =
    (post.coverCaption as string) ||
    (isAr ? "الوضوح ميزة أساسية في المنتج، وليس مجرد تفضيل بصري." : "Clarity is a product feature, not a visual preference.")

  const author = post.author as { name?: string; initials?: string; role?: string } | undefined
  const authorName = author?.name || "INHERITIX Editorial"
  const authorInitials = author?.initials || "IN"
  const publishedDate = (post.publishedAt as string)
    ? new Date(post.publishedAt as string).toLocaleDateString(isAr ? "ar-JO" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : isAr ? "٢ أكتوبر ٢٠٢٦" : "October 2, 2026"

  const sections = (post.sections as ArticleSection[]) || []

  return (
    <main>
      <article className="article-page">
        {/* Header */}
        <header className="article-header page-pad">
          <span className="eyebrow">{categoryLabel} · {readTime}</span>
          <h1>{title}</h1>
          {excerpt && <p>{excerpt}</p>}
          <div className="byline">
            <div>{authorInitials}</div>
            <span>
              <b>{authorName}</b>
              <small>{publishedDate}</small>
            </span>
          </div>
        </header>

        {/* Cover graphic */}
        <figure className="article-cover">
          <div className="cover-type">
            {coverLabel}
            <br />
            <i>{coverSubtext}</i>
          </div>
          <figcaption>{coverCaption}</figcaption>
        </figure>

        {/* Layout */}
        <div className="article-layout page-pad">
          {sections.length > 0 && (
            <aside>
              <b>{isAr ? "المحتويات" : "CONTENTS"}</b>
              {sections.map((sec, i) => (
                <a key={i} href={`#${sec.sectionId || `section-${i}`}`}>
                  {sec.heading}
                </a>
              ))}
            </aside>
          )}

          <div className="prose">
            {leadParagraph && <p className="lead">{leadParagraph}</p>}

            {sections.map((sec, i) => (
              <React.Fragment key={i}>
                <h2 id={sec.sectionId || `section-${i}`}>{sec.heading}</h2>
                <p>{sec.body}</p>
                {sec.quote && <blockquote>“{sec.quote}”</blockquote>}
              </React.Fragment>
            ))}

            {/* Contextual CTA */}
            <div className="context-link">
              <span>{isAr ? "هل تبني منتجًا تشغيليًا؟" : "BUILDING AN OPERATIONAL PRODUCT?"}</span>
              <h3>
                {isAr
                  ? "يمكننا مساعدتك في جعل سير العمل واضحًا وفعالاً."
                  : "We can help make the workflow clear."}
              </h3>
              <Action to={`${prefix}/contact`}>
                {isAr ? "تحدث مع فريقنا" : "Talk to our team"}
              </Action>
            </div>
          </div>
        </div>
      </article>

      {/* More insights */}
      {morePosts.length > 0 && (
        <section className="insights page-pad">
          <SectionHead
            label={isAr ? "مقالات أخرى" : "MORE INSIGHTS"}
            title={isAr ? "أفكار للعمل الرقمي الأفضل." : "Thinking for better digital work."}
          />
          <div className="article-grid">
            {morePosts.slice(0, 3).map((article, index) => {
              const slug = article.slug as string
              const color = (article.color as string) || "ink"
              const catLabel = (article.categoryLabel as string) || "PRODUCT THINKING"
              const artTitle = (article.title as string) || slug
              const time = (article.readTime as string) || "7 min read"

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
                  <span className="eyebrow">{catLabel}</span>
                  <h3>{artTitle}</h3>
                  <div className="article-meta">
                    <span>{time}</span>
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
