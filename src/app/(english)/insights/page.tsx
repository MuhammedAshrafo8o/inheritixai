import type { Metadata } from "next"
import { getListingPages, getPublishedPosts } from "@/cms/queries"
import { InsightsPageView } from "@/components/pages/InsightsPageView"

export const metadata: Metadata = {
  title: "Insights — Inheritix",
  description:
    "Practical perspectives on product design, software engineering, automation, and operational systems.",
  alternates: {
    canonical: "/insights",
    languages: {
      en: "/insights",
      ar: "/ar/insights",
      "x-default": "/insights",
    },
  },
}

export default async function InsightsPage() {
  const [listingPages, posts] = await Promise.all([
    getListingPages("en"),
    getPublishedPosts("en", 20),
  ])

  return (
    <InsightsPageView
      lang="en"
      posts={posts as Array<Record<string, unknown>>}
      listingHeader={listingPages?.insights as { kicker?: string; title?: string; intro?: string } | undefined}
    />
  )
}
