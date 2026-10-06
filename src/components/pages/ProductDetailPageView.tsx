import React from "react"
import { Action } from "../ui/Action"
import { SectionHead } from "../ui/SectionHead"
import { Dashboard } from "../mockups/Dashboard"
import { MenuPhone } from "../mockups/MenuPhone"
import type { Locale } from "@/content/types"
import type { Product, SiteLabel } from "@/payload-types"

interface ProductDetailPageViewProps {
  lang: Locale
  product: Product
  labels: SiteLabel
}

/**
 * All copy comes from the product record and Site Labels; sections with no
 * content are hidden. The dashboard/phone illustrations are design components
 * (not CMS content), selected by the product's visualType.
 */
export function ProductDetailPageView({ lang, product, labels }: ProductDetailPageViewProps) {
  const prefix = lang === "ar" ? "/ar" : ""
  const isPhone = product.visualType === "phone"
  const valuePoints = product.valuePoints ?? []
  const workflowSteps = product.workflowSteps ?? []
  const faqs = product.faqs ?? []

  return (
    <main className={isPhone ? "product-page fen" : "product-page logistics"}>
      <section className="product-hero page-pad">
        {product.badge && <span className="eyebrow">{product.badge}</span>}
        <h1>{product.heroHeadline}</h1>
        {product.heroDescription && <p>{product.heroDescription}</p>}
        {labels.requestDemo && <Action to={`${prefix}/contact?type=demo&product=${encodeURIComponent(product.slug)}`}>{labels.requestDemo}</Action>}
      </section>

      <div className="product-hero-visual">
        {isPhone ? (
          <div className="phones">
            <MenuPhone />
            <MenuPhone />
            <MenuPhone />
          </div>
        ) : (
          <Dashboard />
        )}
      </div>

      {valuePoints.length > 0 && (
        <section className="value-strip page-pad">
          {valuePoints.map((v, i) => (
            <div key={v.id ?? i}>
              <span>{v.label}</span>
              <p>{v.description}</p>
            </div>
          ))}
        </section>
      )}

      {workflowSteps.length > 0 && (
        <section className="workflow page-pad">
          <SectionHead label={labels.coreWorkflow} title={product.workflowTitle} />
          <div className="workflow-line">
            {workflowSteps.map((step, i) => (
              <div key={step.id ?? i}>
                <span>{step.stepNumber}</span>
                <b>{step.name}</b>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="interface-tour page-pad">
        <SectionHead label={labels.interfaceTour} title={labels.interfaceTourTitle} />
        <div className="tour-large">{isPhone ? <MenuPhone /> : <Dashboard />}</div>
        {(product.tourTitle || product.tourDescription) && (
          <div className="tour-copy">
            {product.tourTitle && <h3>{product.tourTitle}</h3>}
            {product.tourDescription && <p>{product.tourDescription}</p>}
          </div>
        )}
      </section>

      {faqs.length > 0 && (
        <section className="faq page-pad">
          <SectionHead label={labels.faq} title={labels.faqTitle} />
          {faqs.map((q, i) => (
            <details key={q.id ?? i}>
              <summary>
                {q.question}
                <span aria-hidden="true">＋</span>
              </summary>
              <p>{q.answer}</p>
            </details>
          ))}
        </section>
      )}
    </main>
  )
}
