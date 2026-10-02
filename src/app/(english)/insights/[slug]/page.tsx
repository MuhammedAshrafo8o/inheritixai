import { PostRoute, postMetadata } from "@/site/routes"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  return postMetadata("en", (await params).slug)
}

export default async function Page({ params }: Props) {
  return <PostRoute locale="en" slug={(await params).slug} />
}
