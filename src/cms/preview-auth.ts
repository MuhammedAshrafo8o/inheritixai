import { timingSafeEqual } from "node:crypto"

function equalSecrets(candidate: string, expected: string) {
  const candidateBuffer = Buffer.from(candidate)
  const expectedBuffer = Buffer.from(expected)
  return (
    candidateBuffer.length === expectedBuffer.length &&
    timingSafeEqual(candidateBuffer, expectedBuffer)
  )
}

export function isAuthenticatedPreviewRequest(request: Request) {
  const expected = process.env.PREVIEW_SECRET
  const authorization = request.headers.get("authorization")

  if (!expected || !authorization?.startsWith("Bearer ")) return false
  return equalSecrets(authorization.slice("Bearer ".length), expected)
}
