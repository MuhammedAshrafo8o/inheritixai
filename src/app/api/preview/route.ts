import { draftMode } from "next/headers"
import { NextResponse } from "next/server"
import { isCmsEditor } from "@/cms/access"
import { getPayloadClient } from "@/cms/queries"

const ROUTES = {
  projects: "/projects",
  products: "/products",
  services: "/services",
  posts: "/insights",
} as const

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const noStore = {
  "Cache-Control": "no-store, max-age=0, private, must-revalidate",
  "X-Robots-Tag": "noindex, nofollow",
}

/**
 * Enters Next draft mode for a signed-in admin/editor and redirects to the
 * requested record. Query parameters never authorize anything. Draft mode is
 * only a hint: every draft render re-verifies the Payload session
 * (see getViewer), so logging out ends draft visibility immediately.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const collection = url.searchParams.get("collection") as keyof typeof ROUTES | null
  const slug = url.searchParams.get("slug") ?? ""
  const lang = url.searchParams.get("lang") === "ar" ? "ar" : "en"

  if (!collection || !(collection in ROUTES) || !SLUG.test(slug)) {
    return NextResponse.json({ error: "Invalid preview target." }, { status: 400, headers: noStore })
  }

  let authorized = false
  try {
    const payload = await getPayloadClient()
    const { user } = await payload.auth({ headers: request.headers })
    authorized = isCmsEditor(user)
  } catch (error) {
    console.error("[preview] session check failed", error)
    return NextResponse.json({ error: "Preview is temporarily unavailable." }, { status: 503, headers: noStore })
  }

  if (!authorized) {
    const draft = await draftMode()
    draft.disable()
    return NextResponse.json(
      { error: "Unauthorized: an active admin or editor session is required for preview." },
      { status: 401, headers: noStore },
    )
  }

  const draft = await draftMode()
  draft.enable()
  const destination = `${lang === "ar" ? "/ar" : ""}${ROUTES[collection]}/${slug}`
  const response = NextResponse.redirect(new URL(destination, request.url))
  for (const [key, value] of Object.entries(noStore)) response.headers.set(key, value)
  return response
}

/** Leaves draft mode (anyone may leave; entering requires a session). */
export async function DELETE() {
  const draft = await draftMode()
  draft.disable()
  return NextResponse.json({ enabled: false }, { headers: noStore })
}
