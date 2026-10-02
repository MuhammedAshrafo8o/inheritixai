import React from "react"
import { Action } from "../ui/Action"
import { PageHero } from "../ui/PageHero"
import { Dashboard } from "../mockups/Dashboard"
import { MenuPhone } from "../mockups/MenuPhone"
import type { Locale } from "@/content/types"
import type { Product, SiteLabel } from "@/payload-types"

interface ProductsPageViewProps {
  lang: Locale
  products: Product[]
  listingHeader?: { kicker?: string | null; title?: string | null; intro?: string | null } | null
  labels: SiteLabel
}

export function ProductsPageView({
  lang,
  products,
  listingHeader,
  labels,
}: ProductsPageViewProps) {
  const isAr = lang === "ar"
  const prefix = isAr ? "/ar" : ""

  return (
    <main>
      <PageHero kicker={listingHeader?.kicker} title={listingHeader?.title} intro={listingHeader?.intro} />

      <section className="products-index page-pad">
        {products.map((product, index) => {
          const slug = product.slug
          const name = product.name
          const badge = product.badge
          const summary = product.summary
          const isPhone = product.visualType === "phone"
          const isReverse = index % 2 !== 0

          return (
            <article
              className={`product-index-item ${isReverse ? "reverse" : ""} reveal`}
              key={product.id}
            >
              <div>
                {badge && <span className="eyebrow">{badge}</span>}
                <h2>{name}</h2>
                {summary && <p>{summary}</p>}
                <Action to={`${prefix}/products/${slug}`}>{`${labels.explore ?? ""} ${name}`.trim()}</Action>
              </div>
              <div className={`index-visual ${isPhone ? "coral" : "blue"}`}>
                {isPhone ? <MenuPhone /> : <Dashboard />}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
