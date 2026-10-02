import { draftMode } from "next/headers"
import { NextResponse } from "next/server"

/** GET /api/preview/exit?redirect=/projects/foo — leave draft mode and return to the page. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const target = url.searchParams.get("redirect") ?? "/"
  const safe = target.startsWith("/") && !target.startsWith("//") ? target : "/"
  const draft = await draftMode()
  draft.disable()
  const response = NextResponse.redirect(new URL(safe, request.url))
  response.headers.set("Cache-Control", "no-store, private")
  return response
}
