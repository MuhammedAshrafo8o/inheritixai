import { ProjectsRoute, projectsMetadata } from "@/site/routes"

type Props = { searchParams: Promise<{ sector?: string; page?: string }> }

export const generateMetadata = () => projectsMetadata("en")

export default function Page({ searchParams }: Props) {
  return <ProjectsRoute locale="en" searchParams={searchParams} />
}
