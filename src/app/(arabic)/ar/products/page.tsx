import type { Metadata } from "next"
import { getListingPages, getPublishedProducts } from "@/cms/queries"
import { ProductsPageView } from "@/components/pages/ProductsPageView"

export const metadata: Metadata = {
  title: "المنتجات — إينهيريتكس",
  description:
    "استكشف المنتجات الرقمية المصممة والمهندسة بواسطة إينهيريتكس: LOGISTTEX و Fen El Menu.",
  alternates: {
    canonical: "/ar/products",
    languages: {
      en: "/products",
      ar: "/ar/products",
      "x-default": "/products",
    },
  },
}

export default async function ArabicProductsPage() {
  const [listingPages, products] = await Promise.all([
    getListingPages("ar"),
    getPublishedProducts("ar"),
  ])

  return (
    <ProductsPageView
      lang="ar"
      products={products as Array<Record<string, unknown>>}
      listingHeader={listingPages?.products as { kicker?: string; title?: string; intro?: string } | undefined}
    />
  )
}
