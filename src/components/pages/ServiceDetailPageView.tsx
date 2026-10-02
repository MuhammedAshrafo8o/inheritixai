import React from "react"
import { Action } from "../ui/Action"
import { PageHero } from "../ui/PageHero"
import type { Locale } from "@/content/types"
import type { Service, SiteLabel } from "@/payload-types"

interface ServiceDetailPageViewProps {
  lang: Locale
  service: Service
  labels: SiteLabel
}

type Section = {
  id: string
  nav?: string | null
  eyebrow?: string | null
  heading?: string | null
  body?: React.ReactNode
  hasContent: boolean
}

/**
 * Every section comes from the service record. A section whose heading and
 * content are empty is hidden, together with its "on this page" link.
 */
export function ServiceDetailPageView({ lang, service, labels }: ServiceDetailPageViewProps) {
  const prefix = lang === "ar" ? "/ar" : ""
  const deliverables = (service.deliverables ?? []).map((d) => d.item).filter(Boolean)

  const sections: Section[] = [
    {
      id: "problem",
      nav: labels.problemNav,
      eyebrow: service.problemEyebrow,
      heading: service.problemHeading,
      body: service.problemDescription ? <p>{service.problemDescription}</p> : null,
      hasContent: Boolean(service.problemHeading || service.problemDescription),
    },
    {
      id: "deliverables",
      nav: labels.deliverablesNav,
      eyebrow: service.deliverablesEyebrow,
      heading: service.deliverablesHeading,
      body: deliverables.length ? (
        <ul>
          {deliverables.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : null,
      hasContent: Boolean(service.deliverablesHeading || deliverables.length),
    },
    {
      id: "process",
      nav: labels.processNav,
      eyebrow: service.processEyebrow,
      heading: service.processHeading,
      body: service.processDescription ? <p>{service.processDescription}</p> : null,
      hasContent: Boolean(service.processHeading || service.processDescription),
    },
    {
      id: "next",
      nav: labels.nextStepNav,
      eyebrow: service.nextEyebrow,
      heading: service.nextHeading,
      body: labels.discussProject ? <Action to={`${prefix}/contact`}>{labels.discussProject}</Action> : null,
      hasContent: Boolean(service.nextHeading),
    },
  ].filter((section) => section.hasContent)

  const kicker = [labels.serviceKicker, service.number].filter(Boolean).join(" ")
  const navItems = sections.filter((section) => section.nav)

  return (
    <main>
      <PageHero kicker={kicker} title={service.title} intro={service.heroIntro} />

      <div className="detail-stage">
        <div className="detail-orbit">
          <span>{service.number}</span>
          <i />
          <i />
          <i />
        </div>
      </div>

      {sections.length > 0 && (
        <section className="detail-body page-pad">
          <aside>
            {labels.onThisPage && navItems.length > 0 && <span>{labels.onThisPage}</span>}
            {navItems.map((section) => (
              <a key={section.id} href={`#${section.id}`}>
                {section.nav}
              </a>
            ))}
          </aside>

          <div>
            {sections.map((section) => (
              <article id={section.id} key={section.id}>
                {section.eyebrow && <span className="eyebrow">{section.eyebrow}</span>}
                {section.heading && <h2>{section.heading}</h2>}
                {section.body}
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
