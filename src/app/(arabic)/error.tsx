"use client"

import { ErrorView } from "@/components/ErrorView"

export default function ArabicError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView locale="ar" {...props} />
}
