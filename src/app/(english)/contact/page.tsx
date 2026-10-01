import type { Metadata } from "next"
import { getContactPage } from "@/cms/queries"
import { ContactPageView } from "@/components/pages/ContactPageView"

export const metadata: Metadata = {
  title: "Contact — Inheritix",
  description:
    "Tell Inheritix about your product, platform, or operational software challenge.",
  alternates: {
    canonical: "/contact",
    languages: {
      en: "/contact",
      ar: "/ar/contact",
      "x-default": "/contact",
    },
  },
}

export default async function ContactPage() {
  const contactDoc = await getContactPage("en")

  return <ContactPageView lang="en" contactDoc={contactDoc} />
}
