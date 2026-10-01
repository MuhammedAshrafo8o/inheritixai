import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getProjectBySlug, getPublishedProjects } from "@/cms/queries"
import { ProjectDetailPageView } from "@/components/pages/ProjectDetailPageView"

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const project = await getProjectBySlug(slug, "en")
  if (!project) {
    return { title: "Project Not Found — Inheritix" }
  }

  const title = (project.title as string) || slug
  const summary = (project.summary as string) || ""

  return {
    title: `${title} — Inheritix`,
    description: summary,
    alternates: {
      canonical: `/projects/${slug}`,
      languages: {
        en: `/projects/${slug}`,
        ar: `/ar/projects/${slug}`,
        "x-default": `/projects/${slug}`,
      },
    },
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const project = await getProjectBySlug(slug, "en")
  if (!project) notFound()

  // Related projects
  const allProjects = await getPublishedProjects("en", { limit: 4 })
  const relatedProjects = allProjects.docs.filter((p) => p.slug !== slug).slice(0, 2)

  return (
    <ProjectDetailPageView
      lang="en"
      project={project as Record<string, unknown>}
      relatedProjects={relatedProjects as Array<Record<string, unknown>>}
    />
  )
}
