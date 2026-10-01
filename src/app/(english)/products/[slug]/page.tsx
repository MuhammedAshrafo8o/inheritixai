import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductBySlug } from "@/cms/queries"
import { ProductDetailPageView } from "@/components/pages/ProductDetailPageView"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug, "en")
  if (!product) {
    return { title: "Product Not Found — Inheritix" }
  }

  const name = (product.name as string) || slug
  const summary = (product.summary as string) || ""

  return {
    title: `${name} — Inheritix`,
    description: summary,
    alternates: {
      canonical: `/products/${slug}`,
      languages: {
        en: `/products/${slug}`,
        ar: `/ar/products/${slug}`,
        "x-default": `/products/${slug}`,
      },
    },
  }
}

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug, "en")
  if (!product) notFound()

  return (
    <ProductDetailPageView
      lang="en"
      product={product as Record<string, unknown>}
    />
  )
}
