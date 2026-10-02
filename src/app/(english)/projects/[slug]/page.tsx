import { ProjectRoute, projectMetadata } from "@/site/routes"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  return projectMetadata("en", (await params).slug)
}

export default async function Page({ params }: Props) {
  return <ProjectRoute locale="en" slug={(await params).slug} />
}
