import React from "react"
import { AppShell, layoutMetadata } from "@/components/layout/AppShell"
import "../globals.css"

export const generateMetadata = () => layoutMetadata("ar")

export default function ArabicWebsiteLayout({ children }: { children: React.ReactNode }) {
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
