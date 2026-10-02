import React from "react"

/** Section label + title; renders nothing when both are empty. */
export function SectionHead({ label, title }: { label?: string | null; title?: string | null }) {
  if (!label && !title) return null
  return (
    <div className="section-head reveal">
      {label && <span>{label}</span>}
      {title && <h2>{title}</h2>}
    </div>
  )
}
