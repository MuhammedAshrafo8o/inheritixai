import React from "react"
import { Action } from "../ui/Action"
import { PageHero } from "../ui/PageHero"
import type { Locale } from "@/content/types"
import type { ListingPage, Service, SiteLabel } from "@/payload-types"

interface ServicesPageViewProps {
  lang: Locale
  services: Service[]
  listingHeader?: ListingPage["services"] | null
  labels: SiteLabel
}

export function ServicesPageView({ lang, services, listingHeader, labels }: ServicesPageViewProps) {
  const prefix = lang === "ar" ? "/ar" : ""
  const cardNote = listingHeader?.cardNote

  return (
    <main>
      <PageHero kicker={listingHeader?.kicker} title={listingHeader?.title} intro={listingHeader?.intro} />

      <section className="services-editorial page-pad">
        {services.map((service, index) => {
          const number = service.number || String(index + 1).padStart(2, "0")
          const text = [service.shortDescription, cardNote].filter(Boolean).join(" ")
          return (
            <article className="service-editorial reveal" key={service.id}>
              <div className={`service-art art-${index + 1}`}>
                <span>{number}</span>
                <i />
              </div>
              <div className="service-detail">
                <span>{number}</span>
                <h2>{service.title || service.slug}</h2>
                {text && <p>{text}</p>}
                {labels.seeService && <Action to={`${prefix}/services/${service.slug}`}>{labels.seeService}</Action>}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
