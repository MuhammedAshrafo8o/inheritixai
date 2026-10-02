import React from "react"
import { PageHero } from "../ui/PageHero"
import type { Locale } from "@/content/types"
import type { PageAbout } from "@/payload-types"
import { mediaOf } from "@/site/metadata"

interface AboutPageViewProps {
  lang: Locale
  about: PageAbout
}

/** Everything comes from the About global; empty fields and sections are hidden. */
export function AboutPageView({ about }: AboutPageViewProps) {
  const uploadedImage = mediaOf(about.image)
  const imageUrl = uploadedImage?.url || about.imageUrl
  const imageAlt = uploadedImage?.alt || about.imageAlt || ""
  const paragraphs = [about.manifestoParagraphOne, about.manifestoParagraphTwo].filter(Boolean)
  const principles = about.principles ?? []
  const hasManifesto = Boolean(about.manifestoEyebrow || about.manifestoTitle || paragraphs.length)

  return (
    <main>
      <PageHero kicker={about.kicker} title={about.title} intro={about.intro} />

      {imageUrl && (
        <section className="about-image">
          <img src={imageUrl} alt={imageAlt} />
        </section>
      )}

      {hasManifesto && (
        <section className="manifesto page-pad">
          {about.manifestoEyebrow && <span className="eyebrow">{about.manifestoEyebrow}</span>}
          {about.manifestoTitle && <h2>{about.manifestoTitle}</h2>}
          {paragraphs.length > 0 && (
            <div>
              {paragraphs.map((text, i) => (
                <p key={i}>{text}</p>
              ))}
            </div>
          )}
        </section>
      )}

      {principles.length > 0 && (
        <section className="principles page-pad">
          {principles.map((principle, i) => (
            <div className="reveal" key={principle.id ?? i}>
              <span>{principle.number}</span>
              <h3>{principle.title}</h3>
              <p>{principle.description}</p>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
