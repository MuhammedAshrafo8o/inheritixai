import React, { ReactNode } from "react"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { BackToTop } from "../ui/BackToTop"
import { ScrollObserver } from "../ui/ScrollObserver"
import { getNavigation, getSiteSettings } from "@/cms/queries"
import type { Locale } from "@/content/types"

interface AppShellProps {
  children: ReactNode
  lang: Locale
}

export async function AppShell({ children, lang }: AppShellProps) {
  const [navigation, siteSettings] = await Promise.all([
    getNavigation(lang),
    getSiteSettings(lang),
  ])

  const navItems = (navigation?.items || []).map((item: Record<string, unknown>) => ({
    label:
      typeof item.label === "string"
        ? item.label
        : (item.label as Record<string, string>)?.[lang] || "",
    href: (item.href as string) || "/",
  }))

  const resolveLocalized = (val: unknown): string | undefined => {
    if (!val) return undefined
    if (typeof val === "string") return val
    if (typeof val === "object") {
      const rec = val as Record<string, string>
      return rec[lang] || rec.en || rec.ar || undefined
    }
    return String(val)
  }

  const headerCta = {
    label:
      resolveLocalized(navigation?.headerCta?.label) ||
      (lang === "ar" ? "ابدأ مشروعك" : "Start a Project"),
    href: navigation?.headerCta?.href || "/contact",
  }

  return (
    <div className="app-shell">
      <ScrollObserver />
      <a className="skip-link" href="#main-content">
        {lang === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}
      </a>

      <Header
        lang={lang}
        navItems={navItems}
        headerCta={headerCta}
        siteName={siteSettings?.siteName || "INHERITIX"}
      />

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>

      <Footer
        lang={lang}
        navItems={navItems}
        footerHeading={resolveLocalized(siteSettings?.footerHeading)}
        footerInvitation={resolveLocalized(siteSettings?.footerInvitation)}
        footerCtaLabel={resolveLocalized(siteSettings?.footerCtaLabel)}
        copyright={siteSettings?.copyright || undefined}
        location={siteSettings?.location || undefined}
        siteName={siteSettings?.siteName || undefined}
      />

      <BackToTop lang={lang} />
    </div>
  )
}
