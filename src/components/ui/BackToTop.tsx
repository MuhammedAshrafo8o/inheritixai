"use client"

import React, { useEffect, useState } from "react"
import { Arrow } from "./Icons"

export function BackToTop({ lang }: { lang: "en" | "ar" }) {
  const [showTop, setShowTop] = useState(false)

  useEffect(() => {
    const update = () => setShowTop(window.scrollY > 700)
    update()
    window.addEventListener("scroll", update, { passive: true })
    return () => window.removeEventListener("scroll", update)
  }, [])

  return (
    <button
      type="button"
      className={`back-to-top ${showTop ? "visible" : ""}`}
      aria-label={lang === "en" ? "Back to top" : "العودة إلى الأعلى"}
      onClick={() => {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" })
      }}
    >
      <Arrow reverse />
    </button>
  )
}
