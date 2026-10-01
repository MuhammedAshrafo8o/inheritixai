import type { Metadata } from "next"
import { getListingPages, getPublishedServices } from "@/cms/queries"
import { ServicesPageView } from "@/components/pages/ServicesPageView"

export const metadata: Metadata = {
  title: "الخدمات — إينهيريتكس",
  description:
    "برمجيات مخصصة ومنصات SaaS وأنظمة ERP وتطبيقات جوال وأتمتة بالذكاء الاصطناعي وتطوير WordPress.",
  alternates: {
    canonical: "/ar/services",
    languages: {
      en: "/services",
      ar: "/ar/services",
      "x-default": "/services",
    },
  },
}

export default async function ArabicServicesPage() {
  const [listingPages, services] = await Promise.all([
    getListingPages("ar"),
    getPublishedServices("ar"),
  ])

  return (
    <ServicesPageView
      lang="ar"
      services={services as Array<Record<string, unknown>>}
      listingHeader={listingPages?.services as { kicker?: string; title?: string; intro?: string } | undefined}
    />
  )
}
