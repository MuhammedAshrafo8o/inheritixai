import React from "react"
import Link from "next/link"
import { Action } from "../ui/Action"
import { PageHero } from "../ui/PageHero"
import type { Locale } from "@/content/types"

interface ServicesPageViewProps {
  lang: Locale
  services: Array<Record<string, unknown>>
  listingHeader?: {
    kicker?: string
    title?: string
    intro?: string
  }
}

export function ServicesPageView({
  lang,
  services,
  listingHeader,
}: ServicesPageViewProps) {
  const isAr = lang === "ar"
  const prefix = isAr ? "/ar" : ""

  const kicker = listingHeader?.kicker || "SERVICES / 01—06"
  const title =
    listingHeader?.title ||
    (isAr ? "برمجيات تحل العمل الصعب." : "Software for the hard parts of work.")
  const intro =
    listingHeader?.intro ||
    (isAr
      ? "من منتج جديد إلى نظام أعمال أساسي، نجمع بين التفكير بالمنتج والتصميم والهندسة."
      : "From a new digital product to a core business system, we bring product thinking, design, and engineering together.")

  return (
    <main>
      <PageHero kicker={kicker} title={title} intro={intro} />

      <section className="services-editorial page-pad">
        {services.map((service, index) => {
          const slug = service.slug as string
          const number = (service.number as string) || `0${index + 1}`
          const name = (service.title as string) || slug
          const desc = (service.shortDescription as string) || ""

          return (
            <article className="service-editorial reveal" key={slug}>
              <div className={`service-art art-${index + 1}`}>
                <span>{number}</span>
                <i />
              </div>
              <div className="service-detail">
                <span>{number}</span>
                <h2>{name}</h2>
                <p>
                  {desc}{" "}
                  {isAr
                    ? "نحدد القيود الواقعية، ونصمم للأشخاص الذين يؤدون العمل، ونهندس للتكيف والتطور المستمر."
                    : "We map the real constraints, design for the people doing the work, and engineer for change."}
                </p>
                <Action to={`${prefix}/services/${slug}`}>
                  {isAr ? "تفاصيل الخدمة" : "See service"}
                </Action>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
