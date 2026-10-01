import type { Metadata } from "next"
import { getListingPages, getPublishedProducts } from "@/cms/queries"
import { ProductsPageView } from "@/components/pages/ProductsPageView"

export const metadata: Metadata = {
  title: "Products — Inheritix",
  description:
    "Explore digital products designed and engineered by Inheritix: LOGISTTEX and Fen El Menu.",
  alternates: {
    canonical: "/products",
    languages: {
      en: "/products",
      ar: "/ar/products",
      "x-default": "/products",
    },
  },
}

export default async function ProductsPage() {
  const [listingPages, products] = await Promise.all([
    getListingPages("en"),
    getPublishedProducts("en"),
  ])

  return (
    <ProductsPageView
      lang="en"
      products={products as Array<Record<string, unknown>>}
      listingHeader={listingPages?.products as { kicker?: string; title?: string; intro?: string } | undefined}
    />
  )
}
