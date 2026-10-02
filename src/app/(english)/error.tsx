"use client"

import { ErrorView } from "@/components/ErrorView"

export default function EnglishError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorView locale="en" {...props} />
}
