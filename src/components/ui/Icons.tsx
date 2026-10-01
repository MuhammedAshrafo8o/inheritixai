import React from "react"

export function Arrow({ reverse = false }: { reverse?: boolean }) {
  return (
    <svg
      className={reverse ? "arrow reverse" : "arrow"}
      viewBox="0 0 18 18"
      aria-hidden="true"
    >
      <path d="M3 9h11M10 4l5 5-5 5" />
    </svg>
  )
}

export function Mark() {
  return (
    <span className="mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  )
}
