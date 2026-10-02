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
  logo?: { url: string; alt: string }
  socialLinks?: Array<{ platform: string; url: string }>
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
  footerHeading,
  footerInvitation,
  footerCtaLabel,
  copyright,
  location,
  siteName,
  logo,
  socialLinks = [],
}: FooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="footer">
      {(footerHeading || footerInvitation || footerCtaLabel) && (
        <div className="footer-lead reveal">
          {footerHeading && <p className="eyebrow">{footerHeading}</p>}
          {footerInvitation && <h2>{footerInvitation}</h2>}
          {footerCtaLabel && (
            <Action to={localizedPath("/contact", lang)} light>
              {footerCtaLabel}
            </Action>
          )}
        </div>
      )}

      <div className="footer-bottom">
        <Link
          href={lang === "ar" ? "/ar" : "/"}
          className="brand brand-light"
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

        <div className="footer-nav">
          {navItems.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={localizedPath(item.href, lang)}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="legal">
          {socialLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer">
              {link.platform}
            </a>
          ))}
          {location && <span>{location}</span>}
          {copyright && (
            <span>
              © {currentYear} {copyright}
            </span>
          )}
        </div>
      </div>
    </footer>
  )
}
