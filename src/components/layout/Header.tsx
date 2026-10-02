"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import React, { useEffect, useState } from "react"
import { Arrow, Mark } from "../ui/Icons"

interface HeaderProps {
  lang: "en" | "ar"
  navItems: Array<{ label: string; href: string }>
  headerCta: { label: string; href: string }
  siteName?: string
  logo?: { url: string; alt: string }
  labels: {
    changeLanguage?: string | null
    languageToggle?: string | null
    mainNavigation?: string | null
    openMenu?: string | null
    closeMenu?: string | null
  }
}

function stripLocale(path: string) {
  if (path === "/ar") return "/"
  return path.startsWith("/ar/") ? path.slice(3) || "/" : path
}

function localizedPath(path: string, lang: "en" | "ar") {
  const [pathname, query = ""] = path.split("?")
  const normalized = stripLocale(pathname || "/")
  const localized = lang === "ar" ? `/ar${normalized === "/" ? "" : normalized}` : normalized
  return query ? `${localized}?${query}` : localized
}

export function Header({
  lang,
  navItems,
  headerCta,
  siteName = "INHERITIX",
  logo,
  labels,
}: HeaderProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const cleanPath = stripLocale(pathname)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    document.body.classList.toggle("menu-is-open", open)
    window.addEventListener("keydown", closeOnEscape)
    return () => {
      document.body.classList.remove("menu-is-open")
      window.removeEventListener("keydown", closeOnEscape)
    }
  }, [open])

  // Language switch handler
  const toggleLanguage = () => {
    const nextLang = lang === "en" ? "ar" : "en"
    const query = typeof window !== "undefined" ? window.location.search.replace(/^\?/, "") : ""
    const target = localizedPath(`${cleanPath}${query ? `?${query}` : ""}`, nextLang)
    router.push(target)
    setOpen(false)
  }

  return (
    <header className={`site-header ${open ? "menu-open" : ""}`}>
      <div className="scroll-progress" aria-hidden="true" />
      <Link
        href={lang === "ar" ? "/ar" : "/"}
        className="brand"
        onClick={() => setOpen(false)}
      >
        {logo ? (
          <img className="brand-logo" src={logo.url} alt={logo.alt} />
        ) : (
          <>
            <Mark />
            <strong>{siteName}</strong>
          </>
        )}
      </Link>

      {open && (
        <button
          type="button"
          className="menu-backdrop"
          aria-label={labels.closeMenu || undefined}
          onClick={() => setOpen(false)}
        />
      )}

      <nav className={open ? "nav open" : "nav"} aria-label={labels.mainNavigation || undefined}>
        {navItems.map((item) => {
          const itemPath = stripLocale(item.href)
          const isActive = cleanPath === itemPath || (itemPath !== "/" && cleanPath.startsWith(`${itemPath}/`))
          return (
            <Link
              key={`${item.href}-${item.label}`}
              href={localizedPath(item.href, lang)}
              onClick={() => setOpen(false)}
              aria-current={isActive ? "page" : undefined}
              className={isActive ? "active" : ""}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="header-actions">
        {labels.languageToggle && (
          <button
            type="button"
            className="lang"
            aria-label={labels.changeLanguage || undefined}
            onClick={toggleLanguage}
          >
            {labels.languageToggle}
          </button>
        )}

        {headerCta.label && (
          <Link
            href={localizedPath(headerCta.href, lang)}
            className="header-cta"
            onClick={() => setOpen(false)}
          >
            {headerCta.label}
            <Arrow />
          </Link>
        )}

        <button
          type="button"
          className="menu"
          aria-label={(open ? labels.closeMenu : labels.openMenu) || undefined}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  )
}
