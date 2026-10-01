import type { Metadata } from "next"
import { getAboutPage } from "@/cms/queries"
import { AboutPageView } from "@/components/pages/AboutPageView"

export const metadata: Metadata = {
  title: "About — Inheritix",
  description:
    "Product-studio confidence. Engineering-company discipline. Meet INHERITIX Technologies.",
  alternates: {
    canonical: "/about",
    languages: {
      en: "/about",
      ar: "/ar/about",
      "x-default": "/about",
    },
  },
}

export default async function AboutPage() {
  const aboutDoc = await getAboutPage("en")

  return <AboutPageView lang="en" aboutDoc={aboutDoc} />
}
