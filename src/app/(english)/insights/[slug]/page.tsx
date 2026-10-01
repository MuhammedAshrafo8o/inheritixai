import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPostBySlug, getPublishedPosts } from "@/cms/queries"
import { ArticlePageView } from "@/components/pages/ArticlePageView"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug, "en")
  if (!post) {
    return { title: "Article Not Found — Inheritix" }
  }

  const title = (post.title as string) || slug
  const excerpt = (post.excerpt as string) || ""

  return {
    title: `${title} — Inheritix Insights`,
    description: excerpt,
    alternates: {
      canonical: `/insights/${slug}`,
      languages: {
        en: `/insights/${slug}`,
        ar: `/ar/insights/${slug}`,
        "x-default": `/insights/${slug}`,
      },
    },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug, "en")
  if (!post) notFound()

  const allPosts = await getPublishedPosts("en", 4)
  const morePosts = allPosts.filter((p) => (p as { slug: string }).slug !== slug).slice(0, 3)

  return (
    <ArticlePageView
      lang="en"
      post={post as Record<string, unknown>}
      morePosts={morePosts as Array<Record<string, unknown>>}
    />
  )
}
