import { siteMetadata } from "@/content/site-metadata"
import "../globals.css"

export const metadata = siteMetadata

export default function PayloadRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body>{children}</body>
    </html>
  )
}
