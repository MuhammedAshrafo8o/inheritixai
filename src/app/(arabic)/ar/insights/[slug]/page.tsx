import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getPostBySlug, getPublishedPosts } from "@/cms/queries"
import { ArticlePageView } from "@/components/pages/ArticlePageView"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPostBySlug(slug, "ar")
  if (!post) {
    return { title: "المقال غير موجود — إينهيريتكس" }
  }

  const title = (post.title as string) || slug
  const excerpt = (post.excerpt as string) || ""

  return {
    title: `${title} — رؤى إينهيريتكس`,
    description: excerpt,
    alternates: {
      canonical: `/ar/insights/${slug}`,
      languages: {
        en: `/insights/${slug}`,
        ar: `/ar/insights/${slug}`,
        "x-default": `/insights/${slug}`,
      },
    },
  }
}

export default async function ArabicArticlePage({ params }: Props) {
  const { slug } = await params
  const post = await getPostBySlug(slug, "ar")
  if (!post) notFound()

  const allPosts = await getPublishedPosts("ar", 4)
  const morePosts = allPosts.filter((p) => (p as { slug: string }).slug !== slug).slice(0, 3)

  return (
    <ArticlePageView
      lang="ar"
      post={post as Record<string, unknown>}
      morePosts={morePosts as Array<Record<string, unknown>>}
    />
  )
}
