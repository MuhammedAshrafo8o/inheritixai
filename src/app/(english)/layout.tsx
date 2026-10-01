import { siteMetadata } from "@/content/site-metadata"
import "../globals.css"

export const metadata = siteMetadata

export default function EnglishWebsiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <div className="website-layout">{children}</div>
      </body>
    </html>
  )
}
