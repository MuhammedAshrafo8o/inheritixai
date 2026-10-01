import type { Metadata } from "next"
import { getHomePage, getPublishedPosts, getPublishedServices } from "@/cms/queries"
import { HomePageView } from "@/components/pages/HomePageView"

export const metadata: Metadata = {
  title: "تصميم متقن. هندسة جادة. — إينهيريتكس",
  description:
    "نبني برمجيات تجعل الأعمال المعقدة أسهل في الإدارة، ومنتجات رقمية يستمتع الناس باستخدامها.",
  alternates: {
    canonical: "/ar",
    languages: {
      en: "/",
      ar: "/ar",
      "x-default": "/",
    },
  },
}

export default async function ArabicHomePage() {
  const [homeDoc, services, posts] = await Promise.all([
    getHomePage("ar"),
    getPublishedServices("ar"),
    getPublishedPosts("ar", 3),
  ])

  return (
    <HomePageView
      lang="ar"
      homeDoc={homeDoc}
      services={services as Array<Record<string, unknown>>}
      posts={posts as Array<Record<string, unknown>>}
    />
  )
}
