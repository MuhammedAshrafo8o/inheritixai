import { draftMode } from "next/headers"
import { NextResponse } from "next/server"
import { getPayload } from "payload"
import config from "@/payload.config"
import { isAuthenticatedPreviewRequest } from "@/cms/preview-auth"

function safeRedirectPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/"
  }
  return value
}

/**
 * Validates whether the incoming request is authorized to enter preview mode.
 * Either:
 * 1. Bearer token matches PREVIEW_SECRET (for server-to-server preview requests)
 * 2. An active authenticated Payload admin or editor session cookie is present
 */
async function isAuthorizedForPreview(request: Request): Promise<boolean> {
  // Method 1: Bearer token secret
  if (isAuthenticatedPreviewRequest(request)) return true

  // Method 2: Payload session authentication via cookies
  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: request.headers })
    if (user && (user.roles?.includes("admin") || user.roles?.includes("editor"))) {
      return true
    }
  } catch {
    // If Payload is offline or auth fails
  }

  return false
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const collection = url.searchParams.get("collection") || "projects"
  const slug = url.searchParams.get("slug")
  const lang = url.searchParams.get("lang") === "ar" ? "ar" : "en"

  // Strict: query parameter alone NEVER authorizes preview access
  const authorized = await isAuthorizedForPreview(request)
  if (!authorized) {
    return new NextResponse(
      JSON.stringify({
        error: "Unauthorized: Active admin or editor session required for preview.",
      }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, private",
          "X-Robots-Tag": "noindex, nofollow",
        },
      },
    )
  }

  // Enable Next.js draft mode
  const draft = await draftMode()
  draft.enable()

  let destination = "/"
  const prefix = lang === "ar" ? "/ar" : ""
  if (collection === "projects" && slug) {
    destination = `${prefix}/projects/${slug}`
  } else if (collection === "products" && slug) {
    destination = `${prefix}/products/${slug}`
  } else if (collection === "services" && slug) {
    destination = `${prefix}/services/${slug}`
  } else if (collection === "posts" && slug) {
    destination = `${prefix}/insights/${slug}`
  }

  const response = NextResponse.redirect(new URL(destination, request.url))
  // Keep preview responses private, uncached by shared caches, and excluded from indexing
  response.headers.set("Cache-Control", "no-store, max-age=0, private, must-revalidate")
  response.headers.set("X-Robots-Tag", "noindex, nofollow")
  return response
}

export async function POST(request: Request) {
  const authorized = await isAuthorizedForPreview(request)
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { redirect?: unknown }
  const preview = await draftMode()
  preview.enable()

  const response = NextResponse.json({
    enabled: true,
    redirect: safeRedirectPath(body.redirect),
  })
  response.headers.set("Cache-Control", "no-store, private")
  response.headers.set("X-Robots-Tag", "noindex, nofollow")
  return response
}

export async function DELETE(request: Request) {
  const authorized = await isAuthorizedForPreview(request)
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const preview = await draftMode()
  preview.disable()
  return NextResponse.json({ enabled: false })
}
