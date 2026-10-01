import React from "react"
import { PageHero } from "../ui/PageHero"
import { ContactForm } from "../contact/ContactForm"
import type { Locale } from "@/content/types"

interface ContactPageViewProps {
  lang: Locale
  contactDoc?: any
}

export function ContactPageView({ lang, contactDoc }: ContactPageViewProps) {
  const isAr = lang === "ar"

  const kicker = (contactDoc?.kicker as string) || (isAr ? "ابدأ محادثة" : "START A CONVERSATION")
  const title =
    (contactDoc?.title as string) ||
    (isAr ? "ما الذي يمكننا بناؤه معًا؟" : "What can we build together?")
  const intro =
    (contactDoc?.intro as string) ||
    (isAr
      ? "اختر نوع المحادثة المناسب. وسنتأكد من وصولها إلى الأشخاص المعنيين."
      : "Choose the conversation that fits. We’ll make sure it reaches the right people.")

  const directEmail = (contactDoc?.directEmail as string) || "hello@inheritix.com"
  const directNote =
    (contactDoc?.directNote as string) ||
    (isAr
      ? "للشراكات وفرص العمل والاستفسارات العامة، استخدم الاستفسار العام."
      : "For partnerships, careers, and everything else, use general inquiry.")
  const boundaryNotice = contactDoc?.boundaryNotice as string | undefined

  return (
    <main className="contact-page">
      <PageHero kicker={kicker} title={title} intro={intro} />

      <ContactForm
        lang={lang}
        directEmail={directEmail}
        directNote={directNote}
        boundaryNotice={boundaryNotice}
      />
    </main>
  )
}
