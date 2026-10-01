import Link from "next/link"
import React from "react"
import { Action } from "../ui/Action"
import { Mark } from "../ui/Icons"

interface FooterProps {
  lang: "en" | "ar"
  navItems: Array<{ label: string; href: string }>
  footerHeading?: string
  footerInvitation?: string
  footerCtaLabel?: string
  copyright?: string
  location?: string
  siteName?: string
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

export function Footer({
  lang,
  navItems,
  footerHeading = lang === "ar" ? "لديك مشروع في ذهنك؟" : "Have a project in mind?",
  footerInvitation = lang === "ar" ? "لنصنع شيئًا يستحق الاستخدام." : "Let’s make something worth using.",
  footerCtaLabel = lang === "ar" ? "حدثنا عما تريد بناءه" : "Tell us what you’re building",
  copyright = "INHERITIX Technologies",
  location = "Amman, Jordan",
  siteName = "INHERITIX",
}: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="footer-lead reveal">
        <p className="eyebrow">{footerHeading}</p>
        <h2>{footerInvitation}</h2>
        <Action to={localizedPath("/contact", lang)} light>
          {footerCtaLabel}
        </Action>
      </div>

      <div className="footer-bottom">
        <Link
          href={lang === "ar" ? "/ar" : "/"}
          className="brand brand-light"
        >
          <Mark />
          <strong>{siteName}</strong>
        </Link>

        <div className="footer-nav">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={localizedPath(item.href, lang)}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="legal">
          <span>{location}</span>
          <span>© {currentYear} {copyright}</span>
        </div>
      </div>
    </footer>
  )
}
