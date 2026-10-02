import { ProjectsRoute, projectsMetadata } from "@/site/routes"

type Props = { searchParams: Promise<{ sector?: string; page?: string }> }

export const generateMetadata = () => projectsMetadata("ar")

export default function Page({ searchParams }: Props) {
  return <ProjectsRoute locale="ar" searchParams={searchParams} />
}
