import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProductBySlug } from "@/cms/queries"
import { ProductDetailPageView } from "@/components/pages/ProductDetailPageView"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const product = await getProductBySlug(slug, "ar")
  if (!product) {
    return { title: "المنتج غير موجود — إينهيريتكس" }
  }

  const name = (product.name as string) || slug
  const summary = (product.summary as string) || ""

  return {
    title: `${name} — إينهيريتكس`,
    description: summary,
    alternates: {
      canonical: `/ar/products/${slug}`,
      languages: {
        en: `/products/${slug}`,
        ar: `/ar/products/${slug}`,
        "x-default": `/products/${slug}`,
      },
    },
  }
}

export default async function ArabicProductDetailPage({ params }: Props) {
  const { slug } = await params
  const product = await getProductBySlug(slug, "ar")
  if (!product) notFound()

  return (
    <ProductDetailPageView
      lang="ar"
      product={product as Record<string, unknown>}
    />
  )
}
