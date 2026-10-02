import React from "react"
import Link from "next/link"
import { Arrow } from "../ui/Icons"
import { PageHero } from "../ui/PageHero"
import { SectionHead } from "../ui/SectionHead"
import type { Locale } from "@/content/types"
import type { ListingPage, Post } from "@/payload-types"

interface InsightsPageViewProps {
  lang: Locale
  posts: Post[]
  listingHeader?: ListingPage["insights"] | null
}

export function InsightsPageView({ lang, posts, listingHeader }: InsightsPageViewProps) {
  const prefix = lang === "ar" ? "/ar" : ""
  const featured = posts.slice(0, 3)
  const remaining = posts.slice(3)

  return (
    <main>
      <PageHero kicker={listingHeader?.kicker} title={listingHeader?.title} intro={listingHeader?.intro} />

      {featured.length > 0 && (
        <section className="insights page-pad">
          <SectionHead label={listingHeader?.sectionLabel} title={listingHeader?.sectionTitle} />
          <div className="article-grid">
            {featured.map((article, index) => (
              <Link key={article.id} href={`${prefix}/insights/${article.slug}`} className="article-card reveal">
                <div className={`article-art ${article.color || "ink"}`}>
                  <span>0{index + 1}</span>
                  <i />
                </div>
                {article.categoryLabel && <span className="eyebrow">{article.categoryLabel}</span>}
                <h3>{article.title || article.slug}</h3>
                <div className="article-meta">
                  {article.readTime && <span>{article.readTime}</span>}
                  <Arrow />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {remaining.length > 0 && (
        <section className="journal-list page-pad">
          {remaining.map((article, i) => (
            <Link key={article.id} href={`${prefix}/insights/${article.slug}`}>
              <span>0{i + 4}</span>
              <h3>{article.title || article.slug}</h3>
              <small>{[article.categoryLabel, article.readTime].filter(Boolean).join(" · ")}</small>
              <Arrow />
            </Link>
          ))}
        </section>
      )}
    </main>
  )
}
