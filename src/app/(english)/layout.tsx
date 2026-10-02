import React from "react"
import { AppShell, layoutMetadata } from "@/components/layout/AppShell"
import "../globals.css"

export const generateMetadata = () => layoutMetadata("en")

export default function EnglishWebsiteLayout({ children }: { children: React.ReactNode }) {
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
