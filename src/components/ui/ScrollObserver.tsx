"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

export function ScrollObserver() {
  const pathname = usePathname()

  useEffect(() => {
    // Scroll progress bar
    const updateProgress = () => {
      const available = document.documentElement.scrollHeight - window.innerHeight
      const amount = available > 0 ? window.scrollY / available : 0
      document.documentElement.style.setProperty("--scroll-progress", `${amount}`)
    }
    updateProgress()
    window.addEventListener("scroll", updateProgress, { passive: true })

    // Staggered reveal animations with reduced motion support
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      document.querySelectorAll(".reveal").forEach((el) => {
        el.classList.add("visible")
      })
      return () => window.removeEventListener("scroll", updateProgress)
    }

    if (!("IntersectionObserver" in window)) {
      document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible"))
      return () => window.removeEventListener("scroll", updateProgress)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible")
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )

    const observeReveals = () => {
      document.querySelectorAll(".reveal:not([data-reveal-ready])").forEach((item) => {
        item.setAttribute("data-reveal-ready", "true")
        observer.observe(item)
      })
    }

    observeReveals()
    document.documentElement.classList.add("motion-ready")

    const mutations = new MutationObserver(observeReveals)
    mutations.observe(document.body, { childList: true, subtree: true })

    return () => {
      window.removeEventListener("scroll", updateProgress)
      mutations.disconnect()
      observer.disconnect()
    }
  }, [pathname])

  return null
}
