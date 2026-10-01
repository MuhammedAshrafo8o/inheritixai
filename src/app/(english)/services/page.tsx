import type { Metadata } from "next"
import { getListingPages, getPublishedServices } from "@/cms/queries"
import { ServicesPageView } from "@/components/pages/ServicesPageView"

export const metadata: Metadata = {
  title: "Services — Inheritix",
  description:
    "Custom software, SaaS, ERP, mobile applications, AI automation, and WordPress engineering.",
  alternates: {
    canonical: "/services",
    languages: {
      en: "/services",
      ar: "/ar/services",
      "x-default": "/services",
    },
  },
}

export default async function ServicesPage() {
  const [listingPages, services] = await Promise.all([
    getListingPages("en"),
    getPublishedServices("en"),
  ])

  return (
    <ServicesPageView
      lang="en"
      services={services as Array<Record<string, unknown>>}
      listingHeader={listingPages?.services as { kicker?: string; title?: string; intro?: string } | undefined}
    />
  )
}
