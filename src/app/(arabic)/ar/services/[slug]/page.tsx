import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getServiceBySlug } from "@/cms/queries"
import { ServiceDetailPageView } from "@/components/pages/ServiceDetailPageView"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const service = await getServiceBySlug(slug, "ar")
  if (!service) {
    return { title: "الخدمة غير موجودة — إينهيريتكس" }
  }

  const title = (service.title as string) || slug
  const desc = (service.shortDescription as string) || ""

  return {
    title: `${title} — إينهيريتكس`,
    description: desc,
    alternates: {
      canonical: `/ar/services/${slug}`,
      languages: {
        en: `/services/${slug}`,
        ar: `/ar/services/${slug}`,
        "x-default": `/services/${slug}`,
      },
    },
  }
}

export default async function ArabicServiceDetailPage({ params }: Props) {
  const { slug } = await params
  const service = await getServiceBySlug(slug, "ar")
  if (!service) notFound()

  return (
    <ServiceDetailPageView
      lang="ar"
      service={service as Record<string, unknown>}
    />
  )
}
