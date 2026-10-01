import { draftMode } from "next/headers"
import { NextResponse } from "next/server"
import { isAuthenticatedPreviewRequest } from "@/cms/preview-auth"

function safeRedirectPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/"
  }
  return value
}

export async function POST(request: Request) {
  if (!isAuthenticatedPreviewRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { redirect?: unknown }
  const preview = await draftMode()
  preview.enable()

  return NextResponse.json({
    enabled: true,
    redirect: safeRedirectPath(body.redirect),
  })
}

export async function DELETE(request: Request) {
  if (!isAuthenticatedPreviewRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const preview = await draftMode()
  preview.disable()
  return NextResponse.json({ enabled: false })
}

export function GET() {
  return NextResponse.json(
    { error: "Draft preview requires authenticated POST." },
    { status: 405, headers: { Allow: "POST, DELETE" } },
  )
}
