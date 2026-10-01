import { revalidatePath, revalidateTag } from "next/cache"
import { NextResponse } from "next/server"
import { projectInvalidationTargets, type ProjectMutation } from "@/cms/cache-policy"
import { isAuthenticatedPreviewRequest } from "@/cms/preview-auth"

function isMutation(value: unknown): value is ProjectMutation {
  if (!value || typeof value !== "object") return false
  const mutation = value as Record<string, unknown>
  if (typeof mutation.slug !== "string") return false
  if (mutation.event === "slug-change") {
    return typeof mutation.previousSlug === "string"
  }
  return ["publish", "unpublish", "delete"].includes(String(mutation.event))
}

export async function POST(request: Request) {
  if (!isAuthenticatedPreviewRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const mutation = await request.json().catch(() => null)
  if (!isMutation(mutation)) {
    return NextResponse.json({ error: "Invalid mutation payload" }, { status: 400 })
  }

  const targets = projectInvalidationTargets(mutation)
  for (const path of targets.paths) revalidatePath(path)
  for (const tag of targets.tags) revalidateTag(tag)

  return NextResponse.json({ revalidated: true, ...targets })
}
