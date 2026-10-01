import { siteMetadata } from "@/content/site-metadata"
import "../globals.css"

export const metadata = siteMetadata

export default function ArabicWebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <div className="website-layout">{children}</div>
      </body>
    </html>
  )
}
