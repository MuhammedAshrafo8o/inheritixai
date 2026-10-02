import { PostRoute, postMetadata } from "@/site/routes"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  return postMetadata("ar", (await params).slug)
}

export default async function Page({ params }: Props) {
  return <PostRoute locale="ar" slug={(await params).slug} />
}
