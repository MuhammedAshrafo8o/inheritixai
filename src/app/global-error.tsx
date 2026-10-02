"use client"

import { useErrorCopy } from "@/components/ErrorView"

/** Last-resort boundary (e.g. the site layout could not load navigation/settings). */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  const locale = typeof window !== "undefined" && window.location.pathname.startsWith("/ar") ? "ar" : "en"
  const copy = useErrorCopy(locale)
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", color: "#0f243d" }}>
        {copy?.eyebrow && <p style={{ letterSpacing: ".15em", fontSize: ".7rem" }}>{copy.eyebrow}</p>}
        {copy?.title && <h1>{copy.title}</h1>}
        {(copy?.body || error.digest) && (
          <p>
            {copy?.body}
            {error.digest ? ` (ref ${error.digest})` : ""}
          </p>
        )}
      </body>
    </html>
  )
}
