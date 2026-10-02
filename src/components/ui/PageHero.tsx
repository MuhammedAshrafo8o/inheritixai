import React from "react"

/** Listing/page hero. Each element is omitted when its CMS value is empty. */
export function PageHero({
  kicker,
  title,
  intro,
}: {
  kicker?: string | null
  title?: string | null
  intro?: string | null
}) {
  if (!kicker && !title && !intro) return null
  return (
    <section className="page-hero page-pad">
      {kicker && <span className="eyebrow">{kicker}</span>}
      {title && <h1>{title}</h1>}
      {intro && <p>{intro}</p>}
    </section>
  )
}
