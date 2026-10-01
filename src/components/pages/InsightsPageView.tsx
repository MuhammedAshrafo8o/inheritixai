import React from "react"
import Link from "next/link"
import { Arrow } from "../ui/Icons"
import { PageHero } from "../ui/PageHero"
import { SectionHead } from "../ui/SectionHead"
import type { Locale } from "@/content/types"

interface InsightsPageViewProps {
  lang: Locale
  posts: Array<Record<string, unknown>>
  listingHeader?: {
    kicker?: string
    title?: string
    intro?: string
  }
}

export function InsightsPageView({
  lang,
  posts,
  listingHeader,
}: InsightsPageViewProps) {
  const isAr = lang === "ar"
  const prefix = isAr ? "/ar" : ""

  const kicker = listingHeader?.kicker || "INSIGHTS"
  const title =
    listingHeader?.title ||
    (isAr ? "الملاحظات وراء العمل." : "The thinking behind the work.")
  const intro =
    listingHeader?.intro ||
    (isAr
      ? "رؤى عملية حول تصميم المنتجات وهندسة البرمجيات والأتمتة والأنظمة التشغيلية بينهما."
      : "Practical perspectives on product design, software engineering, automation, and the operational systems between them.")

  const featured = posts.slice(0, 3)
  const remaining = posts.slice(3)

  return (
    <main>
      <PageHero kicker={kicker} title={title} intro={intro} />

      <section className="insights page-pad">
        <SectionHead
          label={isAr ? "وجهة نظرنا" : "Our perspective"}
          title={isAr ? "أفكار للعمل الرقمي الأفضل." : "Thinking for better digital work."}
        />
        <div className="article-grid">
          {featured.map((article, index) => {
            const slug = article.slug as string
            const color = (article.color as string) || "ink"
            const categoryLabel = (article.categoryLabel as string) || "PRODUCT THINKING"
            const artTitle = (article.title as string) || slug
            const readTime = (article.readTime as string) || "7 min read"

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
                <span className="eyebrow">{categoryLabel}</span>
                <h3>{artTitle}</h3>
                <div className="article-meta">
                  <span>{readTime}</span>
                  <Arrow />
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {remaining.length > 0 && (
        <section className="journal-list page-pad">
          {remaining.map((article, i) => {
            const slug = article.slug as string
            const artTitle = (article.title as string) || slug
            const categoryLabel = (article.categoryLabel as string) || "STRATEGY"
            const readTime = (article.readTime as string) || "5 MIN READ"

            return (
              <Link
                key={slug}
                href={`${prefix}/insights/${slug}`}
              >
                <span>0{i + 4}</span>
                <h3>{artTitle}</h3>
                <small>{categoryLabel} · {readTime}</small>
                <Arrow />
              </Link>
            )
          })}
        </section>
      )}
    </main>
  )
}
