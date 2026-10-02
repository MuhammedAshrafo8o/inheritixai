import React, { ReactNode } from "react"
import type { Metadata } from "next"
import { Header } from "./Header"
import { Footer } from "./Footer"
import { BackToTop } from "../ui/BackToTop"
import { ScrollObserver } from "../ui/ScrollObserver"
import { getNavigation, getSiteLabels, getSiteSettings } from "@/cms/queries"
import type { Locale } from "@/content/types"
import { getSiteUrl } from "@/env"
import { mediaOf } from "@/site/metadata"
import type { SiteSetting } from "@/payload-types"

const HEX = /^#[0-9A-Fa-f]{6}$/

/** CMS brand colors → the existing design tokens. Values are re-validated before reaching CSS. */
export function brandTokenCss(colors: SiteSetting["brandColors"]) {
  const tokens: Array<[string, string | null | undefined]> = [
    ["--blue", colors?.primary],
    ["--cyan", colors?.accent],
    ["--navy", colors?.dark],
  ]
  const declarations = tokens
    .filter(([, value]) => typeof value === "string" && HEX.test(value))
    .map(([name, value]) => `${name}:${value}`)
  return declarations.length ? `:root{${declarations.join(";")}}` : ""
}

export async function layoutMetadata(locale: Locale): Promise<Metadata> {
  const settings = await getSiteSettings(locale)
  const favicon = mediaOf(settings.branding?.favicon)
  const siteName = settings.siteName
  return {
    metadataBase: new URL(getSiteUrl()),
    applicationName: siteName,
    title: {
      default: settings.defaultSeo?.title || siteName,
      template: `%s — ${siteName}`,
    },
    description: settings.defaultSeo?.description || undefined,
    icons: favicon?.url
      ? { icon: [{ url: favicon.url, type: favicon.mimeType || undefined }], apple: [{ url: favicon.url }] }
      : { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
  }
}

interface AppShellProps {
  children: ReactNode
  lang: Locale
}

export async function AppShell({ children, lang }: AppShellProps) {
  const [navigation, settings, labels] = await Promise.all([
    getNavigation(lang),
    getSiteSettings(lang),
    getSiteLabels(lang),
  ])

  const navItems = (navigation.items ?? []).map((item) => ({ label: item.label, href: item.href }))
  const headerCta = {
    label: navigation.headerCta?.label || "",
    href: navigation.headerCta?.href || "/contact",
  }
  const siteName = settings.siteName
  const logo = mediaOf(settings.branding?.logo)
  const logoLight = mediaOf(settings.branding?.logoLight) ?? logo
  const tokenCss = brandTokenCss(settings.brandColors)

  return (
    <div className="app-shell">
      {tokenCss && <style data-brand-tokens>{tokenCss}</style>}
      <ScrollObserver />
      {labels.skipToContent && (
        <a className="skip-link" href="#main-content">
          {labels.skipToContent}
        </a>
      )}

      <Header
        lang={lang}
        navItems={navItems}
        headerCta={headerCta}
        siteName={siteName}
        logo={logo?.url ? { url: logo.url, alt: logo.alt || siteName } : undefined}
        labels={{
          changeLanguage: labels.changeLanguage,
          languageToggle: labels.languageToggle,
          mainNavigation: labels.mainNavigation,
          openMenu: labels.openMenu,
          closeMenu: labels.closeMenu,
        }}
      />

      <div id="main-content" tabIndex={-1}>
        {children}
      </div>

      <Footer
        lang={lang}
        navItems={navItems}
        footerHeading={settings.footerHeading || undefined}
        footerInvitation={settings.footerInvitation || undefined}
        footerCtaLabel={settings.footerCtaLabel || undefined}
        copyright={settings.copyright || undefined}
        location={settings.location || undefined}
        siteName={siteName}
        logo={logoLight?.url ? { url: logoLight.url, alt: logoLight.alt || siteName } : undefined}
        socialLinks={(settings.socialLinks ?? []).map((link) => ({ platform: link.platform, url: link.url }))}
      />

      <BackToTop label={labels.backToTop || ""} />
    </div>
  )
}
