import type { Metadata } from "next"
import { getHomePage, getPublishedPosts, getPublishedServices } from "@/cms/queries"
import { HomePageView } from "@/components/pages/HomePageView"

export const metadata: Metadata = {
  title: "Beautifully designed. Seriously engineered. — Inheritix",
  description:
    "We build software that makes complex businesses easier to run and digital products people enjoy using.",
  alternates: {
    canonical: "/",
    languages: {
      en: "/",
      ar: "/ar",
      "x-default": "/",
    },
  },
}

export default async function HomePage() {
  const [homeDoc, services, posts] = await Promise.all([
    getHomePage("en"),
    getPublishedServices("en"),
    getPublishedPosts("en", 3),
  ])

  return (
    <HomePageView
      lang="en"
      homeDoc={homeDoc}
      services={services as Array<Record<string, unknown>>}
      posts={posts as Array<Record<string, unknown>>}
    />
  )
}
