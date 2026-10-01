import Link from "next/link"

export default function NotFoundPage({ locale }: { locale: "en" | "ar" }) {
  return (
    <main className="page-hero page-pad">
      <span className="eyebrow">404 / NOT FOUND</span>
      <h1>{locale === "ar" ? "هذه الصفحة غير موجودة." : "This page isn’t here."}</h1>
      <p>
        {locale === "ar" ? "ربما تغير العنوان. " : "The address may have changed. "}
        <Link href={locale === "ar" ? "/ar" : "/"}>
          {locale === "ar" ? "العودة إلى Inheritix" : "Return to Inheritix"}
        </Link>
        .
      </p>
    </main>
  )
}
