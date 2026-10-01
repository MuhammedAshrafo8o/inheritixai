import type { Metadata } from "next"
import { getContactPage } from "@/cms/queries"
import { ContactPageView } from "@/components/pages/ContactPageView"

export const metadata: Metadata = {
  title: "تواصل معنا — إينهيريتكس",
  description:
    "حدّث إينهيريتكس عن منتجك أو منصتك أو تحدي البرمجيات والعمليات التشغيلية لديك.",
  alternates: {
    canonical: "/ar/contact",
    languages: {
      en: "/contact",
      ar: "/ar/contact",
      "x-default": "/contact",
    },
  },
}

export default async function ArabicContactPage() {
  const contactDoc = await getContactPage("ar")

  return <ContactPageView lang="ar" contactDoc={contactDoc} />
}
