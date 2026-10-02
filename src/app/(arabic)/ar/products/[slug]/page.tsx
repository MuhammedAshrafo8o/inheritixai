import { ProductRoute, productMetadata } from "@/site/routes"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  return productMetadata("ar", (await params).slug)
}

export default async function Page({ params }: Props) {
  return <ProductRoute locale="ar" slug={(await params).slug} />
}
