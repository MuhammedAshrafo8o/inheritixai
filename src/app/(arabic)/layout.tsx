import React from "react"
import { siteMetadata } from "@/content/site-metadata"
import { AppShell } from "@/components/layout/AppShell"
import "../globals.css"

export const metadata = siteMetadata

export default function ArabicWebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="website-layout">
          <AppShell lang="ar">{children}</AppShell>
        </div>
      </body>
    </html>
  )
}
