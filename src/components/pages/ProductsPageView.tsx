import React from "react"
import { Action } from "../ui/Action"
import { PageHero } from "../ui/PageHero"
import { Dashboard } from "../mockups/Dashboard"
import { MenuPhone } from "../mockups/MenuPhone"
import type { Locale } from "@/content/types"

interface ProductsPageViewProps {
  lang: Locale
  products: Array<Record<string, unknown>>
  listingHeader?: {
    kicker?: string
    title?: string
    intro?: string
  }
}

export function ProductsPageView({
  lang,
  products,
  listingHeader,
}: ProductsPageViewProps) {
  const isAr = lang === "ar"
  const prefix = isAr ? "/ar" : ""

  const kicker = listingHeader?.kicker || "INHERITIX PRODUCTS"
  const title =
    listingHeader?.title ||
    (isAr ? "منتجات صنعتها خبرة حقيقية." : "Products shaped by real operations.")
  const intro =
    listingHeader?.intro ||
    (isAr
      ? "نبني ونمتلك منتجات برمجية متخصصة للقطاعات التي تهتم بالوضوح والسرعة وسير العمل الموثوق."
      : "We build and own focused software products for industries where clarity, speed, and a dependable workflow matter.")

  return (
    <main>
      <PageHero kicker={kicker} title={title} intro={intro} />

      <section className="products-index page-pad">
        {products.map((product, index) => {
          const slug = product.slug as string
          const name = product.name as string
          const badge = (product.badge as string) || (index === 0 ? "01 / LOGISTICS OPERATIONS" : "02 / RESTAURANT EXPERIENCE")
          const summary = product.summary as string
          const isReverse = index % 2 !== 0

          return (
            <article
              className={`product-index-item ${isReverse ? "reverse" : ""} reveal`}
              key={slug}
            >
              <div>
                <span className="eyebrow">{badge}</span>
                <h2>{name}</h2>
                <p>{summary}</p>
                <Action to={`${prefix}/products/${slug}`}>
                  {isAr ? `استكشف ${name}` : `Explore ${name}`}
                </Action>
              </div>
              <div className={`index-visual ${index === 0 ? "blue" : "coral"}`}>
                {index === 0 ? <Dashboard /> : <MenuPhone />}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
