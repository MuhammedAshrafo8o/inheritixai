import { ServiceRoute, serviceMetadata } from "@/site/routes"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  return serviceMetadata("ar", (await params).slug)
}

export default async function Page({ params }: Props) {
  return <ServiceRoute locale="ar" slug={(await params).slug} />
}
