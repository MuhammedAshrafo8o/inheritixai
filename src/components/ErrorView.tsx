"use client"

import React, { useEffect, useState } from "react"

export type ErrorCopy = { eyebrow?: string | null; title?: string | null; body?: string | null; retry?: string | null }

/**
 * Last-resort copy, used only when the CMS itself cannot be reached (the usual
 * cause of a 500). Whenever the CMS answers, the editable Site Labels →
 * Error pages copy is shown instead.
 */
const UNREACHABLE_COPY: Record<"en" | "ar", ErrorCopy> = {
  en: { eyebrow: "500", title: "This page couldn’t be loaded.", body: "Please try again shortly.", retry: "Try again" },
  ar: { eyebrow: "500", title: "تعذر تحميل هذه الصفحة.", body: "حاول مرة أخرى بعد قليل.", retry: "إعادة المحاولة" },
}

/** Loads the editable error copy from the public Site Labels API. */
export function useErrorCopy(locale: "en" | "ar") {
  const [copy, setCopy] = useState<ErrorCopy | null>(null)
  useEffect(() => {
    let active = true
    fetch(`/api/globals/site-labels?locale=${locale}&depth=0`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(String(res.status)))))
      .then((labels: Record<string, string | null>) => {
        if (active) {
          setCopy({ eyebrow: labels.errorEyebrow, title: labels.errorTitle, body: labels.errorBody, retry: labels.errorRetry })
        }
      })
      .catch(() => active && setCopy(UNREACHABLE_COPY[locale]))
    return () => {
      active = false
    }
  }, [locale])
  return copy
}

/**
 * Shown when content could not be loaded (database or query failure).
 * Never a placeholder page: the response is an error and the cause is logged
 * server-side; `digest` correlates this view with the server log entry.
 */
export function ErrorView({
  locale,
  error,
  reset,
}: {
  locale: "en" | "ar"
  error: Error & { digest?: string }
  reset: () => void
}) {
  const copy = useErrorCopy(locale)

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="page-hero page-pad" role="alert" aria-busy={!copy}>
      {copy?.eyebrow && <span className="eyebrow">{copy.eyebrow}</span>}
      {copy?.title && <h1>{copy.title}</h1>}
      {(copy?.body || error.digest) && (
        <p>
          {copy?.body}
          {error.digest ? ` (ref ${error.digest})` : ""}
        </p>
      )}
      {copy?.retry && (
        <p>
          <button type="button" className="action" onClick={reset} style={{ background: "none", border: 0, cursor: "pointer" }}>
            <span>{copy.retry}</span>
          </button>
        </p>
      )}
    </main>
  )
}
