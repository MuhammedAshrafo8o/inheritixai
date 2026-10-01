import React from "react"
import { siteMetadata } from "@/content/site-metadata"
import { AppShell } from "@/components/layout/AppShell"
import "../globals.css"

export const metadata = siteMetadata

export default function EnglishWebsiteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <div className="website-layout">
          <AppShell lang="en">{children}</AppShell>
        </div>
      </body>
    </html>
  )
}
