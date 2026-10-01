import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getServiceBySlug } from "@/cms/queries"
import { ServiceDetailPageView } from "@/components/pages/ServiceDetailPageView"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceBySlug(slug, "en")
  if (!service) {
    return { title: "Service Not Found — Inheritix" }
  }

  const title = (service.title as string) || slug
  const desc = (service.shortDescription as string) || ""

  return {
    title: `${title} — Inheritix`,
    description: desc,
    alternates: {
      canonical: `/services/${slug}`,
      languages: {
        en: `/services/${slug}`,
        ar: `/ar/services/${slug}`,
        "x-default": `/services/${slug}`,
      },
    },
  }
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params
  const service = await getServiceBySlug(slug, "en")
  if (!service) notFound()

  return (
    <ServiceDetailPageView
      lang="en"
      service={service as Record<string, unknown>}
    />
  )
}
