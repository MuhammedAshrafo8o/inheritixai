import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import App from "@/App"
import { isSupportedPublicPath, metadataForPath, routeFromSegments } from "@/content/routing"

type PageProps = { params: Promise<{ slug?: string[] }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  return metadataForPath(routeFromSegments(slug), "ar")
}

export default async function ArabicWebsitePage({ params }: PageProps) {
  const { slug } = await params
  if (!isSupportedPublicPath(routeFromSegments(slug))) notFound()
  return (
    <Suspense fallback={null}>
      <App lang="ar" />
    </Suspense>
  )
}
