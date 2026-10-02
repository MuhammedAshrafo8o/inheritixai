import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { isAuthenticatedPreviewRequest } from "@/cms/preview-auth"

/**
 * Manual cache invalidation for external automation (Bearer PREVIEW_SECRET).
 * Normal editing does not need this: collection and global hooks revalidate
 * affected paths in-process on every publish, unpublish, edit and delete.
 */
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export async function POST(request: Request) {
  if (!isAuthenticatedPreviewRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { slug?: unknown; previousSlug?: unknown } | null
  const slugs = [body?.slug, body?.previousSlug].filter((s): s is string => typeof s === "string" && SLUG.test(s))
  if (body?.slug !== undefined && slugs.length === 0) {
    return NextResponse.json({ error: "Invalid slug" }, { status: 400 })
  }

  const paths = ["/", "/ar", "/projects", "/ar/projects", "/sitemap.xml"]
  for (const slug of slugs) paths.push(`/projects/${slug}`, `/ar/projects/${slug}`)
  for (const path of paths) revalidatePath(path)

  return NextResponse.json({ revalidated: true, paths })
}
