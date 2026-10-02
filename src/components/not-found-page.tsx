import Link from "next/link"
import { getSiteLabels } from "@/cms/queries"

/** 404 copy comes from Site Labels → Error pages; empty labels are hidden. */
export default async function NotFoundPage({ locale }: { locale: "en" | "ar" }) {
  const labels = await getSiteLabels(locale)
  return (
    <main className="page-hero page-pad">
      {labels.notFoundEyebrow && <span className="eyebrow">{labels.notFoundEyebrow}</span>}
      {labels.notFoundTitle && <h1>{labels.notFoundTitle}</h1>}
      {(labels.notFoundBody || labels.notFoundLink) && (
        <p>
          {labels.notFoundBody}
          {labels.notFoundBody && labels.notFoundLink ? " " : null}
          {labels.notFoundLink && <Link href={locale === "ar" ? "/ar" : "/"}>{labels.notFoundLink}</Link>}
        </p>
      )}
    </main>
  )
}
