import React from "react"

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
