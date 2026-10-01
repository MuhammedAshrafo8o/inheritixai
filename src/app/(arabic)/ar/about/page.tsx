import type { Metadata } from "next"
import { getAboutPage } from "@/cms/queries"
import { AboutPageView } from "@/components/pages/AboutPageView"

export const metadata: Metadata = {
  title: "عن الشركة — إينهيريتكس",
  description:
    "استوديو منتج. عقلية هندسية. تعرّف على منظور التصميم والهندسة وراء INHERITIX Technologies.",
  alternates: {
    canonical: "/ar/about",
    languages: {
      en: "/about",
      ar: "/ar/about",
      "x-default": "/about",
    },
  },
}

export default async function ArabicAboutPage() {
  const aboutDoc = await getAboutPage("ar")

  return <AboutPageView lang="ar" aboutDoc={aboutDoc} />
}
