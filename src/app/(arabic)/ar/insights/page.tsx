import type { Metadata } from "next"
import { getListingPages, getPublishedPosts } from "@/cms/queries"
import { InsightsPageView } from "@/components/pages/InsightsPageView"

export const metadata: Metadata = {
  title: "الرؤى — إينهيريتكس",
  description:
    "ملاحظات عملية حول تفكير المنتجات والتصميم والهندسة والأتمتة والعمليات الرقمية.",
  alternates: {
    canonical: "/ar/insights",
    languages: {
      en: "/insights",
      ar: "/ar/insights",
      "x-default": "/insights",
    },
  },
}

export default async function ArabicInsightsPage() {
  const [listingPages, posts] = await Promise.all([
    getListingPages("ar"),
    getPublishedPosts("ar", 20),
  ])

  return (
    <InsightsPageView
      lang="ar"
      posts={posts as Array<Record<string, unknown>>}
      listingHeader={listingPages?.insights as { kicker?: string; title?: string; intro?: string } | undefined}
    />
  )
}
