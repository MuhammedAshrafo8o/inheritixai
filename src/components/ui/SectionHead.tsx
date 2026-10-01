import React from "react"

export function SectionHead({
  label,
  title,
}: {
  label: string
  title?: string
}) {
  return (
    <div className="section-head reveal">
      <span>{label}</span>
      {title && <h2>{title}</h2>}
    </div>
  )
}

export function PageHero({
  kicker,
  title,
  intro,
}: {
  kicker: string
  title: string
  intro: string
}) {
  return (
    <section className="page-hero page-pad">
      <span className="eyebrow">{kicker}</span>
      <h1>{title}</h1>
      <p>{intro}</p>
    </section>
  )
}
